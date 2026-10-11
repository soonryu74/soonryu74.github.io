import { FIELDS } from '../../data/jobs.js';
import { WEIGHTS } from '../engine/jobMatcher.js';
import { esc, badge } from '../ui.js';

function jobCard(m, i, ctx) {
  const { job, explain, parts } = m;
  const blocked = parts.barrier.missingRequired?.length;
  return `
<article class="card job-card" data-testid="job-${job.id}" data-rank="${i + 1}">
  <span class="rank">${i + 1}위</span>
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
    <h3>${esc(job.title)}</h3>${badge('field', FIELDS[job.field])}
  </div>
  <div class="score-row"><span class="pct">적합도 ${m.score}%</span><div class="bar" role="img" aria-label="적합도 ${m.score}%"><i style="width:${m.score}%"></i></div></div>
  <p class="muted">${esc(job.summary)}</p>
  <div class="why"><b>왜 잘 맞나요?</b><br>${esc(explain.why)}</div>
  ${blocked ? `<div class="notice notice-warn" style="margin:8px 0"><strong>필수 자격</strong> ${esc(parts.barrier.missingRequired.map((q) => q.label).join(', '))} — 이 직무는 자격이 있어야 일할 수 있습니다. AI가 적합 판정을 대신하지 않습니다.</div>` : ''}
  <div class="grid-2">
    <div><b>강점</b><div class="tag-list">${explain.strengths.length ? explain.strengths.map((s) => `<span class="tag ok">${esc(s)}</span>`).join('') : '<span class="muted small">직접 겹치는 역량 없음</span>'}</div></div>
    <div><b>보완하면 좋은 점</b><div class="tag-list">${explain.improve.map((s) => `<span class="tag gap">${esc(s)}</span>`).join('')}</div></div>
  </div>
  <details><summary>점수는 어떻게 계산했나요?</summary>
    <div class="table-wrap"><table><thead><tr><th>요소</th><th>가중치</th><th>이번 평가</th><th>설명</th></tr></thead><tbody>
    ${WEIGHTS.map((w) => { const p = parts[w.key]; return `<tr><td>${esc(w.label)}</td><td>${Math.round(w.weight * 100)}%</td><td>${p.applied ? Math.round(p.value * 100) + '점' : '<span class="badge badge-muted">미반영</span>'}</td><td class="small">${esc(p.detail)}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="small muted">미반영 요소는 가짜 수치로 채우지 않고, 반영된 요소의 가중치 합(${Math.round(m.appliedWeight * 100)}%)으로 다시 100% 환산했습니다.</p>
  </details>
  <div class="actions" style="margin-top:10px">
    <button type="button" class="btn btn-primary" data-action="select" data-id="${job.id}" data-testid="select-${job.id}">이 직무로 가려면? (역량 Gap 보기)</button>
  </div>
</article>`;
}

export function view(ctx) {
  const ranked = ctx.rankedJobs();
  const top3 = ranked.slice(0, 3);
  const more = ranked.slice(3, 8);
  const html = `
<h1>전환 가능 직무 TOP 3</h1>
<p class="lead">확정한 역량 ${ctx.state.userSkills.length}개와 희망 조건을 전환직무 사전 ${ranked.length}개와 비교했습니다. 점수가 아니라 <strong>이유</strong>를 먼저 읽어 주세요.</p>
${top3.map((m, i) => jobCard(m, i, ctx)).join('')}
<details class="card soft" style="margin-top:16px"><summary>다른 후보 직무 보기 (4~8위)</summary>
  <div class="table-wrap"><table><thead><tr><th>순위</th><th>직무</th><th>적합도</th><th>이유</th></tr></thead><tbody>
  ${more.map((m, i) => `<tr><td>${i + 4}위</td><td><button type="button" class="btn btn-ghost btn-sm" data-action="select" data-id="${m.job.id}">${esc(m.job.title)}</button></td><td>${m.score}%</td><td class="small">${esc(m.explain.why)}</td></tr>`).join('')}
  </tbody></table></div></details>
<div class="actions">
  <a class="btn btn-outline" href="#/evidence" data-testid="evidence-link">이 추천은 무엇을 근거로 했나요?</a>
  <a class="btn btn-ghost" href="#/skills">역량 다시 고치기</a>
</div>`;
  return {
    title: '전환직무 TOP3 — 다시ON AI',
    html,
    mount(root) {
      root.querySelectorAll('[data-action="select"]').forEach((b) => b.addEventListener('click', () => { ctx.setState({ selectedJob: b.dataset.id }); ctx.navigate(`#/gap/${b.dataset.id}`); }));
    },
  };
}
