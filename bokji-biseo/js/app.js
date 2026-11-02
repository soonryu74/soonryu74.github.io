import { HOUSEHOLD, SITUATION, BUSINESS, EMPLOYMENT, INCOME, emptyProfile, run } from './engine.js';
import { PERSONAS } from './personas.js';

const $ = sel => document.querySelector(sel);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SIDO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const STORE = 'bokji-biseo-profile-v1';

let DATA = null;
async function load() {
  if (DATA) return DATA;
  const r = await fetch('data/services.json'); DATA = await r.json(); return DATA;
}
function getProfile() { try { return JSON.parse(localStorage.getItem(STORE)) || emptyProfile(); } catch { return emptyProfile(); } }
function setProfile(p) { try { localStorage.setItem(STORE, JSON.stringify(p)); } catch {} }

// ---------- 라우팅 ----------
function route() {
  const hash = location.hash || '#/';
  const [path, qs] = hash.slice(1).split('?');
  const q = new URLSearchParams(qs || '');
  window.scrollTo(0, 0);
  if (path === '/' || path === '') return viewHome();
  if (path === '/profile') return viewProfile(q);
  if (path === '/result') return viewResult(q);
  if (path === '/alert') return viewAlert();
  if (path === '/about') return viewAbout();
  return viewHome();
}
window.addEventListener('hashchange', route);

// ---------- 홈 ----------
async function viewHome() {
  const d = await load();
  const approved = d.services.filter(s => s.rule?.status === 'approved').length;
  const draft = d.services.filter(s => s.rule?.status === 'draft').length;
  app.innerHTML = `
  <h1>검색하지 않아도, 받을 수 있는 복지가 먼저 찾아옵니다</h1>
  <p class="lead">한국사회보장정보원이 공개한 복지서비스 데이터를 매일 읽어, 내 조건에 맞는 것이 생기면 알려 드리고 쉬운말 요약과 서류 체크리스트로 신청까지 함께 갑니다.</p>
  <ol class="steps">
    <li><b>1 수집</b>복지로 공개 API ${d.meta.count}건, 매일</li>
    <li><b>2 구조화</b>AI가 지원 조건을 뽑고 사람이 승인</li>
    <li><b>3 판정</b>규칙 엔진, 근거 문장 공개</li>
    <li><b>4 알림·준비</b>쉬운말 · 서류 · 신청 경로</li>
  </ol>
  <h2>사례로 바로 보기</h2>
  <div class="grid">
    ${Object.values(PERSONAS).map(p => `
      <button class="persona" data-p="${p.id}">
        <span class="tag">${esc(p.tag)}</span>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.story)}</p>
      </button>`).join('')}
  </div>
  <div class="row" style="margin-top:18px">
    <a class="btn" href="#/profile">내 조건으로 직접 해 보기</a>
    <a class="btn ghost" href="#/about">이 결과는 무엇을 근거로 하나요?</a>
  </div>
  <h2>지금 이 데모가 다루는 데이터</h2>
  <div class="summary-bar">
    <div class="stat"><b>${d.meta.count}</b>중앙부처 복지서비스 (${d.meta.ministries}개 부처)</div>
    <div class="stat"><b>${approved}</b>사람이 승인한 규칙 <span class="badge b-ok">승인</span></div>
    <div class="stat"><b>${draft}</b>AI 초안 규칙 <span class="badge b-draft">미검수</span></div>
    <div class="stat"><b>${d.meta.fetched}</b>데이터 수집일</div>
  </div>
  <p class="small muted">지자체 복지서비스 API(접수기간 포함)는 다음 단계에서 연결합니다. 이 데모는 중앙부처 데이터만 사용합니다.</p>`;
  app.querySelectorAll('.persona').forEach(b => b.addEventListener('click', () => { setProfile(PERSONAS[b.dataset.p].profile); location.hash = `#/result?persona=${b.dataset.p}`; }));
}

// ---------- 프로필 입력 ----------
function chk(name, map, selected) {
  return Object.entries(map).map(([k, v]) => `<label class="chk"><input type="checkbox" name="${name}" value="${k}" ${selected.includes(k) ? 'checked' : ''}> ${esc(v)}</label>`).join('');
}
function radio(name, map, selected) {
  return Object.entries(map).map(([k, v]) => `<label class="chk"><input type="radio" name="${name}" value="${k}" ${selected === k ? 'checked' : ''}> ${esc(v)}</label>`).join('');
}
async function viewProfile(q) {
  const p = q.get('persona') ? PERSONAS[q.get('persona')].profile : getProfile();
  app.innerHTML = `
  <h1>내 조건 입력</h1>
  <p class="lead">이름·주민번호·소득 금액은 받지 않습니다. 다섯 가지만 고르면 됩니다. 입력은 이 브라우저에만 저장됩니다.</p>
  <form id="f">
    <fieldset><legend>1. 나이와 사는 곳</legend>
      <div class="row">
        <label>만 나이 <input type="number" name="age" min="0" max="120" value="${p.age ?? ''}" placeholder="예: 62"></label>
        <label>시·도 <select name="sido"><option value="">선택</option>${SIDO.map(s => `<option ${p.sido === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      </div>
      <p class="hint">시·도는 지자체 서비스 연결(다음 단계)에 쓰입니다. 지금 데모 판정에는 영향이 없습니다.</p>
    </fieldset>
    <fieldset><legend>2. 가구·해당 사항</legend><p class="hint">해당하는 것을 모두 고르세요. 모르면 비워 두어도 됩니다.</p>${chk('household', HOUSEHOLD, p.household)}</fieldset>
    <fieldset><legend>3. 지금 겪고 있는 상황</legend>${chk('situation', SITUATION, p.situation)}</fieldset>
    <fieldset><legend>4. 일과 소득</legend>
      <p class="hint">사업자</p>${radio('business', BUSINESS, p.business)}
      <p class="hint">고용 형태</p>${radio('employment', EMPLOYMENT, p.employment)}
      <p class="hint">가구 소득 (대략의 구간만, 금액은 받지 않습니다)</p>
      <select name="income_pct"><option value="">모름 / 선택 안 함</option>${INCOME.map(([v, l]) => `<option value="${v}" ${p.income_pct === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </fieldset>
    <div class="row"><button class="btn" type="submit">받을 수 있는 서비스 찾기</button><button class="btn ghost" type="button" id="reset">지우기</button></div>
  </form>`;
  $('#f').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const np = { age: fd.get('age') ? Number(fd.get('age')) : null, sido: fd.get('sido') || '', household: fd.getAll('household'), situation: fd.getAll('situation'),
      business: fd.get('business') || 'none', employment: fd.get('employment') || 'none', income_pct: fd.get('income_pct') ? Number(fd.get('income_pct')) : null, themes: [] };
    setProfile(np); location.hash = '#/result';
  });
  $('#reset').addEventListener('click', () => { localStorage.removeItem(STORE); viewProfile(new URLSearchParams()); });
}

// ---------- 결과 ----------
function profileSummary(p) {
  const parts = [];
  if (p.age != null) parts.push(`만 ${p.age}세`);
  if (p.sido) parts.push(p.sido);
  parts.push(...p.household.map(k => HOUSEHOLD[k]));
  parts.push(...p.situation.map(k => SITUATION[k]));
  if (p.business !== 'none') parts.push(BUSINESS[p.business]);
  if (p.employment !== 'none') parts.push(EMPLOYMENT[p.employment]);
  if (p.income_pct && p.income_pct !== 999) parts.push(`소득 중위 ${p.income_pct}% 이하`);
  return parts;
}
function checkList(checks) {
  if (!checks.length) return '<div class="why"><b>조건</b> 별도 조건 없음(전 국민 대상) — 세부 기준은 신청 기관 확인</div>';
  const ic = s => s === true ? '✅' : s === false ? '❌' : '❔';
  return `<div class="why"><b>왜 이 결과인가요?</b><ul>${checks.map(c => `<li>${ic(c.state)} ${esc(c.label)}${c.state === null ? ' <span class="muted">— 입력 안 함/원문만으로 판정 불가</span>' : ''}</li>`).join('')}</ul></div>`;
}
function svcCard({ s, r }, tier) {
  const rule = s.rule || {};
  const badge = tier === 'ok' ? '<span class="badge b-ok">지금 해당 가능</span>' : tier === 'check' ? '<span class="badge b-warn">확인 필요</span>' : '<span class="badge b-draft">AI 초안 · 미검수</span>';
  const online = s.online === 'Y' ? '<span class="badge b-brand">온라인 신청 가능</span>' : '<span class="badge b-mute">방문·우편 신청</span>';
  const easy = rule.easy ? `<dl class="easy"><dt>누가</dt><dd>${esc(rule.easy.who)}</dd><dt>무엇을</dt><dd>${esc(rule.easy.what)}</dd><dt>어떻게</dt><dd>${esc(rule.easy.how)}</dd><dt>어디서</dt><dd>${esc(rule.easy.where)}</dd></dl>` : '';
  const docs = rule.docs?.length ? `<div class="docs"><b>준비할 서류</b><ul>${rule.docs.map(d => `<li>☐ ${esc(d)}</li>`).join('')}</ul></div>` : '';
  const note = rule.note ? `<p class="small muted">※ ${esc(rule.note)}</p>` : '';
  const quotes = rule.quotes?.length ? `<details><summary>근거가 된 원문 문장</summary>${rule.quotes.map(q => `<p class="quote">“${esc(q)}”</p>`).join('')}<p class="small muted">출처: 복지로 ${esc(s.name)} 상세 (${esc(s.jur)})${rule.reviewed ? ` · 규칙 검수 ${esc(rule.reviewed)}` : ' · AI 초안, 검수 전'}</p></details>` : '';
  return `<article class="card svc ${tier}">
    <div class="head"><div><h3>${esc(s.name)}</h3><div class="jur">${esc(s.jur)}${s.org ? ' · ' + esc(s.org) : ''}</div></div><div>${badge} ${online}</div></div>
    <p class="digest">${esc(s.digest)}</p>
    ${checkList(r.checks)}
    ${easy}${docs}${note}
    <div class="row" style="margin-top:10px">
      <a class="btn sm" href="${esc(s.link)}" target="_blank" rel="noopener">복지로에서 원문 보기 ↗</a>
      ${s.phone ? `<span class="small muted">문의 ${esc(s.phone)}</span>` : ''}
    </div>
    ${quotes}
  </article>`;
}
async function viewResult(q) {
  const d = await load();
  const personaId = q.get('persona'); const persona = personaId ? PERSONAS[personaId] : null;
  const p = persona ? persona.profile : getProfile();
  const g = run(d.services, p);
  const judge = q.get('judge') ? `<div class="judge"><b>심사위원 모드</b> — 사례 "${esc(persona.name)}"의 조건을 자동 입력했습니다. 판정은 규칙 엔진이, 쉬운말 요약은 AI가 사람 검수를 거쳐 작성했습니다. 아래 "왜 이 결과인가요?"와 "근거가 된 원문 문장"을 펼쳐 보세요.</div>` : '';
  const story = persona ? `<div class="card"><span class="badge b-brand">${esc(persona.tag)}</span> <b>${esc(persona.name)}</b><p class="muted" style="margin:6px 0 0">${esc(persona.story)}</p></div>` : '';
  const DRAFT_SHOW = 6;
  app.innerHTML = `
  ${judge}
  <h1>이런 서비스를 받을 수 있어요</h1>
  ${story}
  <div class="card"><b>입력한 조건</b> <span class="muted small">(${profileSummary(p).map(esc).join(' · ') || '없음'})</span> <a class="btn sm ghost" href="#/profile" style="margin-left:8px">수정</a></div>
  <div class="summary-bar">
    <div class="stat"><b>${g.ok.length}</b>지금 해당 가능</div>
    <div class="stat"><b>${g.check.length}</b>확인 필요</div>
    <div class="stat"><b>${g.draft.length}</b>AI 초안(미검수) 후보</div>
  </div>
  <p class="notice">"지금 해당 가능"은 입력하신 내용 기준입니다. 소득은 구간 자가신고이므로 최종 자격은 신청 기관이 판정합니다.</p>
  <h2>지금 해당 가능 <span class="badge b-ok">사람이 승인한 규칙</span></h2>
  ${g.ok.length ? g.ok.map(x => svcCard(x, 'ok')).join('') : '<p class="muted">승인된 규칙 중 모든 조건이 맞는 서비스가 없습니다. 조건을 더 입력하면 결과가 달라질 수 있어요.</p>'}
  <h2>확인 필요 <span class="badge b-warn">조건 일부를 알 수 없음</span></h2>
  ${g.check.length ? g.check.map(x => svcCard(x, 'check')).join('') : '<p class="muted">없음</p>'}
  <h2>AI 초안 후보 <span class="badge b-draft">검수 전</span></h2>
  <p class="small muted">AI가 원문에서 뽑은 조건 초안으로 걸러낸 후보입니다. 아직 사람이 승인하지 않았으므로 참고만 하세요. 승인되면 위 목록으로 올라갑니다.</p>
  <div id="drafts">${g.draft.slice(0, DRAFT_SHOW).map(x => svcCard(x, 'draft')).join('')}</div>
  ${g.draft.length > DRAFT_SHOW ? `<button class="btn ghost more" id="more">후보 ${g.draft.length - DRAFT_SHOW}개 더 보기</button>` : ''}
  <div class="row" style="margin-top:20px"><a class="btn" href="#/alert">이 조건으로 알림 받으면? 미리보기</a><button class="btn ghost" onclick="window.print()">결과 인쇄·PDF 저장</button></div>`;
  $('#more')?.addEventListener('click', () => { $('#drafts').innerHTML = g.draft.map(x => svcCard(x, 'draft')).join(''); $('#more').remove(); });
}

// ---------- 알림 미리보기 ----------
async function viewAlert() {
  const d = await load();
  const p = getProfile();
  const g = run(d.services, p);
  const recent = [...d.services].filter(s => s.registered).sort((a, b) => b.registered.localeCompare(a.registered)).slice(0, 5);
  const fmt = s => s ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : '';
  app.innerHTML = `
  <h1>알림 미리보기</h1>
  <p class="lead">실제 서비스에서는 매일 데이터를 다시 읽어 아래 세 종류의 알림을 카카오톡·이메일로 보냅니다. 이 화면은 그 모습을 보여 주는 미리보기입니다.</p>
  <div class="card">
    <h3>① 새로 생겼어요 <span class="badge b-brand">실제 데이터</span></h3>
    <p class="small muted">복지로 등록일(svcfrstRegTs) 기준 최근 등록된 중앙부처 서비스. 매일 수집해 어제와 비교하면 "신규"가 됩니다.</p>
    ${recent.map(s => `<div class="alert-item"><div class="ic">🆕</div><div><b>${esc(s.name)}</b> <span class="muted small">${esc(s.jur)}</span><br><time>등록 ${fmt(s.registered)}</time> · <a href="${esc(s.link)}" target="_blank" rel="noopener">원문</a></div></div>`).join('')}
  </div>
  <div class="card">
    <h3>② 내 조건에 맞아요 <span class="badge b-ok">현재 입력 기준</span></h3>
    ${g.ok.length ? g.ok.slice(0, 4).map(x => `<div class="alert-item"><div class="ic">✅</div><div><b>${esc(x.s.name)}</b><br><span class="small">${esc(x.s.rule?.easy?.what || x.s.digest)}</span></div></div>`).join('') : '<p class="muted">내 조건을 먼저 입력하면 여기에 표시됩니다. <a href="#/profile">입력하기</a></p>'}
  </div>
  <div class="card">
    <h3>③ 마감이 다가와요 <span class="badge b-mute">예시 · 지자체 API 연결 후</span></h3>
    <p class="small muted">중앙부처 API 상세에는 접수기간 항목이 없다는 것을 수집 과정에서 확인했습니다. 마감 알림은 지자체복지서비스 API(접수기간 포함)와 공고 원문을 연결하는 다음 단계에서 제공합니다. 아래는 형식 예시이며 실제 공고가 아닙니다.</p>
    <div class="alert-item"><div class="ic">⏰</div><div><b>[예시] ○○시 소상공인 공공요금 지원</b> <span class="badge b-mute">DEMO · 실제 공고 아님</span><br><time>마감 D-7</time> · 준비 서류 3종 체크리스트 보기</div></div>
  </div>
  <div class="card">
    <h3>④ 데이터 품질 피드백 <span class="badge b-brand">정보원에 보내는 리포트</span></h3>
    <p class="small">AI 구조화 과정에서 "원문만으로 대상 판정 불가"로 표시된 서비스는 ${d.meta.ambiguous ?? '-'}건입니다. 대표 사유: 상세 기준을 다른 기관 사이트에서 확인하라고만 적힌 경우, 소득 기준이 비율로 명시되지 않은 경우. 이 목록을 주기적으로 정보원에 전달해 공고 문장을 함께 개선합니다.</p>
  </div>`;
}

// ---------- 근거와 한계 ----------
async function viewAbout() {
  const d = await load();
  app.innerHTML = `
  <h1>이 결과는 무엇을 근거로 하나요?</h1>
  <div class="card">
    <h3>데이터</h3>
    <table><tr><th>데이터</th><th>제공</th><th>이 데모에서 쓰는 곳</th></tr>
    <tr><td>중앙부처복지서비스 목록·상세 API (공공데이터포털 15090532)</td><td>한국사회보장정보원</td><td>서비스 ${d.meta.count}건 전체. 상세의 지원대상·선정기준·신청방법·구비서류·문의처 문장</td></tr>
    <tr><td>지자체복지서비스 API (15108347)</td><td>한국사회보장정보원</td><td>다음 단계(접수기간·시군구 사업). 데모 미연결</td></tr>
    <tr><td>기준 중위소득 고시</td><td>보건복지부</td><td>소득 구간 보기 문구</td></tr></table>
    <p class="small muted">수집일 ${d.meta.fetched}. 원자료 값은 바꾸지 않았고, 화면 문구는 원문 링크로 확인할 수 있습니다.</p>
  </div>
  <div class="card">
    <h3>AI가 한 일 / 하지 않은 일</h3>
    <table><tr><th>단계</th><th>누가</th><th>어떻게</th></tr>
    <tr><td>조건 초안 추출</td><td>AI (LLM)</td><td>지원대상·선정기준 문장 → 연령·소득 %·가구유형·상황 조건 JSON. 근거 문장 인용 필수. 상세 수집분 ${d.meta.detail_api}건에 초안 생성(나머지는 일일 호출 제한 해제 후)</td></tr>
    <tr><td>규칙 승인</td><td>사람</td><td>원문과 대조해 승인한 규칙만 "지금 해당 가능"에 쓰입니다. 승인 ${d.services.filter(s => s.rule?.status === 'approved').length}건, 나머지는 "AI 초안·미검수"로 표시</td></tr>
    <tr><td>해당 여부 판정</td><td>규칙 엔진</td><td>AI 아님. 조건마다 ✅❌❔를 그대로 보여 줍니다</td></tr>
    <tr><td>쉬운말 요약</td><td>AI → 사람 검수</td><td>승인된 서비스만. 원문·승인 조건만 컨텍스트로 넘겨 "누가·무엇을·어떻게·어디서" 4줄</td></tr></table>
  </div>
  <div class="card">
    <h3>정직한 한계</h3>
    <ul>
      <li>소득은 구간 자가신고입니다. 소득인정액 산정(재산 환산 등)은 하지 않으므로 최종 자격은 신청 기관이 판정합니다.</li>
      <li>중앙부처 API에는 접수기간이 없어 마감 알림은 지자체 API 연결 후 가능합니다.</li>
      <li>공공데이터포털 개발계정은 하루 호출 제한이 있어 상세 원문은 ${d.meta.detail_api}건만 수집했습니다. 나머지 승인 규칙은 복지로 요약문 기준이며 카드에 그 사실을 표시합니다.</li>
      <li>AI 초안 규칙의 정확도는 사람 검수 전이며, 사전 시험 40건에서 근거 인용 일치율 96%, 가구유형 추출 50%, 소득 기준 추출 22%였습니다.</li>
      <li>개인정보: 이름·주민번호·금액을 받지 않고, 입력은 브라우저(localStorage)에만 저장됩니다.</li>
    </ul>
  </div>
  <div class="card">
    <h3>기존 서비스와의 관계</h3>
    <p>복지로(검색)·복지니(질문 응답)·복지멤버십(공적자료 기반 급여 안내)을 대체하지 않습니다. 그 위에 "먼저 알리고 신청 준비까지" 층을 얹는 보완 서비스이며, 결과 화면에서 복지로 원문과 복지멤버십 가입으로 연결합니다.</p>
  </div>`;
}

route();
