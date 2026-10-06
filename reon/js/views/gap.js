import { JOB_MAP, FIELDS } from '../../data/jobs.js';
import { esc, badge } from '../ui.js';

export function view(ctx) {
  const job = JOB_MAP[ctx.params.jobId];
  if (!job) return { title: '직무 없음', html: '<div class="notice notice-danger">알 수 없는 직무입니다.</div><a class="btn btn-outline" href="#/jobs">직무 목록으로</a>', mount() {} };
  ctx.setState({ selectedJob: job.id });
  const gap = ctx.gapFor(job.id);
  const html = `
<p>${badge('field', FIELDS[job.field])}</p>
<h1>${esc(job.title)}, 이 직업으로 가려면 무엇이 부족할까요?</h1>
<p class="lead">${esc(job.summary)}</p>
${gap.blocked ? '<div class="notice notice-warn"><strong>먼저 확인할 것</strong> 이 직무는 법령·채용요건상 필수 자격이 있습니다. 아래 "필요한 자격·교육"의 ● 항목을 먼저 채워야 지원이 가능합니다.</div>' : '<div class="notice notice-info">이 직무는 법정 필수 자격이 없거나 이미 보유하고 있습니다. 보완 항목은 지원과 병행해 채울 수 있습니다.</div>'}
<div class="grid-3">
  <section class="card gap-col have" data-testid="gap-have"><h3 style="margin-top:0"><span style="color:var(--ok)">✓</span> 이미 갖춘 것 (${gap.have.length})</h3>
    <ul>${gap.have.map((s) => `<li><span class="mark">✓</span><span>${esc(s.label)} <span class="muted small">${s.type === 'core' ? '핵심' : '보조'}</span></span></li>`).join('') || '<li class="muted">아직 겹치는 역량이 없습니다</li>'}</ul></section>
  <section class="card gap-col improve" data-testid="gap-improve"><h3 style="margin-top:0"><span style="color:var(--warn)">△</span> 보완하면 좋은 것 (${gap.improve.length})</h3>
    <ul>${gap.improve.map((s) => `<li><span class="mark">△</span><span>${esc(s.label)} <span class="muted small">${s.type === 'core' ? '핵심' : '보조'}</span></span></li>`).join('') || '<li class="muted">보완할 핵심 역량이 없습니다</li>'}
    ${gap.recommended.map((r) => `<li><span class="mark">△</span><span>${esc(r)} <span class="muted small">권장 학습</span></span></li>`).join('')}</ul></section>
  <section class="card gap-col quals" data-testid="gap-quals"><h3 style="margin-top:0">필요한 자격·교육</h3>
    <p class="small muted" style="margin-top:0">● 필수(법령·채용요건) / ○ 권장(우대)</p>
    <ul>
    ${gap.requiredQuals.map((q) => `<li><span class="mark">●</span><span><b>${esc(q.label)}</b> ${q.held ? badge('ok', '보유') : badge('warn', '미보유')}<br><span class="small muted">${esc(q.note)}</span><br><a class="small" href="${q.url}" target="_blank" rel="noopener">자격 안내(공식) ↗</a></span></li>`).join('')}
    ${gap.recommendedQuals.map((q) => `<li><span class="mark rec">○</span><span><b>${esc(q.label)}</b> ${q.held ? badge('ok', '보유') : badge('muted', '권장')}<br><span class="small muted">${esc(q.note)}</span><br><a class="small" href="${q.url}" target="_blank" rel="noopener">자격 안내(공식) ↗</a></span></li>`).join('')}
    ${gap.requiredQuals.length + gap.recommendedQuals.length === 0 ? '<li class="muted">법정 필수·권장 자격 없음</li>' : ''}
    </ul></section>
</div>
<p class="small muted">직무 요건 출처: ${job.sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(' · ')} (확인일 2026-10-06). 직업전망·임금은 고용24 직업정보 상세 연결 예정이라 표시하지 않습니다.</p>
<div class="actions">
  <a class="btn btn-primary btn-lg" href="#/training/${job.id}" data-testid="to-training">이 역량을 이렇게 채울 수 있습니다 → 훈련 보기</a>
  <a class="btn btn-ghost" href="#/jobs">다른 직무 보기</a>
</div>`;
  return { title: `역량 Gap · ${job.title} — 다시ON AI`, html, mount() {} };
}
