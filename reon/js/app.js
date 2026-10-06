/* 다시ON AI — 라우터·상태·화면 조립 */
import { getState, setState, clearState } from './state.js';
import { analyzeCareer, buildProfile, rankJobs, gapFor } from './engine/careerAnalyzer.js';
import { PERSONA_MAP } from '../data/personas.js';
import * as home from './views/home.js';
import * as input from './views/input.js';
import * as analyzing from './views/analyzing.js';
import * as skills from './views/skills.js';
import * as jobs from './views/jobs.js';
import * as gap from './views/gap.js';
import * as training from './views/training.js';
import * as openings from './views/openings.js';
import * as report from './views/report.js';
import * as evidence from './views/evidence.js';

const STEPS = [
  { key: 'input', label: '경력 입력', href: '#/input' },
  { key: 'skills', label: '경력 번역', href: '#/skills' },
  { key: 'jobs', label: '직무 TOP3', href: '#/jobs' },
  { key: 'gap', label: '역량 Gap', href: (s) => `#/gap/${s.selectedJob}` },
  { key: 'training', label: '훈련', href: (s) => `#/training/${s.selectedJob}` },
  { key: 'openings', label: '채용', href: (s) => `#/openings/${s.selectedJob}` },
  { key: 'report', label: '리포트', href: '#/report' },
];

const ROUTES = [
  { re: /^#?\/?$/, key: 'home', view: home, needs: null },
  { re: /^#\/input$/, key: 'input', view: input, needs: null },
  { re: /^#\/analyzing$/, key: 'analyzing', view: analyzing, needs: null },
  { re: /^#\/skills$/, key: 'skills', view: skills, needs: 'analysis' },
  { re: /^#\/jobs$/, key: 'jobs', view: jobs, needs: 'skills' },
  { re: /^#\/gap\/([a-z0-9_]+)$/, key: 'gap', view: gap, needs: 'skills' },
  { re: /^#\/training\/([a-z0-9_]+)$/, key: 'training', view: training, needs: 'skills' },
  { re: /^#\/openings\/([a-z0-9_]+)$/, key: 'openings', view: openings, needs: 'skills' },
  { re: /^#\/report$/, key: 'report', view: report, needs: 'skills' },
  { re: /^#\/evidence$/, key: 'evidence', view: evidence, needs: 'skills' },
];

const app = document.getElementById('app');
const stepperEl = document.getElementById('stepper');
const judgeEl = document.getElementById('judge-bar');

function navigate(hash) { if (location.hash === hash) render(); else location.hash = hash; }

async function runAnalysis(inputData) {
  setState({ input: inputData, analysis: null, userSkills: null, selectedJob: null });
  navigate('#/analyzing');
  const started = Date.now();
  const analysis = await analyzeCareer(inputData);
  const wait = Math.max(0, 1100 - (Date.now() - started)); // 단계 안내가 읽히도록 최소 표시
  setTimeout(() => {
    setState({ analysis, userSkills: analysis.skills.map((s) => s.id) });
    navigate('#/skills');
  }, wait);
}

function loadPersona(id, { autoRun }) {
  const p = PERSONA_MAP[id];
  if (!p) return;
  const inputData = { text: p.text, region: p.region, workType: p.workType, hours: p.hours, wage: p.wage, quals: p.quals, training: p.training };
  if (autoRun) runAnalysis(inputData);
  else { setState({ input: inputData }); navigate('#/input'); render(); }
}

const ctx = {
  get state() { return getState(); },
  setState, navigate, runAnalysis, loadPersona,
  params: {},
  rerender: () => render(),
  rankedJobs: () => rankJobs(buildProfile(getState().input, getState().userSkills || [])),
  gapFor: (jobId) => gapFor(jobId, buildProfile(getState().input, getState().userSkills || [])),
  clearAll: () => { clearState(); navigate('#/'); render(); window.scrollTo(0, 0); },
};

function renderStepper(key) {
  const s = getState();
  const idx = STEPS.findIndex((x) => x.key === key);
  if (idx < 0) { stepperEl.hidden = true; return; }
  stepperEl.hidden = false;
  const ok = (i) => (i === 0) || (i === 1 && s.analysis) || (i >= 2 && s.userSkills && (i < 3 || s.selectedJob));
  stepperEl.innerHTML = `<ol aria-label="진행 단계">${STEPS.map((st, i) => {
    const href = typeof st.href === 'function' ? st.href(s) : st.href;
    const cls = i < idx ? 'done' : i === idx ? 'current' : '';
    const inner = `<span class="n">${i + 1}</span><span>${st.label}</span>`;
    return `<li class="${cls}" ${i === idx ? 'aria-current="step"' : ''}>${ok(i) ? `<a href="${href}">${inner}</a>` : inner}</li>`;
  }).join('')}</ol>`;
}

function renderJudge(key) {
  const s = getState();
  if (!s.judge) { judgeEl.hidden = true; return; }
  judgeEl.hidden = false;
  const idx = STEPS.findIndex((x) => x.key === key);
  const next = idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1] : null;
  let nextHref = next ? (typeof next.href === 'function' ? next.href({ ...s, selectedJob: s.selectedJob || (s.userSkills ? ctx.rankedJobs()[0].job.id : null) }) : next.href) : null;
  if (next && next.key === 'skills' && !s.analysis) nextHref = null;
  judgeEl.innerHTML = `<div class="inner"><b>심사위원 데모 모드</b><span>Persona B(48세 경력복귀) 기준 · 회원가입 없음</span><span class="spacer"></span>${idx >= 0 ? `<span>단계 ${idx + 1}/${STEPS.length}</span>` : ''}${nextHref ? `<a class="btn btn-primary btn-sm" href="${nextHref}" data-testid="judge-next">다음 단계 →</a>` : (idx < 0 ? '<button class="btn btn-primary btn-sm" data-testid="judge-start-bar" id="judge-start-bar">90초 데모 시작</button>' : '<a class="btn btn-outline btn-sm" href="#/" style="color:#fff;border-color:#fff;background:transparent">처음으로</a>')}</div>`;
  judgeEl.querySelector('#judge-start-bar')?.addEventListener('click', () => loadPersona('B', { autoRun: true }));
  if (nextHref && next.key === 'gap' && !s.selectedJob) {
    judgeEl.querySelector('[data-testid="judge-next"]').addEventListener('click', () => setState({ selectedJob: ctx.rankedJobs()[0].job.id }));
  }
}

function render() {
  const hash = location.hash || '#/';
  const s = getState();
  let route = ROUTES.find((r) => r.re.test(hash));
  if (!route) { location.hash = '#/'; return; }
  const m = hash.match(route.re);
  ctx.params = { jobId: m && m[1] };
  if (route.needs === 'analysis' && !s.analysis) { location.hash = '#/input'; return; }
  if (route.needs === 'skills' && !s.userSkills) { location.hash = s.analysis ? '#/skills' : '#/input'; return; }
  const v = route.view.view(ctx);
  document.title = v.title;
  app.innerHTML = v.html;
  renderStepper(route.key);
  renderJudge(route.key);
  document.querySelectorAll('.site-nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === (route.key === 'home' ? '#/' : '#/input') && route.key !== 'home' ? false : a.getAttribute('href') === hash));
  Promise.resolve(v.mount(app)).catch((e) => { console.error(e); app.insertAdjacentHTML('afterbegin', `<div class="notice notice-danger" role="alert">화면을 그리는 중 문제가 생겼습니다: ${String(e.message || e)}. 새로고침하거나 처음으로 돌아가 주세요.</div>`); });
  window.scrollTo(0, 0);
}

// 심사위원 모드: ?demo=judge
const qs = new URLSearchParams(location.search);
if (qs.get('demo') === 'judge') setState({ judge: true });

// 글자 크기
const fsBtn = document.getElementById('fs-toggle');
const applyFs = (v) => { if (v) document.documentElement.setAttribute('data-fs', v); else document.documentElement.removeAttribute('data-fs'); fsBtn.textContent = v === 'xl' ? '가 (기본으로)' : v === 'lg' ? '가++' : '가+'; };
try { applyFs(localStorage.getItem('reon.fs') || ''); } catch { applyFs(''); }
fsBtn.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-fs') || '';
  const nxt = cur === '' ? 'lg' : cur === 'lg' ? 'xl' : '';
  applyFs(nxt); try { localStorage.setItem('reon.fs', nxt); } catch { /* ignore */ }
});
document.getElementById('clear-btn').addEventListener('click', () => { if (confirm('이 브라우저에 저장된 입력과 분석 결과를 모두 지울까요?')) ctx.clearAll(); });

window.addEventListener('hashchange', render);
render();
