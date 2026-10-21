import { ACTIVITY, GOALS, dailyTargets, sweatRate, supplementDoses, dopingWatch, STATUS_LABEL } from './nutrition.js';

const $ = (s) => document.querySelector(s);
let supplements = null, doping = null;

async function init() {
  for (const [k, v] of Object.entries(ACTIVITY)) { const o = document.createElement('option'); o.value = k; o.textContent = v.label; $('#activity').append(o); }
  $('#activity').value = 'moderate';
  for (const [k, v] of Object.entries(GOALS)) { const o = document.createElement('option'); o.value = k; o.textContent = v.label; $('#goal').append(o); }
  $('#btnCalc').addEventListener('click', calc);
  $('#btnSweat').addEventListener('click', sweat);
  $('#btnDop').addEventListener('click', dop);
  for (const id of ['weight', 'age', 'activity', 'goal']) $(`#${id}`).addEventListener('change', calc);
  try {
    [supplements, doping] = await Promise.all([fetch('data/supplements.json').then((r) => r.json()), fetch('data/doping-watch.json').then((r) => r.json())]);
  } catch (e) { $('#sups').innerHTML = `<p class="state error">데이터를 불러오지 못했습니다: ${e.message}</p>`; return; }
  $('#supBasis').textContent = supplements.basis; $('#contam').textContent = supplements.contamination;
  $('#dopMeta').textContent = `목록 ${doping.items.length}개 · 확인일 ${doping.checked}`;
  calc();
}

function calc() {
  const t = dailyTargets({ weightKg: $('#weight').value, activity: $('#activity').value, goal: $('#goal').value, age: Number($('#age').value) });
  const box = $('#targets');
  if (!t.ok) { box.innerHTML = `<p class="state error">${t.error}</p>`; $('#resBadge').hidden = true; return; }
  $('#resBadge').hidden = false; $('#resBadge').textContent = `${t.weightKg} kg · ${ACTIVITY[$('#activity').value].label.split('(')[0]} · ${GOALS[$('#goal').value].label}`;
  box.innerHTML = `
    <dl class="kv">
      <dt>탄수화물 (하루)</dt><dd>${t.carb.g[0]}~${t.carb.g[1]} g <span class="muted">(${t.carb.perKg[0]}~${t.carb.perKg[1]} g/kg)</span></dd>
      <dt>단백질 (하루)</dt><dd>${t.protein.g[0]}~${t.protein.g[1]} g <span class="muted">(${t.protein.perKg[0]}~${t.protein.perKg[1]} g/kg)</span></dd>
      <dt>단백질 1회량</dt><dd>${t.protein.perMeal[0]}~${t.protein.perMeal[1]} g <span class="muted">(0.3~0.4 g/kg)</span></dd>
      <dt>운동 4시간 전 수분</dt><dd>${t.fluid.preMl[0]}~${t.fluid.preMl[1]} mL</dd>
      <dt>운동 중 수분</dt><dd>${t.fluid.duringMlPerH[0]}~${t.fluid.duringMlPerH[1]} mL/시간</dd>
      <dt>운동 후 수분</dt><dd>체중 감소 1 kg당 ${t.fluid.postPerKgLostL[0]}~${t.fluid.postPerKgLostL[1]} L</dd>
    </dl>
    <h3>타이밍</h3>
    <ul style="margin:0;padding-left:18px;font-size:.92rem"><li>${t.protein.meals}</li><li>${t.timing.pre}</li><li>${t.timing.post}</li><li>${t.fluid.duringNote}</li><li>${t.fluid.postNote}</li></ul>
    ${t.notes.length ? `<div class="notice">${t.notes.join('<br>')}</div>` : ''}`;
  renderSupplements(t.weightKg);
}

function renderSupplements(w) {
  if (!supplements) return;
  const d = supplementDoses(w) || {};
  const map = { caffeine: d.caffeine, creatine: d.creatine, beta_alanine: d.betaAlanine, nitrate: d.nitrate, bicarbonate: d.bicarbonate };
  $('#sups').innerHTML = supplements.items.map((s) => {
    const dd = map[s.id];
    return `<div class="sup"><h4>${s.name} <span class="badge">근거 ${s.evidence}</span></h4>
      <div class="kv"><dt>누가</dt><dd style="text-align:left;font-weight:400">${s.who}</dd><dt>용량</dt><dd style="text-align:left">${dd ? `${dd.range} · ${dd.when}` : s.dose}</dd></div>
      <p class="muted" style="margin:6px 0 0">${s.effect}</p><p class="muted" style="margin:4px 0 0"><b>주의</b> ${s.caution}${dd?.note ? ` · ${dd.note}` : ''}</p>
      <p class="muted" style="margin:4px 0 0">출처 ${s.ref}${s.link ? ` · <a href="${s.link}">근거영양 성분 카드</a>` : ''}</p></div>`;
  }).join('');
}

function sweat() {
  const r = sweatRate({ preKg: $('#preKg').value, postKg: $('#postKg').value, fluidMl: Number($('#fluidMl').value || 0), durationMin: $('#durMin').value });
  const box = $('#sweatOut');
  if (!r.ok) { box.innerHTML = `<p class="state error" style="padding:6px">${r.error}</p>`; return; }
  box.innerHTML = `<dl class="kv"><dt>총 땀 손실</dt><dd>${r.lossKg} L</dd><dt>시간당</dt><dd>${r.ratePerH} L/h</dd><dt>체중 변화</dt><dd>${r.pctLoss}%</dd><dt>보충 목표</dt><dd>${r.replaceL[0]}~${r.replaceL[1]} L</dd></dl>${r.warn.map((w) => `<div class="notice">${w}</div>`).join('')}`;
}

function dop() {
  if (!doping) return;
  const hits = dopingWatch($('#dopText').value, doping.items);
  const box = $('#dopOut');
  if (!$('#dopText').value.trim()) { box.innerHTML = '<p class="muted">성분이나 제품명을 입력하세요.</p>'; return; }
  if (!hits.length) { box.innerHTML = '<div class="notice">이 목록의 주의 성분과 일치하는 항목이 없습니다. 목록에 없다고 안전하다는 뜻은 아니므로 KADA 검색으로 확인하세요.</div>'; return; }
  box.innerHTML = hits.map((h) => `<div class="dop ${h.status}"><b>${h.name}</b> <span class="badge">${STATUS_LABEL[h.status]}</span> <span class="muted">${h.class}</span><div class="muted">흔한 출처: ${h.source} · 입력에서 "${h.matched}" 발견</div><div>${h.advice}</div></div>`).join('') + `<p class="muted">${doping.basis}</p>`;
}

init();
