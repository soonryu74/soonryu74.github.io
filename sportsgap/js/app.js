/* SportsGap AI — 화면 로직 (지도·표·비교·시나리오). 점수 계산은 score.js */
import { INDICATORS, DEFAULT_WEIGHTS, GROUPS, SCOPES, scoreRegions, simulateBudget, proposals, summary } from './score.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : v.toLocaleString('ko-KR', { maximumFractionDigits: d, minimumFractionDigits: d }));
const fmtInt = (v) => (v == null ? '—' : Number(v).toLocaleString('ko-KR'));

const state = {
  data: null, geo: null, map: null, layer: null, leafletOk: false,
  group: 'elder', scope: 'all', weights: { ...DEFAULT_WEIGHTS },
  selected: [], scored: null, sim: null, simExtras: null,
};

// ------------------------------------------------------------- 시작
async function init() {
  readHash();
  bindControls();
  setStatus('데이터 불러오는 중…');
  try {
    const [d, g] = await Promise.all([
      fetch('data/regions.json', { cache: 'no-cache' }).then(okJson),
      fetch('data/gg-sigun.geojson', { cache: 'no-cache' }).then(okJson),
    ]);
    if (!d.regions || d.regions.length === 0) throw new Error('지역 데이터가 비어 있습니다');
    state.data = d; state.geo = g;
  } catch (e) {
    setStatus(`데이터를 불러오지 못했습니다: ${e.message}. 네트워크 상태를 확인한 뒤 새로고침하세요.`, 'error');
    $('#map').innerHTML = '<div class="state error">지도 데이터 없음</div>';
    return;
  }
  renderMeta();
  initMap();
  recompute();
  setStatus('');
}
const okJson = (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };

function setStatus(msg, kind = '') {
  const el = $('#status');
  el.textContent = msg; el.className = `state ${kind}`; el.hidden = !msg;
}

// ------------------------------------------------------------- 컨트롤
function bindControls() {
  const g = $('#group');
  for (const [k, v] of Object.entries(GROUPS)) {
    const o = document.createElement('option'); o.value = k; o.textContent = v.available ? v.label : `${v.label} — 평가불가`; o.disabled = !v.available; g.append(o);
  }
  g.value = state.group;
  const s = $('#scope');
  for (const [k, v] of Object.entries(SCOPES)) { const o = document.createElement('option'); o.value = k; o.textContent = v.label; s.append(o); }
  s.value = state.scope;
  g.addEventListener('change', () => { state.group = g.value; if (GROUPS[g.value].scope && $('#scopeFollow').checked) { state.scope = GROUPS[g.value].scope; s.value = state.scope; } recompute(); });
  s.addEventListener('change', () => { state.scope = s.value; recompute(); });

  const wbox = $('#weights');
  for (const ind of INDICATORS) {
    const id = `w-${ind.key}`;
    const lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = ind.label; lab.title = ind.desc; lab.style.margin = '4px 0';
    const val = document.createElement('span'); val.className = 'w num'; val.id = `${id}-v`; val.textContent = `${state.weights[ind.key]}%`;
    const inp = document.createElement('input'); inp.type = 'range'; inp.min = 0; inp.max = 100; inp.step = 5; inp.id = id; inp.value = state.weights[ind.key]; inp.setAttribute('aria-describedby', `${id}-v`);
    inp.addEventListener('input', () => { state.weights[ind.key] = Number(inp.value); val.textContent = `${inp.value}%`; updateWsum(); });
    inp.addEventListener('change', () => recompute());
    wbox.append(lab, val, inp, document.createElement('span'));
  }
  updateWsum();
  $('#resetWeights').addEventListener('click', () => { state.weights = { ...DEFAULT_WEIGHTS }; for (const ind of INDICATORS) { $(`#w-${ind.key}`).value = DEFAULT_WEIGHTS[ind.key]; $(`#w-${ind.key}-v`).textContent = `${DEFAULT_WEIGHTS[ind.key]}%`; } updateWsum(); recompute(); });
  $('#runSim').addEventListener('click', runSim);
  $('#clearSim').addEventListener('click', () => { state.sim = null; state.simExtras = null; renderSim(); recompute(); });
  $('#clearSel').addEventListener('click', () => { state.selected = []; recompute(); });
  $('#compareSel').addEventListener('change', (e) => { const v = e.target.value; if (v) toggleSelect(v); e.target.value = ''; });
}
function updateWsum() {
  const sum = INDICATORS.reduce((a, i) => a + state.weights[i.key], 0);
  const el = $('#wsum');
  el.textContent = sum === 100 ? '가중치 합계 100%' : `가중치 합계 ${sum}% → 합계 기준으로 비율 환산해 적용(0%는 지표 제외)`;
  el.className = `wsum ${sum === 100 ? '' : 'bad'}`;
}

function readHash() {
  const p = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (p.get('group') && GROUPS[p.get('group')]?.available) state.group = p.get('group');
  if (p.get('scope') && SCOPES[p.get('scope')]) state.scope = p.get('scope');
  if (p.get('sel')) state.selected = p.get('sel').split(',').filter(Boolean);
  for (const ind of INDICATORS) if (p.get(ind.key) != null) state.weights[ind.key] = Math.max(0, Math.min(100, Number(p.get(ind.key)) || 0));
}
function writeHash() {
  const p = new URLSearchParams();
  p.set('group', state.group); p.set('scope', state.scope);
  for (const ind of INDICATORS) if (state.weights[ind.key] !== DEFAULT_WEIGHTS[ind.key]) p.set(ind.key, state.weights[ind.key]);
  if (state.selected.length) p.set('sel', state.selected.join(','));
  history.replaceState(null, '', `#${p.toString()}`);
}

// ------------------------------------------------------------- 메타
function renderMeta() {
  const m = state.data.meta;
  $('#dateFac').textContent = `시설 ${m.sources.facilities.reference_date}`;
  $('#datePop').textContent = `인구 ${m.sources.population.reference_date}`;
  $('#dateBus').textContent = m.sources.bus ? `정류장 ${m.sources.bus.reference_date}` : '대중교통 평가불가';
  $('#builtAt').textContent = m.built_at.replace('T', ' ').replace('Z', ' UTC');
  const sel = $('#compareSel');
  for (const r of state.data.regions) { const o = document.createElement('option'); o.value = r.name; o.textContent = r.name; sel.append(o); }
}

// ------------------------------------------------------------- 지도
function initMap() {
  const mapEl = $('#map');
  if (typeof window.L === 'undefined') {
    state.leafletOk = false;
    mapEl.innerHTML = '<div class="state">지도 라이브러리를 불러오지 못했습니다. 아래 표에서 같은 정보를 볼 수 있습니다.</div>';
    $('#legend').hidden = true;
    return;
  }
  try {
    const map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false, keyboard: true });
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 13, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자' });
    tiles.on('tileerror', () => { if (!state.tileWarned) { state.tileWarned = true; $('#tileNote').hidden = false; } });
    tiles.addTo(map);
    map.attributionControl.addAttribution('경계: 통계청 2018(southkorea-maps)');
    state.layer = L.geoJSON(state.geo, {
      style: () => ({ color: '#2b3a4a', weight: 0.8, fillOpacity: 0.72, fillColor: '#ccc' }),
      onEachFeature: (f, l) => {
        l.on('click', () => toggleSelect(f.properties.sigun));
        l.on('mouseover', () => l.setStyle({ weight: 2.2 }));
        l.on('mouseout', () => l.setStyle({ weight: state.selected.includes(f.properties.sigun) ? 2.5 : 0.8 }));
      },
    }).addTo(map);
    map.fitBounds(state.layer.getBounds(), { padding: [6, 6] });
    state.map = map; state.leafletOk = true;
  } catch (e) {
    state.leafletOk = false;
    mapEl.innerHTML = `<div class="state">지도를 그리지 못했습니다(${e.message}). 아래 표를 이용하세요.</div>`;
    $('#legend').hidden = true;
  }
}
const COLORS = ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'];
function colorFor(c) { if (c == null) return '#d9dde2'; return COLORS[Math.min(4, Math.floor(c / 20))]; }
function paintMap() {
  if (!state.leafletOk) return;
  const by = Object.fromEntries(state.scored.results.map((r) => [r.name, r]));
  state.layer.eachLayer((l) => {
    const n = l.feature.properties.sigun; const r = by[n]; const sel = state.selected.includes(n);
    l.setStyle({ fillColor: colorFor(r?.composite), weight: sel ? 2.5 : 0.8, color: sel ? '#ff8800' : '#2b3a4a', fillOpacity: r?.status === 'ok' ? 0.72 : 0.35 });
    const txt = r?.status === 'ok' ? `${n} — 격차 ${r.composite}점 (${r.rank}위)` : `${n} — 평가불가(${(r?.missing || []).join(', ')})`;
    l.bindTooltip(txt, { sticky: true });
  });
  if (state.selected.length) { try { const sel = state.layer.getLayers().filter((l) => state.selected.includes(l.feature.properties.sigun)); const g = L.featureGroup(sel); state.map.fitBounds(g.getBounds().pad(0.6)); } catch { /* 무시 */ } }
}

// ------------------------------------------------------------- 계산·렌더
function recompute() {
  if (!state.data) return;
  const extras = state.simExtras || {};
  state.scored = scoreRegions(state.data.regions, { scope: state.scope, group: state.group, weights: state.weights, extras });
  writeHash();
  paintMap();
  renderTable();
  renderCompare();
  renderProposals();
  renderSim();
}

function toggleSelect(name) {
  const i = state.selected.indexOf(name);
  if (i >= 0) state.selected.splice(i, 1); else state.selected.push(name);
  if (state.selected.length > 4) state.selected.shift();
  recompute();
}

function renderTable() {
  const tb = $('#rankTable tbody'); tb.innerHTML = '';
  const rows = [...state.scored.results].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name, 'ko'));
  for (const r of rows) {
    const tr = document.createElement('tr'); tr.tabIndex = 0; tr.setAttribute('role', 'button'); tr.setAttribute('aria-pressed', String(state.selected.includes(r.name)));
    if (state.selected.includes(r.name)) tr.classList.add('sel');
    const na = r.status !== 'ok';
    tr.innerHTML = `<td>${r.name}${r.extra ? ` <span class="badge ok">+${r.extra}</span>` : ''}</td>
      <td class="num">${na ? '<span class="badge na">평가불가</span>' : r.rank}</td>
      <td class="num">${na ? '—' : `<span class="bar" style="width:${r.composite * 0.6}px;background:${colorFor(r.composite)}"></span>${fmt(r.composite)}`}</td>
      <td class="num">${fmt(r.raw.supply_per_10k, 2)}</td>
      <td class="num">${fmt(r.raw.est_km, 2)}</td>
      <td class="num">${fmt(r.raw.vuln_ratio)}</td>
      <td class="num">${fmt(r.raw.transit_density)}</td>
      <td class="num">${fmtInt(r.raw.facilities)}</td>`;
    const act = () => toggleSelect(r.name);
    tr.addEventListener('click', act);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    tb.append(tr);
  }
  $('#tblCaption').textContent = `${GROUPS[state.group].label} · ${SCOPES[state.scope].label} · 격차 점수 내림차순 (0~100, 높을수록 우선 검토)`;
  $('#vulnHead').textContent = state.group === 'child' ? '0~14세 %' : '65세+ %';
}

function renderCompare() {
  const box = $('#compare');
  if (!state.selected.length) { box.innerHTML = '<p class="muted">지도나 표에서 지역을 눌러 최대 4곳까지 나란히 비교합니다.</p>'; return; }
  const sum = summary(state.scored.results);
  const by = Object.fromEntries(state.scored.results.map((r) => [r.name, r]));
  const regs = Object.fromEntries(state.data.regions.map((r) => [r.name, r]));
  box.innerHTML = '';
  for (const n of state.selected) {
    const r = by[n]; const d = regs[n]; if (!r) continue;
    const div = document.createElement('div'); div.className = 'reg';
    const types = Object.entries(d.facilities_by_type).slice(0, 5).map(([t, c]) => `${t} ${c}`).join(' · ');
    div.innerHTML = `<h4>${n} <span>${r.status === 'ok' ? `${r.composite}점 · ${r.rank}위` : '평가불가'}</span></h4>
      <dl class="kv">
        <dt>인구(주민등록)</dt><dd>${fmtInt(d.pop_total)}명</dd>
        <dt>${state.group === 'child' ? '0~14세' : '65세 이상'}</dt><dd>${fmt(r.raw.vuln_ratio)}% <small class="muted">(중앙값 ${fmt(sum.vuln_ratio.median)})</small></dd>
        <dt>시설 수(선택 범위)</dt><dd>${fmtInt(r.raw.facilities)}개 ${r.extra ? `<span class="badge ok">시나리오 +${r.extra}</span>` : ''}</dd>
        <dt>1만 명당 시설</dt><dd>${fmt(r.raw.supply_per_10k, 2)} <small class="muted">(중앙값 ${fmt(sum.supply_per_10k.median, 2)})</small></dd>
        <dt>면적(근사)</dt><dd>${fmt(d.area_km2)}㎢</dd>
        <dt>추정 최근접거리</dt><dd>${fmt(r.raw.est_km, 2)}km <small class="muted">(중앙값 ${fmt(sum.est_km.median, 2)})</small></dd>
        <dt>버스정류장 밀도</dt><dd>${fmt(r.raw.transit_density)}/㎢</dd>
        <dt>간이운동장(참고)</dt><dd>${fmtInt(d.simple_grounds)}개</dd>
      </dl>
      <div class="chips" style="margin-top:6px">${INDICATORS.map((i) => `<span title="${i.desc}">${i.label} ${r.scores[i.key] ?? '—'}</span>`).join('')}</div>
      <p class="muted" style="margin:6px 0 0">주요 시설: ${types}</p>
      <button class="btn secondary" style="margin-top:6px;padding:4px 10px" data-rm="${n}">비교에서 제외</button>`;
    div.querySelector('[data-rm]').addEventListener('click', () => toggleSelect(n));
    box.append(div);
  }
}

function renderProposals() {
  const box = $('#proposals'); box.innerHTML = '';
  const regs = Object.fromEntries(state.data.regions.map((r) => [r.name, r]));
  const ps = proposals(state.scored, regs);
  if (!ps.length) { box.innerHTML = '<p class="muted">평가 가능한 지역이 없어 제안을 만들 수 없습니다.</p>'; return; }
  for (const p of ps) {
    const div = document.createElement('div'); div.className = `prop ${p.kind}`;
    div.innerHTML = `<h4>${p.rank ? `${p.rank}순위 · ` : '구조 제안 · '}${p.title}</h4><p style="margin:0">${p.body}</p>
      <ul>${p.evidence.map((e) => `<li>${e}</li>`).join('')}</ul><p class="caveat">한계: ${p.caveat}</p>`;
    box.append(div);
  }
  const w = state.scored.weights, ws = state.scored.wsum;
  $('#formula').textContent = INDICATORS.filter((i) => w[i.key] > 0).map((i) => `${i.label} ${Math.round((w[i.key] / ws) * 1000) / 10}%`).join(' + ') + ' = 격차 점수(0~100). 각 지표는 31개 시군 분포에서 P5~P95로 자른 뒤 min-max 정규화.';
}

// ------------------------------------------------------------- 시나리오
function runSim() {
  const budget = Number($('#budget').value), unit = Number($('#unitcost').value);
  const objective = $('#objective').value;
  const onlySel = $('#simOnlySel').checked;
  if (!(budget > 0) || !(unit > 0)) { $('#simResult').innerHTML = '<p class="state error">예산과 단가를 0보다 크게 입력하세요.</p>'; return; }
  if (budget / unit > 60) { $('#simResult').innerHTML = '<p class="state error">추가 시설 수가 60개를 넘습니다. 예산을 줄이거나 단가를 올려 주세요(계산 상한).</p>'; return; }
  setStatus('시나리오 계산 중…');
  setTimeout(() => {
    state.sim = simulateBudget(state.data.regions, { scope: state.scope, group: state.group, weights: state.weights }, { budgetEok: budget, unitCostEok: unit, objective, candidates: onlySel ? state.selected : null });
    state.simExtras = Object.fromEntries(state.sim.allocation.map((a) => [a.name, a.units]));
    setStatus('');
    recompute();
    $('#simResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 30);
}
function renderSim() {
  const box = $('#simResult');
  if (!state.sim) { box.innerHTML = '<p class="muted">예산·단가·대상 집단을 바꾸고 실행하면, 시설을 한 곳씩 추가했을 때 격차 점수가 가장 많이 내려가는 지역 순으로 배분한 결과를 보여줍니다. 지도·표·제안도 "추가 후" 상태로 바뀝니다.</p>'; return; }
  const s = state.sim;
  if (!s.allocation.length) { box.innerHTML = `<p class="state">예산 ${fmtInt(s.budgetEok)}억 원 ÷ 단가 ${fmtInt(s.unitCostEok)}억 원 = ${s.n}개소. 배분할 수 있는 시설이 없습니다.</p>`; return; }
  box.innerHTML = `<div class="notice">예산 ${fmtInt(s.budgetEok)}억 원 ÷ 단가 ${fmtInt(s.unitCostEok)}억 원 = <b>${s.n}개소</b> (집행 ${fmtInt(s.spentEok)}억 원) · 기준: ${s.objective === 'people' ? '점수 감소폭 × 인구(수혜 규모)' : '점수 감소폭'} · 탐욕 배분</div>
    <table><thead><tr><th>지역</th><th>추가</th><th>비용(억)</th><th>순위 전→후</th><th>점수 전→후</th></tr></thead>
    <tbody>${s.allocation.map((a) => `<tr><td>${a.name}</td><td class="num">+${a.units}</td><td class="num">${fmtInt(a.costEok)}</td><td class="num">${a.rankBefore}위 → ${a.rankAfter}위</td><td class="num">${fmt(a.compositeBefore)} → ${fmt(a.compositeAfter)}</td></tr>`).join('')}</tbody></table>
    <p class="muted" style="margin:8px 0 0">단가는 입력 가정값입니다. 문체부 현황의 건설사업비 항목은 결측이 많아(생활체육관 4건 등) 기본값으로 쓰지 않았습니다. 지역별 지가·규모에 따라 크게 달라집니다.</p>`;
}

init();
