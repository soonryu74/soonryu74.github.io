import { JOB_MAP } from '../../data/jobs.js';
import { SKILL_MAP } from '../../data/skills.js';
import { loadTraining } from '../adapters/work24.js';
import { esc, sourceBadge } from '../ui.js';

export function view(ctx) {
  const job = JOB_MAP[ctx.params.jobId];
  if (!job) return { title: '직무 없음', html: '<a class="btn btn-outline" href="#/jobs">직무 목록으로</a>', mount() {} };
  const gap = ctx.gapFor(job.id);
  const needSkills = new Set(gap.improve.map((s) => s.id));
  const needQuals = new Set([...gap.requiredQuals, ...gap.recommendedQuals].filter((q) => !q.held).map((q) => q.id));
  const region = (ctx.state.input.region || [])[0] || '';
  const html = `
<h1>이 역량을 이렇게 채울 수 있습니다</h1>
<p class="lead"><b>${esc(job.title)}</b>에 부족한 역량·자격과 관련된 교육훈련입니다.</p>
<div id="training-source"></div>
<div id="training-list" aria-live="polite"><div class="loading"><div class="spinner"></div><p>훈련 정보를 불러오는 중…</p></div></div>
<div class="actions">
  <a class="btn btn-primary btn-lg" href="#/openings/${job.id}" data-testid="to-openings">지금 지원할 수 있는 일자리 보기</a>
  <a class="btn btn-ghost" href="#/gap/${job.id}">Gap 분석으로</a>
</div>`;
  return {
    title: `교육훈련 · ${job.title} — 다시ON AI`,
    html,
    async mount(root) {
      const { source, items } = await loadTraining();
      const srcEl = root.querySelector('#training-source');
      const listEl = root.querySelector('#training-list');
      if (!srcEl.isConnected) return;
      srcEl.innerHTML = source.mode === 'live'
        ? `<div class="notice notice-info">${sourceBadge(source)} ${esc(source.note)} · 출처: 고용24 OPEN API 훈련과정</div>`
        : `<div class="notice notice-demo" data-testid="training-demo-notice">${sourceBadge(source)} <strong>아래 과정은 실제 개설 과정이 아닙니다.</strong> ${esc(source.note)}. 실제 과정은 <a href="${source.official.url}" target="_blank" rel="noopener">${esc(source.official.label)} ↗</a>에서 확인하세요.</div>`;
      const scored = items.map((t) => {
        let s = 0;
        if ((t.jobs || []).includes(job.id)) s += 3;
        if (t.qual && needQuals.has(t.qual)) s += 4;
        s += (t.skills || []).filter((id) => needSkills.has(id)).length;
        if (region && t.region && (t.region.startsWith(region.slice(0, 2)) || /전국|온라인/.test(t.region))) s += 0.5;
        return { t, s };
      }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5);
      listEl.innerHTML = scored.length ? scored.map(({ t }) => `
<article class="item-card" data-testid="training-item">
  <h4>${esc(t.title)} ${source.mode === 'live' ? '' : '<span class="badge badge-demo">DEMO</span>'}${t.qual && needQuals.has(t.qual) ? ' <span class="badge badge-warn">필요 자격 과정</span>' : ''}</h4>
  <div class="meta"><span>기관 <b>${esc(t.institution)}</b></span><span>지역 <b>${esc(t.region)}</b></span><span>교육기간 <b>약 ${esc(t.months)}개월</b></span><span>교육방식 <b>${esc(t.method)}</b></span></div>
  <div class="tag-list" style="margin-top:8px">${(t.skills || []).map((id) => `<span class="tag ${needSkills.has(id) ? 'gap' : ''}">${esc(SKILL_MAP[id]?.label || id)}</span>`).join('')}</div>
  ${t.url ? `<a class="small" href="${t.url}" target="_blank" rel="noopener">과정 원문 보기 ↗</a>` : '<span class="small muted">원문 링크 없음(DEMO)</span>'}
</article>`).join('') : '<div class="notice notice-info">이 직무에 맞는 예시 과정이 없습니다. 공식 검색 링크를 이용해 주세요.</div>';
      listEl.insertAdjacentHTML('beforeend', `<p class="small muted">관련 역량 중 <span class="tag gap" style="font-size:.8rem">주황</span>은 Gap 분석에서 보완 항목으로 표시된 역량입니다. 국민내일배움카드 적용 여부는 고용24에서 과정별로 확인하세요.</p>`);
    },
  };
}
