import { REGIONS } from '../../data/regions.js';
import { QUALIFICATIONS } from '../../data/skills.js';
import { PERSONAS } from '../../data/personas.js';
import { esc, LABELS } from '../ui.js';

const radio = (name, value, label, cur) => `<label class="chip-opt"><input type="radio" name="${name}" value="${value}" ${cur === value ? 'checked' : ''}><span>${esc(label)}</span></label>`;

export function view(ctx) {
  const inp = ctx.state.input;
  const html = `
<h1>내가 해온 일을 알려주세요</h1>
<p class="lead">직업 이름이 아니어도 괜찮습니다. 했던 일, 맡았던 역할, 집에서 한 일, 자신 있는 것을 편하게 적어주세요.</p>
<div class="notice notice-info"><strong>개인정보 안내</strong> 이름·주민등록번호·전화번호·정확한 주소 같은 민감정보는 적지 마세요. 입력 내용은 이 브라우저에만 저장되고 서버로 보내지 않습니다.</div>

<form id="career-form" class="card" novalidate>
  <div class="field">
    <label for="f-text">해온 일 <span class="hint">(3~5문장이면 충분합니다)</span></label>
    <textarea id="f-text" name="text" data-testid="career-text" placeholder="예: 20년 동안 회사에서 행정업무를 했습니다. 문서작성과 민원응대를 많이 했고 직원 교육도 했습니다. 부모님을 5년 정도 돌본 경험이 있습니다. 이제는 주간근무를 하고 싶습니다." required>${esc(inp.text)}</textarea>
    <div class="persona-row" style="margin-top:10px">
      <span class="muted small" style="align-self:center">예시 불러오기:</span>
      ${PERSONAS.slice(0, 3).map((p) => `<button type="button" class="btn btn-outline btn-sm" data-action="fill" data-id="${p.id}">${esc(p.name)}</button>`).join('')}
    </div>
  </div>

  <h3>희망 조건 <span class="hint muted" style="font-weight:400">(선택 · 모두 건너뛸 수 있습니다)</span></h3>
  <div class="field">
    <span class="label">희망 지역</span>
    <div class="select-row">
      <select id="f-sido" aria-label="시·도"><option value="">시·도 선택</option>${Object.keys(REGIONS).map((s) => `<option ${inp.region[0] === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <select id="f-gugun" aria-label="시·군·구"><option value="">시·군·구</option></select>
    </div>
  </div>
  <div class="field"><span class="label">근무형태</span><div class="radio-row">${Object.entries(LABELS.workType).map(([v, l]) => radio('workType', v, l, inp.workType)).join('')}</div></div>
  <div class="field"><span class="label">희망 근무시간</span><div class="radio-row">${Object.entries(LABELS.hours).map(([v, l]) => radio('hours', v, l, inp.hours)).join('')}</div></div>
  <div class="field"><label for="f-wage">희망 임금 <span class="hint">(현재 데모의 추천점수에는 반영하지 않음 — 임금 데이터 연결 예정)</span></label>
    <select id="f-wage" name="wage">${Object.entries(LABELS.wage).map(([v, l]) => `<option value="${v}" ${inp.wage === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
  <div class="field"><span class="label">가지고 있는 자격·면허</span>
    <div class="check-row">${QUALIFICATIONS.map((q) => `<label class="chip-opt"><input type="checkbox" name="quals" value="${q.id}" ${inp.quals.includes(q.id) ? 'checked' : ''}><span>${esc(q.label)}</span></label>`).join('')}</div></div>
  <div class="field"><span class="label">새로운 교육·훈련을 받을 의향</span><div class="radio-row">${Object.entries(LABELS.training).map(([v, l]) => radio('training', v, l, inp.training)).join('')}</div></div>

  <p id="form-error" class="notice notice-danger" role="alert" hidden></p>
  <div class="actions">
    <button type="submit" class="btn btn-primary btn-lg" data-testid="analyze">AI로 내 경력 번역하기</button>
    <a class="btn btn-ghost" href="#/">처음으로</a>
  </div>
</form>`;

  return {
    title: '경력 입력 — 다시ON AI',
    html,
    mount(root) {
      const sido = root.querySelector('#f-sido');
      const gugun = root.querySelector('#f-gugun');
      const fillGugun = (sel) => {
        const list = REGIONS[sido.value] || [];
        gugun.innerHTML = `<option value="">시·군·구</option>${list.map((g) => `<option ${g === sel ? 'selected' : ''}>${esc(g)}</option>`).join('')}`;
      };
      fillGugun(inp.region[1]);
      sido.addEventListener('change', () => fillGugun(''));
      root.querySelectorAll('[data-action="fill"]').forEach((b) => b.addEventListener('click', () => ctx.loadPersona(b.dataset.id, { autoRun: false })));
      root.querySelector('#career-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const text = f.text.value.trim();
        const err = root.querySelector('#form-error');
        if (text.length < 10) {
          err.textContent = '해온 일을 10자 이상 적어주세요. 예시 버튼을 눌러 불러올 수도 있습니다.';
          err.hidden = false; f.text.focus(); return;
        }
        err.hidden = true;
        const input = {
          text,
          region: [sido.value, gugun.value],
          workType: f.workType.value, hours: f.hours.value, wage: f.wage.value,
          quals: [...f.querySelectorAll('input[name="quals"]:checked')].map((i) => i.value),
          training: f.training.value,
        };
        ctx.runAnalysis(input);
      });
    },
  };
}
