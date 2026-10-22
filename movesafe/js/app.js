/* MoveSafe AI — 폼 코치 화면 로직. 자세 추정(MediaPipe)은 카메라·파일 모드에서만 지연 로드한다. */
import { LM, frameMetrics, smoothMetrics } from './pose-metrics.js';
import { EXERCISES, THR, RepCounter, LandingDetector, evaluateRep, evaluateLanding, summarizeSession, FLAG_LABELS } from './exercise-rules.js';
import { DEMO_PROFILES } from './demo-motion.js';

const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const CONNECTIONS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [27, 31], [28, 30], [28, 32]];

const $ = (s) => document.querySelector(s);
const fmt = (v, d = 0) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d));

const state = {
  mode: null, exercise: 'squat', landmarker: null, stream: null, raf: null, running: false,
  prev: null, counter: null, evals: [], routines: null, demoFrames: null, demoIdx: 0, demoStart: 0, lastCue: 0, demoSpeed: 1, lastProcessed: null,
};
const video = $('#video'), canvas = $('#canvas'), ctx = canvas.getContext('2d');

function setStatus(msg, kind = '') { const el = $('#status'); el.textContent = msg; el.className = `state ${kind}`; el.hidden = !msg; }
function overlay(msg) { const el = $('#overlay'); el.innerHTML = msg || ''; el.hidden = !msg; }
function setMode(mode) {
  state.mode = mode; if (mode) state.lastMode = mode;
  const b = $('#modeBadge');
  b.textContent = { camera: '카메라 LIVE', file: '영상 파일', demo: 'DEMO 샘플', null: '대기' }[mode] || '대기';
  b.className = `badge ${mode === 'demo' ? 'demo' : mode ? 'live' : 'na'}`;
  $('#btnStop').disabled = !mode;
  $('#hud').hidden = !mode;
  const mirror = mode === 'camera' && $('#mirror').checked;
  video.classList.toggle('mirror', mirror); canvas.classList.toggle('mirror', mirror);
}

function resetDetectors() {
  state.prev = null;
  state.counter = state.exercise === 'landing' ? new LandingDetector() : new RepCounter(EXERCISES[state.exercise]);
}
function resetSession() { state.evals = []; resetDetectors(); renderSession(); $('#report').hidden = true; }

// ------------------------------------------------------------- 초기화
async function init() {
  for (const [k, p] of Object.entries(DEMO_PROFILES)) { const o = document.createElement('option'); o.value = k; o.textContent = p.label; $('#demoSel').append(o); }
  $('#exercise').addEventListener('change', () => { state.exercise = $('#exercise').value; resetSession(); });
  $('#btnCam').addEventListener('click', startCamera);
  $('#btnFile').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', (e) => { if (e.target.files[0]) startFile(e.target.files[0]); });
  $('#btnDemo').addEventListener('click', () => { const k = $('#demoSel').value || 'squat_good'; $('#demoSel').value = k; startDemo(k); });
  $('#demoSel').addEventListener('change', () => { if ($('#demoSel').value) startDemo($('#demoSel').value); });
  $('#btnStop').addEventListener('click', stop);
  $('#btnReset').addEventListener('click', resetSession);
  $('#btnReport').addEventListener('click', () => { renderReport(); $('#report').hidden = false; $('#report').scrollIntoView({ behavior: 'smooth' }); });
  $('#btnPrint').addEventListener('click', () => window.print());
  $('#mirror').addEventListener('change', () => setMode(state.mode));
  const hash = new URLSearchParams(location.hash.slice(1));
  state.demoSpeed = Math.min(8, Math.max(0.25, Number(hash.get('speed')) || 1)); // 테스트·시연용 재생 배속
  if (hash.get('exercise') && EXERCISES[hash.get('exercise')]) { state.exercise = hash.get('exercise'); $('#exercise').value = state.exercise; }
  resetSession();
  try { state.routines = await fetch('data/routines.json').then((r) => r.json()); } catch { state.routines = null; }
  if (hash.get('demo') && DEMO_PROFILES[hash.get('demo')]) { $('#demoSel').value = hash.get('demo'); startDemo(hash.get('demo')); }
}

// ------------------------------------------------------------- MediaPipe
async function ensureLandmarker() {
  if (state.landmarker) return state.landmarker;
  setStatus('자세 인식 모델 불러오는 중… (처음 한 번, 약 10 MB)');
  const vision = await import(`${CDN}/vision_bundle.mjs`);
  const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
  const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
  try { state.landmarker = await vision.PoseLandmarker.createFromOptions(fileset, opts('GPU')); }
  catch { state.landmarker = await vision.PoseLandmarker.createFromOptions(fileset, opts('CPU')); }
  setStatus('');
  return state.landmarker;
}

// ------------------------------------------------------------- 모드 시작
async function startCamera() {
  stop();
  if (!navigator.mediaDevices?.getUserMedia) { setStatus('이 브라우저는 카메라를 지원하지 않습니다. 영상 파일 분석이나 샘플 재생을 이용하세요.', 'error'); return; }
  try {
    overlay('카메라 준비 중…');
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = state.stream;
    await video.play();
    await ensureLandmarker();
    setMode('camera'); overlay(''); resetDetectors(); state.running = true; loopVideo();
  } catch (e) {
    stop();
    const why = e.name === 'NotAllowedError' ? '카메라 권한이 거부됐습니다. 주소창의 카메라 아이콘에서 허용한 뒤 다시 시도하세요.' : e.name === 'NotFoundError' ? '카메라를 찾지 못했습니다.' : `시작 실패: ${e.message}`;
    setStatus(`${why} 카메라 없이 보려면 "샘플 재생"을 누르세요.`, 'error');
    overlay('카메라를 켜거나 샘플 동작을 재생하세요.');
  }
}

async function startFile(file) {
  stop();
  try {
    overlay('영상 불러오는 중…');
    video.srcObject = null; video.src = URL.createObjectURL(file); video.loop = false;
    await video.play();
    await ensureLandmarker();
    setMode('file'); overlay(''); resetDetectors(); state.running = true; loopVideo();
    video.onended = () => { stop(); setStatus('영상 분석이 끝났습니다. "세션 리포트 보기"를 누르세요.'); };
  } catch (e) { stop(); setStatus(`영상 분석 실패: ${e.message}`, 'error'); }
}

function startDemo(key) {
  stop();
  const p = DEMO_PROFILES[key]; if (!p) return;
  if (p.exercise !== state.exercise) { state.exercise = p.exercise; $('#exercise').value = p.exercise; }
  resetSession();
  state.demoFrames = p.make(); state.demoIdx = 0; state.demoStart = performance.now(); state.lastProcessed = null;
  canvas.width = 640; canvas.height = 480;
  video.srcObject = null; video.removeAttribute('src');
  setMode('demo'); overlay(''); state.running = true; setStatus('');
  loopDemo();
}

function stop() {
  state.running = false;
  if (state.raf) cancelAnimationFrame(state.raf); state.raf = null;
  if (state.stream) { state.stream.getTracks().forEach((t) => t.stop()); state.stream = null; }
  video.pause(); video.onended = null;
  setMode(null); $('#cue').hidden = true;
  if (!state.mode) overlay('카메라를 켜거나 샘플 동작을 재생하세요.');
}

// ------------------------------------------------------------- 루프
let lastTs = -1;
function loopVideo() {
  if (!state.running) return;
  if (video.readyState >= 2) {
    if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
    let ts = performance.now(); if (ts <= lastTs) ts = lastTs + 1; lastTs = ts;
    let res = null;
    try { res = state.landmarker.detectForVideo(video, ts); } catch (e) { setStatus(`인식 오류: ${e.message}`, 'error'); }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const lm = res?.landmarks?.[0], wl = res?.worldLandmarks?.[0];
    if (lm) { drawSkeleton(lm); processFrame(lm, wl, ts); overlay(''); }
    else { overlay('사람을 찾지 못했습니다. 정면에서 전신이 보이게 서 주세요.'); }
  }
  state.raf = requestAnimationFrame(loopVideo);
}

function loopDemo() {
  if (!state.running) return;
  const elapsed = (performance.now() - state.demoStart) * state.demoSpeed;
  while (state.demoIdx < state.demoFrames.length && state.demoFrames[state.demoIdx].t <= elapsed) state.demoIdx++;
  const fr = state.demoFrames[Math.max(0, state.demoIdx - 1)];
  ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'right'; ctx.fillText('DEMO 합성 골격 — 실제 사람 아님', canvas.width - 12, 24); ctx.textAlign = 'left';
  drawSkeleton(fr.lm2d);
  if (state.demoIdx > state.lastProcessed || state.lastProcessed == null) { processFrame(fr.lm2d, fr.lm3d, fr.t); state.lastProcessed = state.demoIdx; }
  if (state.demoIdx >= state.demoFrames.length) { state.lastProcessed = null; stop(); overlay('샘플 재생 끝 — 아래 리포트를 확인하거나 다른 샘플·카메라를 선택하세요.'); setStatus('샘플 재생이 끝났습니다. 오른쪽 결과와 "세션 리포트 보기"를 확인하세요.'); renderReport(); $('#report').hidden = false; return; }
  state.raf = requestAnimationFrame(loopDemo);
}

function processFrame(lm2d, lm3d, t) {
  const m = smoothMetrics(state.prev, frameMetrics(lm2d, lm3d), 0.6); state.prev = m;
  if (!m.ok) { showCue('관절이 가려졌습니다. 전신이 보이게 서 주세요.', 'warn'); return; }
  $('#hudKnee').textContent = fmt(m.kneeMin); $('#hudKasr').textContent = fmt(m.kasr, 2);
  const ev = state.counter.update(m, t);
  if (ev) {
    const e = state.exercise === 'landing' ? evaluateLanding(ev) : evaluateRep(ev, state.exercise);
    state.evals.push(e); renderSession(e);
    const top = e.flags.find((f) => f.severity === 'high') || e.flags[0];
    showCue(top ? `${top.label}: ${top.cue}` : `좋아요! ${e.score}점`, top ? top.severity : 'ok', 2500);
  } else if (performance.now() - state.lastCue > 2500) {
    // 동작 중 실시간 단서
    const live = m.kasr < THR.kasr || Math.max(m.medialL, m.medialR) >= THR.medial ? ['무릎을 발끝 방향으로 바깥으로', 'high'] : m.trunkLean > THR.lean ? ['몸통이 기울었어요. 양발에 고르게', 'warn'] : null;
    if (live && m.kneeMin < 165) showCue(live[0], live[1], 800);
  }
  $('#hudReps').textContent = state.evals.length;
}

function showCue(text, kind, hold = 1200) {
  const el = $('#cue'); el.textContent = text; el.className = `cue ${kind}`; el.hidden = false; state.lastCue = performance.now();
  clearTimeout(state.cueTimer); state.cueTimer = setTimeout(() => { if (performance.now() - state.lastCue >= hold - 10) el.hidden = true; }, hold);
}

function drawSkeleton(lm) {
  const W = canvas.width, H = canvas.height;
  const m = state.prev;
  const valgus = m?.ok && (m.kasr < THR.kasr || Math.max(m.medialL, m.medialR) >= THR.medial) && m.kneeMin < 165;
  ctx.lineWidth = Math.max(2, W / 240); ctx.strokeStyle = '#22d3ee';
  for (const [a, b] of CONNECTIONS) {
    if ((lm[a].visibility ?? 1) < 0.4 || (lm[b].visibility ?? 1) < 0.4) continue;
    const kneeSeg = [23, 25, 27, 24, 26, 28].includes(a) && [25, 27, 26, 28].includes(b);
    ctx.strokeStyle = kneeSeg && valgus ? '#f87171' : '#22d3ee';
    ctx.beginPath(); ctx.moveTo(lm[a].x * W, lm[a].y * H); ctx.lineTo(lm[b].x * W, lm[b].y * H); ctx.stroke();
  }
  for (const i of [11, 12, 23, 24, 25, 26, 27, 28]) {
    if ((lm[i].visibility ?? 1) < 0.4) continue;
    ctx.fillStyle = (i === 25 || i === 26) && valgus ? '#f87171' : '#fde047';
    ctx.beginPath(); ctx.arc(lm[i].x * W, lm[i].y * H, Math.max(4, W / 120), 0, Math.PI * 2); ctx.fill();
  }
}

// ------------------------------------------------------------- 결과 표시
function renderSession(last) {
  const s = summarizeSession(state.evals);
  const sc = $('#avgScore'); sc.textContent = s.avgScore ?? '—'; sc.className = `score ${s.avgScore == null ? '' : s.avgScore >= 85 ? 'good' : s.avgScore >= 65 ? 'mid' : 'bad'}`;
  $('#repCount').textContent = s.count;
  const e = last || state.evals[state.evals.length - 1];
  if (!e) { $('#lastRep').textContent = '아직 없음'; for (const id of ['mDepth', 'mKasr', 'mLean', 'mAsym']) $(`#${id}`).textContent = '—'; return; }
  $('#lastRep').innerHTML = `<b>${e.score}점</b> ${e.flags.length ? e.flags.map((f) => `<span class="flag ${f.severity}">${f.label}</span>`).join('') : '<span class="flag" style="background:#dcfce7;color:#166534">문제 없음</span>'}<div class="muted" style="margin-top:4px">${e.flags.map((f) => f.cue).join(' · ') || '이 자세를 유지하세요.'}</div>`;
  $('#mDepth').textContent = fmt(e.depth ?? e.minKnee); $('#mKasr').textContent = fmt(e.kasr, 2); $('#mLean').textContent = fmt(e.lean); $('#mAsym').textContent = fmt(e.asym);
}

function renderReport() {
  const s = summarizeSession(state.evals);
  $('#repBadge').textContent = `${EXERCISES[state.exercise].label} · ${state.mode === 'demo' || state.lastMode === 'demo' ? 'DEMO 샘플' : '실측'} · ${new Date().toLocaleString('ko-KR')}`;
  const body = $('#reportBody');
  if (!s.count) { body.innerHTML = '<p class="muted">기록된 반복이 없습니다. 카메라를 켜거나 샘플을 재생하세요.</p>'; $('#routines').innerHTML = routineHtml(['warmup']); return; }
  const isLanding = state.exercise === 'landing';
  body.innerHTML = `<div class="row" style="gap:16px;margin-bottom:8px"><div><div class="muted">평균 점수</div><div class="score ${s.avgScore >= 85 ? 'good' : s.avgScore >= 65 ? 'mid' : 'bad'}">${s.avgScore}</div></div><div><div class="muted">반복</div><div style="font-size:1.6rem;font-weight:700">${s.count}</div></div><div><div class="muted">반복된 문제</div><div>${s.topIssues.map((t) => `<span class="flag">${FLAG_LABELS[t.code] || t.code} ${t.count}/${s.count}</span>`).join('') || '<span class="flag">없음</span>'}</div></div></div>
  <table><thead><tr><th>#</th><th class="num">점수</th><th class="num">${isLanding ? '착지 최소 무릎각' : '무릎 최소각'}</th><th class="num">무릎/발목</th><th class="num">기울기</th><th class="num">좌우차</th><th>표시</th></tr></thead><tbody>
  ${state.evals.map((e, i) => `<tr><td>${i + 1}</td><td class="num">${e.score}</td><td class="num">${fmt(e.depth ?? e.minKnee)}°</td><td class="num">${fmt(e.kasr, 2)}</td><td class="num">${fmt(e.lean)}°</td><td class="num">${fmt(e.asym)}°</td><td>${e.flags.map((f) => `<span class="flag ${f.severity}">${f.label}</span>`).join('') || '—'}</td></tr>`).join('')}
  </tbody></table>`;
  $('#routines').innerHTML = routineHtml(s.routines);
}
function routineHtml(keys) {
  if (!state.routines) return '<p class="muted">루틴 데이터를 불러오지 못했습니다.</p>';
  return keys.map((k) => { const r = state.routines.routines[k]; if (!r) return ''; return `<div class="routine"><h4>${r.title}</h4><div class="why">${r.why}</div><ul>${r.items.map((it) => `<li><b>${it.name}</b> — ${it.dose}${it.cue ? ` <span class="muted">(${it.cue})</span>` : ''}</li>`).join('')}</ul></div>`; }).join('') + `<p class="muted">근거: ${state.routines.basis}</p>`;
}

init();
