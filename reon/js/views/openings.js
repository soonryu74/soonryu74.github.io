import { JOB_MAP } from '../../data/jobs.js';
import { loadOpenings } from '../adapters/work24.js';
import { esc, sourceBadge, dateAfter } from '../ui.js';

export function view(ctx) {
  const job = JOB_MAP[ctx.params.jobId];
  if (!job) return { title: '직무 없음', html: '<a class="btn btn-outline" href="#/jobs">직무 목록으로</a>', mount() {} };
  const region = (ctx.state.input.region || []).filter(Boolean).join(' ');
  const html = `
<h1>지금 지원할 수 있는 일자리</h1>
<p class="lead"><b>${esc(job.title)}</b> 관련 채용정보입니다.${region ? ` 희망지역 <b>${esc(region)}</b>은 공식 검색 조건으로 사용합니다.` : ''}</p>
<div id="openings-source"></div>
<div id="openings-list" aria-live="polite"><div class="loading"><div class="spinner"></div><p>채용 정보를 불러오는 중…</p></div></div>
<section class="card soft">
  <h3 style="margin-top:0">실제 공고 찾기(공식)</h3>
  <p>고용24에서 아래 검색어로 찾으면 현재 모집 중인 실제 공고를 볼 수 있습니다.</p>
  <div class="tag-list"><span class="tag">${esc(job.searchKeyword)}</span>${region ? `<span class="tag">${esc(region)}</span>` : ''}</div>
  <div class="actions" style="margin-top:10px"><a class="btn btn-teal" href="https://www.work24.go.kr" target="_blank" rel="noopener" data-testid="official-search">고용24에서 채용정보 검색 ↗</a></div>
</section>
<div class="actions">
  <a class="btn btn-primary btn-lg" href="#/report" data-testid="to-report">나의 경력전환 리포트 보기</a>
  <a class="btn btn-ghost" href="#/training/${job.id}">훈련으로</a>
</div>`;
  return {
    title: `채용정보 · ${job.title} — 다시ON AI`,
    html,
    async mount(root) {
      const { source, items } = await loadOpenings();
      const srcEl = root.querySelector('#openings-source');
      const listEl = root.querySelector('#openings-list');
      if (!srcEl.isConnected) return;
      srcEl.innerHTML = source.mode === 'live'
        ? `<div class="notice notice-info">${sourceBadge(source)} ${esc(source.note)} · 출처: 고용24 OPEN API 채용정보</div>`
        : `<div class="notice notice-demo" data-testid="openings-demo-notice">${sourceBadge(source)} <strong>아래는 실제 채용공고가 아니라 표시 형식 예시입니다.</strong> 회사명·임금·마감일은 가상이며 지원할 수 없습니다. 실제 공고는 아래 공식 검색을 이용하세요.</div>`;
      const list = items.filter((o) => o.jobId === job.id);
      listEl.innerHTML = list.length ? list.map((o) => `
<article class="item-card" data-testid="opening-item">
  <h4>${esc(o.title)} ${o.demo ? '<span class="badge badge-demo">DEMO · 실제 공고 아님</span>' : ''}</h4>
  <div class="meta"><span>회사/기관 <b>${esc(o.company)}</b></span><span>지역 <b>${esc(o.region)}</b></span><span>근무형태 <b>${esc(o.empType)}</b></span><span>임금 <b>${esc(o.sal)}</b></span><span>마감일 <b>${typeof o.closeDt === 'number' ? dateAfter(o.closeDt) + ' (예시)' : esc(o.closeDt)}</b></span></div>
  <div style="margin-top:8px">${o.url ? `<a class="btn btn-outline btn-sm" href="${o.url}" target="_blank" rel="noopener">원문 확인 ↗</a>` : '<span class="small muted">원문 확인: 없음(DEMO 예시라 원문이 존재하지 않습니다)</span>'}</div>
</article>`).join('') : '<div class="notice notice-info">이 직무의 예시 공고가 없습니다. 공식 검색을 이용해 주세요.</div>';
    },
  };
}
