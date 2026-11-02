import { HEAT, NIGHT, DUST, COND, ACT, emptyProfile, judge, TIER, actions } from './engine.js';
import { PERSONAS } from './personas.js';

const $ = s => document.querySelector(s); const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STORE = 'daegu-heat-profile-v1', ENV_STORE = 'daegu-heat-env-v1';
let POP = null, HI = null, ST = null;
async function load() {
  if (POP) return;
  const [a, b, c] = await Promise.all([fetch('data/dong_pop.json'), fetch('data/heat_illness_summary.json'), fetch('data/airkorea_stations.json')]);
  POP = await a.json(); HI = await b.json(); ST = await c.json();
}
const getP = () => { try { return JSON.parse(localStorage.getItem(STORE)) || emptyProfile(); } catch { return emptyProfile(); } };
const setP = p => { try { localStorage.setItem(STORE, JSON.stringify(p)); } catch {} };
const DEFAULT_ENV = { heat: 'advisory', feels: 33.5, night: 'none', dust: 'moderate', pm25: 25, ozone: 'moderate', hours: 'day', date: '시나리오' };
const getEnv = () => { try { return JSON.parse(localStorage.getItem(ENV_STORE)) || DEFAULT_ENV; } catch { return DEFAULT_ENV; } };
const setEnv = e => { try { localStorage.setItem(ENV_STORE, JSON.stringify(e)); } catch {} };
const SGGS = ['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군'];

function route() {
  const [path, qs] = (location.hash || '#/').slice(1).split('?'); const q = new URLSearchParams(qs || ''); window.scrollTo(0, 0);
  if (path === '/profile') return viewProfile(q);
  if (path === '/result') return viewResult(q);
  if (path === '/alert') return viewAlert();
  if (path === '/data') return viewData();
  return viewHome();
}
window.addEventListener('hashchange', route);

async function viewHome() {
  await load();
  const ICON = { worker: '🛠️', senior: '🏠', mom: '👶' };
  app.innerHTML = `
  <section class="hero">
    <span class="eyebrow">☀ 2026 대구광역시 기후·환경·탄소중립 공공데이터 AI 활용대회 · 부문 1 데모</span>
    <h1>폭염 문자는 모두에게 똑같이 옵니다.<br>위험은 사람마다 다릅니다.</h1>
    <p class="lead">기상청 특보, 에어코리아 미세먼지, 행정동 인구, 무더위쉼터 데이터를 묶어 <b>내 나이·질환·하는 일·사는 동</b>에 맞는 위험 단계와 오늘 할 일을 쉬운말로 먼저 알려 드립니다. 판정은 공개된 규칙이, 설명은 AI가 맡습니다.</p>
    <div class="row"><a class="btn" href="#/profile">내 조건으로 해 보기</a><a class="btn ghost" href="#/data">데이터와 근거 보기</a></div>
  </section>
  <ol class="steps">
    <li><b data-n="1">읽기</b>기상청 특보(2026년 3단계 개편)·에어코리아 20개 측정소·열대야를 매시간 확인</li>
    <li><b data-n="2">겹치기</b>행정동 152곳의 65세 이상 비율, 온열질환 발생 장소·시간 통계와 개인 조건을 겹쳐 위험 점수</li>
    <li><b data-n="3">알리기</b>단계가 오르면 먼저 알림. 가장 가까운 열린 쉼터, 오늘 할 일 3가지를 쉬운말로</li>
    <li><b data-n="4">확인하기</b>혼자 사는 분은 보호자에게 안부 확인 요청. 냉방 분산으로 전력 피크도 줄임</li>
  </ol>
  <h2>사례로 바로 보기</h2>
  <div class="grid">${Object.values(PERSONAS).map(p => `<button class="persona p-${p.id}" data-p="${p.id}"><div class="ico">${ICON[p.id]}</div><span class="tag">${esc(p.tag)}</span><h3>${esc(p.name)}</h3><p>${esc(p.story)}</p><span class="go">이 사례로 결과 보기 →</span></button>`).join('')}</div>
  <h2>왜 대구인가</h2>
  <div class="summary-bar">
    <div class="stat s-brand"><b>${HI.daegu_2025.n}명</b>2025년 대구 온열질환자 (2024년 ${HI.daegu_by_year['2024']}명의 2.1배)</div>
    <div class="stat s-warn"><b>${Math.round(HI.daegu_2025.outdoor / HI.daegu_2025.n * 100)}%</b>실외 발생 · 실외 작업장 ${HI.daegu_2025.by_place['실외 작업장']}건</div>
    <div class="stat s-draft"><b>${HI.daegu_2025.age65plus_pct}%</b>65세 이상 (2011~2025 누적 36%)</div>
    <div class="stat s-ok"><b>${Math.round(POP.dongs.reduce((s, d) => s + d.o65, 0) / POP.dongs.reduce((s, d) => s + d.pop, 0) * 100)}%</b>대구 65세 이상 인구 비율 (152개 행정동, 2026.9)</div>
  </div>
  <p class="small muted">출처: 질병관리청 온열질환 감시 데이터(공공데이터포털 15149889), 행정안전부 행정동 연령별 인구(15097972). 자세한 표는 "데이터와 근거".</p>`;
  app.querySelectorAll('.persona').forEach(b => b.addEventListener('click', () => { const p = PERSONAS[b.dataset.p]; setP(p.profile); setEnv(p.env); location.hash = `#/result?persona=${p.id}`; }));
}

const chk = (name, map, sel, type = 'checkbox') => Object.entries(map).map(([k, v]) => `<label class="chk"><input type="${type}" name="${name}" value="${k}" ${(type === 'radio' ? sel === k : sel.includes(k)) ? 'checked' : ''}> ${esc(v)}</label>`).join('');
async function viewProfile(q) {
  await load();
  const p = getP(), e = getEnv();
  const dongs = sgg => POP.dongs.filter(d => d.sgg === sgg).map(d => `<option ${p.dong === d.dong ? 'selected' : ''}>${esc(d.dong)}</option>`).join('');
  app.innerHTML = `
  <h1>내 조건 입력</h1>
  <p class="lead">이름·주소·병명은 받지 않습니다. 사는 동과 다섯 가지만 고르면 됩니다.</p>
  <form id="f">
    <fieldset><legend>1. 나와 사는 곳</legend>
      <div class="row"><label>만 나이 <input type="number" name="age" min="0" max="110" value="${p.age ?? ''}" placeholder="예: 54"></label>
      <label>구·군 <select name="sgg" id="sgg"><option value="">선택</option>${SGGS.map(s => `<option ${p.sgg === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label>행정동 <select name="dong" id="dong"><option value="">선택</option>${p.sgg ? dongs(p.sgg) : ''}</select></label></div>
      <p class="hint">행정동을 고르면 그 동의 65세 이상 비율과 가까운 측정소·쉼터가 함께 나옵니다.</p></fieldset>
    <fieldset><legend>2. 건강·생활 조건</legend><p class="hint">해당하는 것을 모두 고르세요.</p>${chk('cond', COND, p.cond)}</fieldset>
    <fieldset><legend>3. 오늘 주로 하는 일</legend>${chk('act', ACT, p.act, 'radio')}</fieldset>
    <fieldset><legend>4. 오늘의 날씨 상황 <span class="badge b-mute">시나리오 입력 · API 승인 후 자동</span></legend>
      <p class="hint">실제 서비스는 기상청·에어코리아 API에서 자동으로 읽습니다. 데모에서는 직접 골라 볼 수 있습니다.</p>
      <div class="row"><label>폭염특보 <select name="heat">${Object.entries(HEAT).map(([k, v]) => `<option value="${k}" ${e.heat === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>체감온도 <input type="number" name="feels" step="0.5" value="${e.feels ?? ''}" style="min-width:90px">℃</label>
      <label>열대야주의보 <select name="night"><option value="none" ${e.night === 'none' ? 'selected' : ''}>없음</option><option value="advisory" ${e.night === 'advisory' ? 'selected' : ''}>발효</option></select></label></div>
      <div class="row" style="margin-top:8px"><label>초미세먼지 <select name="dust">${Object.entries(DUST).map(([k, v]) => `<option value="${k}" ${e.dust === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>PM2.5 <input type="number" name="pm25" value="${e.pm25 ?? ''}" style="min-width:90px">㎍/㎥</label>
      <label>시간대 <select name="hours"><option value="day" ${e.hours === 'day' ? 'selected' : ''}>아침·저녁</option><option value="peak" ${e.hours === 'peak' ? 'selected' : ''}>낮 12~17시</option><option value="night" ${e.hours === 'night' ? 'selected' : ''}>밤</option></select></label></div></fieldset>
    <div class="row"><button class="btn" type="submit">내 위험 단계 보기</button><button class="btn ghost" type="button" id="reset">지우기</button></div>
  </form>`;
  $('#sgg').addEventListener('change', ev => { $('#dong').innerHTML = '<option value="">선택</option>' + dongs(ev.target.value); });
  $('#f').addEventListener('submit', ev => {
    ev.preventDefault(); const fd = new FormData(ev.target);
    setP({ age: fd.get('age') ? Number(fd.get('age')) : null, sgg: fd.get('sgg') || '', dong: fd.get('dong') || '', cond: fd.getAll('cond'), act: fd.get('act') || 'indoor', hours: fd.get('hours') });
    setEnv({ heat: fd.get('heat'), feels: fd.get('feels') ? Number(fd.get('feels')) : null, night: fd.get('night'), dust: fd.get('dust'), pm25: fd.get('pm25') ? Number(fd.get('pm25')) : null, ozone: 'moderate', hours: fd.get('hours'), date: '직접 입력' });
    location.hash = '#/result';
  });
  $('#reset').addEventListener('click', () => { localStorage.removeItem(STORE); localStorage.removeItem(ENV_STORE); viewProfile(new URLSearchParams()); });
}

function bars(obj, max) {
  return `<div class="chart">${Object.entries(obj).map(([k, v]) => `<div class="r"><span>${esc(k)}</span><div class="bar"><i style="width:${Math.round(v / max * 100)}%"></i></div><b>${v}</b></div>`).join('')}</div>`;
}
async function viewResult(q) {
  await load();
  const pid = q.get('persona'); const per = pid ? PERSONAS[pid] : null;
  const p = per ? per.profile : getP(), env = per ? per.env : getEnv();
  env.hours = env.hours || p.hours;
  const r = judge(env, p); const [tname, tmsg] = TIER[r.tier]; const acts = actions(env, p, r);
  const dong = POP.dongs.find(d => d.sgg === p.sgg && d.dong === p.dong);
  const stations = ST.stations.filter(s => s.sgg === p.sgg);
  const sggCases = HI.daegu_2025.by_sgg[p.sgg] || 0;
  app.innerHTML = `
  ${q.get('judge') ? `<div class="judge"><b>심사 모드</b> — 사례 "${esc(per.name)}"의 조건과 당시 날씨 시나리오를 자동 입력했습니다. 위험 단계는 아래 "점수 근거"의 규칙으로 계산했고, 행동 카드는 기상청 행동수칙과 온열질환 통계를 바탕으로 규칙이 고른 문장입니다.</div>` : ''}
  ${per ? `<div class="card"><span class="badge b-brand">${esc(per.tag)}</span> <b>${esc(per.name)}</b><p class="muted" style="margin:6px 0 0">${esc(per.story)}</p></div>` : ''}
  <section class="tier t-${r.tier}"><span class="badge" style="background:rgba(255,255,255,.2);color:#fff">${esc(env.date || '')} · ${esc(p.sgg)} ${esc(p.dong)}</span><h2>지금 나의 단계: ${tname}</h2><p>${tmsg}</p></section>
  <div class="env">
    <div class="stat"><b>${HEAT[env.heat]}</b>폭염특보${env.feels ? ` · 체감 ${env.feels}℃` : ''}</div>
    <div class="stat"><b>${env.night === 'advisory' ? '발효' : '없음'}</b>열대야주의보</div>
    <div class="stat"><b>${DUST[env.dust]}</b>초미세먼지${env.pm25 != null ? ` · ${env.pm25}㎍/㎥` : ''}</div>
    <div class="stat"><b>${dong ? dong.o65_pct + '%' : '-'}</b>${esc(p.dong || '행정동')} 65세 이상 비율${dong ? ` (${dong.o65.toLocaleString()}명)` : ''}</div>
    <div class="stat"><b>${sggCases}건</b>${esc(p.sgg || '구·군')} 2025년 온열질환</div>
  </div>
  <h2>오늘 할 일 <span class="badge b-brand">규칙이 고른 맞춤 문장</span></h2>
  ${acts.map(a => `<div class="act">${esc(a)}</div>`).join('')}
  <h2>가까운 무더위쉼터 <span class="badge b-mute">행안부 쉼터 API 승인 후 실제 목록</span></h2>
  <div class="card"><p class="small muted">행정안전부 무더위쉼터 API(시설구분·주소·수용인원·냉방기 보유)에서 ${esc(p.sgg || '내 구·군')} ${esc(p.dong || '')}의 쉼터를 거리순으로 보여 주고, 운영시간(경로당·주민센터·은행·야간쉼터)을 함께 표시할 자리입니다. 데이터 연결 전이라 빈칸으로 둡니다. 가짜 목록을 넣지 않습니다.</p>
  ${stations.length ? `<p class="small"><b>내 구의 에어코리아 측정소</b> (실시간 농도는 이 측정소 기준): ${stations.map(s => esc(s.name)).join(' · ')}</p>` : ''}</div>
  <h2>점수 근거 <span class="badge b-ok">공개 규칙</span></h2>
  <div class="card score">
    <div><b>환경 점수 ${r.exposure.score}</b><ul>${r.exposure.items.map(i => `<li><b>+${i.pts}</b> ${esc(i.why)}</li>`).join('') || '<li>특보·나쁨 없음</li>'}</ul></div>
    <div><b>개인 취약 점수 ${r.vulnerability.score}</b><ul>${r.vulnerability.items.map(i => `<li><b>+${i.pts}</b> ${esc(i.why)}</li>`).join('') || '<li>해당 없음</li>'}</ul></div>
  </div>
  <p class="small muted">단계 = 환경 점수 × (1 + 개인 취약 점수/6). 5 이상 주의, 9 이상 위험. 폭염중대경보에 취약 조건이 있으면 바로 위험. 특보가 없으면 '관심' 이상으로 올리지 않습니다. 가중치는 설계값이며 보건소·현장 실무자 검토로 조정합니다.</p>
  <h2>대구 2025년 온열질환, 어디서 났나</h2>
  <div class="card"><div class="score"><div><b>구·군별</b>${bars(HI.daegu_2025.by_sgg, Math.max(...Object.values(HI.daegu_2025.by_sgg)))}</div><div><b>발생 장소</b>${bars(Object.fromEntries(Object.entries(HI.daegu_2025.by_place).slice(0, 7)), Math.max(...Object.values(HI.daegu_2025.by_place)))}</div></div><p class="small muted">출처: 질병관리청 온열질환 감시 데이터(2025.9.25 기준). 발생지역 기준.</p></div>
  <div class="row" style="margin-top:16px"><a class="btn accent" href="#/alert">이 조건으로 알림이 오면?</a><a class="btn ghost" href="#/profile">조건 수정</a><button class="btn ghost" onclick="window.print()">인쇄·PDF</button></div>`;
}

async function viewAlert() {
  await load();
  const p = getP(), env = getEnv(); const r = judge(env, p); const [tname] = TIER[r.tier];
  const guardian = p.cond.includes('alone');
  app.innerHTML = `
  <h1>알림 미리보기</h1>
  <p class="lead">실제 서비스는 특보·농도가 바뀔 때마다 아래 알림을 카카오톡·문자·앱 푸시로 보냅니다. 전 시민 동일 문자가 아니라, 내 단계가 바뀔 때만 옵니다.</p>
  <div class="card"><h3>① 단계가 올랐어요 <span class="badge b-brand">특보·농도 변화 시</span></h3>
    <div class="alert-item"><div class="ic">🔔</div><div><b>[${tname}] ${esc(p.sgg)} ${esc(p.dong)} ${HEAT[env.heat]}${env.dust === 'bad' || env.dust === 'verybad' ? ' + 미세먼지 ' + DUST[env.dust] : ''}</b><br><span class="small">${esc(TIER[r.tier][1])} 자세히 보기 → 오늘 할 일 3가지</span></div></div></div>
  <div class="card"><h3>② 가장 더운 시간 전에 <span class="badge b-brand">매일 11시</span></h3>
    <div class="alert-item"><div class="ic">⏰</div><div><b>12~17시 실외 활동 줄이기</b><br><span class="small">대구 온열질환은 7~8월, 낮 시간대에 집중됩니다. 물 1시간마다 한 컵. 가까운 쉼터: (쉼터 API 연결 후 표시)</span></div></div></div>
  <div class="card"><h3>③ 안부 확인 <span class="badge ${guardian ? 'b-ok' : 'b-mute'}">${guardian ? '혼자 지내는 분 설정됨' : '혼자 지내는 분에게만'}</span></h3>
    <div class="alert-item"><div class="ic">📞</div><div><b>보호자에게: "오늘 ${esc(p.dong || '○○동')}은 ${tname} 단계입니다. 전화 한 통 부탁드려요"</b><br><span class="small">기상청 중대경보 행동수칙 3단계 '확인(Check)'을 자동화. 응답이 없으면 동 행정복지센터 돌봄 담당에게 전달(동의 시)</span></div></div></div>
  <div class="card"><h3>④ 밤 준비 <span class="badge ${env.night === 'advisory' ? 'b-ok' : 'b-mute'}">열대야주의보 시</span></h3>
    <div class="alert-item"><div class="ic">🌙</div><div><b>자기 전 물 한 잔, 실내 온도 확인, 카페인·술 피하기</b><br><span class="small">기상청 열대야주의보 "오늘 밤 할 일" 체크리스트</span></div></div></div>
  <div class="card"><h3>⑤ 탄소도 함께 <span class="badge b-brand">탄소중립 연결</span></h3>
    <div class="alert-item"><div class="ic">🌳</div><div><b>냉방 26℃ + 선풍기, 낮 2~5시엔 쉼터·도서관으로</b><br><span class="small">폭염일 전력 피크를 분산하면 발전 배출을 줄입니다. 쉼터 이용 횟수를 모아 행정동별 '피크 분산 효과'를 센터에 보고</span></div></div></div>`;
}

async function viewData() {
  await load();
  const top = [...POP.dongs].sort((a, b) => b.o65_pct - a.o65_pct).slice(0, 10);
  app.innerHTML = `
  <h1>데이터와 근거</h1>
  <div class="card"><h3>쓰는 공공데이터</h3><table><tr><th>데이터</th><th>제공</th><th>쓰임</th><th>상태</th></tr>
  <tr><td>온열질환 감시 데이터 2011~2025 (발생일·성별·나이·시군구·실내외·장소)</td><td>질병관리청</td><td>대구 750건으로 위험 장소·시간·집단 가중치</td><td>✅ 확보</td></tr>
  <tr><td>행정동 성별 연령별 주민등록 인구 (2026.9.30)</td><td>행정안전부</td><td>152개 행정동 65·75세 이상 비율</td><td>✅ 확보</td></tr>
  <tr><td>폭염특보 기준 (2026.6 개편: 주의보 체감 33℃·경보 35℃·중대경보 38℃ 또는 기온 39℃·열대야주의보 밤최저 25℃)</td><td>기상청</td><td>단계 입력과 행동수칙(중단·이동·확인)</td><td>✅ 안내자료 원문</td></tr>
  <tr><td>기상특보 조회 API</td><td>기상청</td><td>대구 특보 실시간</td><td>🔑 활용신청 중</td></tr>
  <tr><td>에어코리아 대기오염정보 API (대구 측정소 ${ST.stations.length}곳)</td><td>한국환경공단</td><td>PM2.5·오존 실시간</td><td>🔑 활용신청 중</td></tr>
  <tr><td>무더위쉼터 API (시설구분·주소·수용인원·냉방기)</td><td>행정안전부</td><td>가장 가까운 열린 쉼터</td><td>🔑 활용신청 중</td></tr></table></div>
  <div class="card"><h3>대구 온열질환자 연도별</h3>${bars(HI.daegu_by_year, Math.max(...Object.values(HI.daegu_by_year)))}<p class="small muted">2018년 122명, 2025년 140명. 2019년부터 발생지역 기준.</p></div>
  <div class="card"><h3>2025년 대구 월별·연령대</h3><div class="score"><div>${bars(HI.daegu_2025.by_month, Math.max(...Object.values(HI.daegu_2025.by_month)))}</div><div>${bars(HI.daegu_2025.age_bands, Math.max(...Object.values(HI.daegu_2025.age_bands)))}</div></div></div>
  <div class="card"><h3>65세 이상 비율이 높은 행정동 10곳</h3><table><tr><th>구·군</th><th>행정동</th><th>인구</th><th>65세 이상</th><th>비율</th></tr>${top.map(d => `<tr><td>${esc(d.sgg)}</td><td>${esc(d.dong)}</td><td>${d.pop.toLocaleString()}</td><td>${d.o65.toLocaleString()}</td><td>${d.o65_pct}%</td></tr>`).join('')}</table></div>
  <div class="card"><h3>AI가 하는 일 / 하지 않는 일</h3><table><tr><th>단계</th><th>누가</th><th>어떻게</th></tr>
  <tr><td>위험 단계 판정</td><td>규칙 엔진</td><td>특보·농도·시간 × 개인 취약 점수. 근거를 항목별로 표시</td></tr>
  <tr><td>행동 카드 문장</td><td>규칙 → AI 다듬기</td><td>기상청 행동수칙·온열질환 통계에서 조건에 맞는 문장을 고르고, AI가 60대 눈높이·다국어로 바꿈(원문 범위 밖 내용 금지)</td></tr>
  <tr><td>공고·지침 구조화</td><td>AI 초안 → 사람 승인</td><td>지자체 폭염 대책 문서에서 쉼터 운영시간·야간 개방 정보를 추출(확장 단계)</td></tr>
  <tr><td>민감정보</td><td>-</td><td>이름·주소·병명 미수집. 조건은 브라우저에만 저장</td></tr></table></div>`;
}
route();
