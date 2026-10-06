import { SKILLS, SKILL_MAP, SKILL_CATEGORIES } from '../../data/skills.js';
import { esc, modeBadge } from '../ui.js';

export function view(ctx) {
  const { analysis } = ctx.state;
  const current = ctx.state.userSkills || [];
  const evOf = (id) => (analysis.skills.find((s) => s.id === id)?.evidence || []).join(' / ');
  const addedByUser = (id) => !analysis.skills.some((s) => s.id === id);
  const groups = Object.entries(SKILL_CATEGORIES).map(([cat, label]) => `<optgroup label="${esc(label)}">${SKILLS.filter((s) => s.cat === cat && !current.includes(s.id)).map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('')}</optgroup>`).join('');

  const html = `
<h1>당신에게 이미 있는 역량</h1>
<p class="lead">입력하신 경험을 다음 직업의 언어로 바꿔 보았습니다. 틀린 것은 지우고, 빠진 것은 더해 주세요. <strong>최종 결정은 당신이 합니다.</strong></p>
<p>${modeBadge(analysis.mode)} <span class="muted small">${analysis.mode === 'ai' ? '원격 AI가 추출한 결과입니다.' : '브라우저 안 키워드 규칙으로 추출했습니다(AI 서버 미연결). 각 역량의 근거 문장을 함께 표시합니다.'}</span></p>
${analysis.error ? `<div class="notice notice-warn">${esc(analysis.error)}</div>` : ''}

<section class="card" data-testid="skill-panel">
  <h3 style="margin-top:0">역량 ${current.length}개</h3>
  ${current.length ? '' : '<div class="notice notice-warn">추출된 역량이 없습니다. 아래에서 직접 추가하거나, 입력 화면으로 돌아가 경험을 조금 더 적어주세요.</div>'}
  <div class="skill-list" id="skill-list">
    ${current.map((id) => `<span class="skill ${addedByUser(id) ? 'added' : ''}" data-id="${id}" data-testid="skill-${id}"><span>${esc(SKILL_MAP[id].label)}${addedByUser(id) ? '' : `<br><span class="ev">근거: ${esc(evOf(id))}</span>`}</span><button type="button" data-action="remove" data-id="${id}" aria-label="${esc(SKILL_MAP[id].label)} 삭제">×</button></span>`).join('')}
  </div>
  <div class="add-row">
    <div class="field" style="margin:0;flex:1 1 260px"><label for="add-skill">역량 추가</label><select id="add-skill"><option value="">추가할 역량을 고르세요</option>${groups}</select></div>
    <button type="button" class="btn btn-outline" data-action="add" data-testid="skill-add">추가</button>
  </div>
  <p class="muted small" style="margin-top:12px">점선 테두리는 직접 추가한 역량입니다. 삭제한 역량은 추천에서 빠집니다.</p>
</section>

<div class="actions">
  <button type="button" class="btn btn-primary btn-lg" data-action="next" data-testid="to-jobs" ${current.length ? '' : 'disabled'}>이 역량으로 전환직무 찾기</button>
  <a class="btn btn-ghost" href="#/input">입력 수정</a>
</div>`;

  return {
    title: '역량 확인 — 다시ON AI',
    html,
    mount(root) {
      root.querySelectorAll('[data-action="remove"]').forEach((b) => b.addEventListener('click', () => {
        ctx.setState({ userSkills: current.filter((id) => id !== b.dataset.id) }); ctx.rerender();
      }));
      root.querySelector('[data-action="add"]').addEventListener('click', () => {
        const sel = root.querySelector('#add-skill');
        if (!sel.value) { sel.focus(); return; }
        ctx.setState({ userSkills: [...current, sel.value] }); ctx.rerender();
      });
      root.querySelector('[data-action="next"]').addEventListener('click', () => ctx.navigate('#/jobs'));
    },
  };
}
