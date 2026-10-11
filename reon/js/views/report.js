import { JOB_MAP, FIELDS } from '../../data/jobs.js';
import { SKILL_MAP } from '../../data/skills.js';
import { TRAINING } from '../../data/training.js';
import { esc, badge, modeBadge, LABELS } from '../ui.js';

function nextActions(job, gap, input) {
  const acts = [];
  const missing = gap.requiredQuals.filter((q) => !q.held);
  if (missing.length) acts.push(`<b>${esc(missing[0].label)}</b> 취득 절차를 확인하고 교육기관에 문의하기 (<a href="${missing[0].url}" target="_blank" rel="noopener">공식 안내 ↗</a>)`);
  else if (gap.improve.length) acts.push(`보완 역량 <b>${esc(gap.improve.slice(0, 2).map((s) => s.label).join('·'))}</b> 관련 훈련과정을 고용24 훈련과정 검색에서 찾아 신청하기`);
  else acts.push('고용24 훈련과정 검색에서 직무 적응 교육 1개 신청하기');
  acts.push(`고용24에서 "<b>${esc(job.searchKeyword)}</b>"${input.region?.[0] ? ` + <b>${esc(input.region.filter(Boolean).join(' '))}</b>` : ''}로 실제 채용공고를 검색하고, 이력서의 경력 설명에 이 리포트의 강점 역량 문장을 그대로 쓰기`);
  acts.push('가까운 고용센터(고용복지플러스센터) 또는 중장년내일센터에 이 리포트를 가져가 상담 예약하기');
  return acts;
}

export function view(ctx) {
  const ranked = ctx.rankedJobs();
  const top3 = ranked.slice(0, 3);
  const selId = ctx.state.selectedJob || top3[0].job.id;
  const sel = ranked.find((m) => m.job.id === selId) || top3[0];
  const gap = ctx.gapFor(sel.job.id);
  const input = ctx.state.input;
  const skills = ctx.state.userSkills.map((id) => SKILL_MAP[id].label);
  const trainings = TRAINING.filter((t) => (t.jobs || []).includes(sel.job.id)).slice(0, 3);
  const today = new Date().toISOString().slice(0, 10);
  const html = `
<div class="report-head">
  <div><h1 style="margin-bottom:4px">나의 경력전환 리포트</h1><p class="muted" style="margin:0">작성일 ${today} · ${modeBadge(ctx.state.analysis.mode)}</p></div>
  <div class="actions no-print" style="margin:0"><button type="button" class="btn btn-teal" data-action="print" data-testid="print">인쇄 / PDF 저장</button><a class="btn btn-outline" href="#/evidence">근거 보기</a></div>
</div>

<section class="card">
  <h2 style="margin-top:0">1. 내가 입력한 것</h2>
  <p style="white-space:pre-wrap">${esc(input.text)}</p>
  <div class="meta"><span>희망지역 <b>${esc(input.region.filter(Boolean).join(' ') || '미입력')}</b></span><span>근무형태 <b>${esc(LABELS.workType[input.workType])}</b></span><span>근무시간 <b>${esc(LABELS.hours[input.hours])}</b></span><span>교육 의향 <b>${esc(LABELS.training[input.training])}</b></span></div>
</section>

<section class="card">
  <h2 style="margin-top:0">2. 내 핵심역량 (${skills.length})</h2>
  <div class="tag-list">${skills.map((s) => `<span class="tag ok">${esc(s)}</span>`).join('')}</div>
</section>

<section class="card">
  <h2 style="margin-top:0">3. 추천 직무 TOP 3와 이유</h2>
  <div class="table-wrap"><table><thead><tr><th>순위</th><th>직무</th><th>적합도</th><th>왜 추천했나</th></tr></thead><tbody>
  ${top3.map((m, i) => `<tr><td>${i + 1}위</td><td><b>${esc(m.job.title)}</b><br><span class="small muted">${esc(FIELDS[m.job.field])}</span></td><td>${m.score}%</td><td class="small">${esc(m.explain.why)}</td></tr>`).join('')}
  </tbody></table></div>
</section>

<section class="card">
  <h2 style="margin-top:0">4. 선택한 직무: ${esc(sel.job.title)} — 부족한 역량</h2>
  <div class="grid-3">
    <div><b>✓ 이미 갖춘 것</b><ul>${gap.have.map((s) => `<li>${esc(s.label)}</li>`).join('') || '<li class="muted">없음</li>'}</ul></div>
    <div><b>△ 보완하면 좋은 것</b><ul>${[...gap.improve.map((s) => s.label), ...gap.recommended].map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
    <div><b>자격·교육</b><ul>${gap.requiredQuals.map((q) => `<li>● ${esc(q.label)} ${q.held ? '(보유)' : '(미보유·필수)'}</li>`).join('')}${gap.recommendedQuals.map((q) => `<li>○ ${esc(q.label)} ${q.held ? '(보유)' : '(권장)'}</li>`).join('')}${gap.requiredQuals.length + gap.recommendedQuals.length ? '' : '<li class="muted">법정 필수 자격 없음</li>'}</ul></div>
  </div>
</section>

<section class="card">
  <h2 style="margin-top:0">5. 추천 훈련 ${badge('demo', 'DEMO')}</h2>
  <ul>${trainings.map((t) => `<li>${esc(t.title)} — ${esc(t.institution)}, ${esc(t.region)}, 약 ${t.months}개월, ${esc(t.method)}</li>`).join('') || '<li class="muted">예시 과정 없음</li>'}</ul>
  <p class="small muted">예시 과정입니다. 실제 과정은 고용24 훈련과정 검색에서 확인하세요.</p>
</section>

<section class="card">
  <h2 style="margin-top:0">6. 관련 채용</h2>
  <p>고용24 검색어: <span class="tag">${esc(sel.job.searchKeyword)}</span>${input.region?.[0] ? ` <span class="tag">${esc(input.region.filter(Boolean).join(' '))}</span>` : ''} — <a href="https://www.work24.go.kr" target="_blank" rel="noopener">고용24 ↗</a></p>
  <p class="small muted">이 데모의 채용 목록은 표시 형식 예시(DEMO)이므로 리포트에는 실제 공고를 싣지 않습니다.</p>
</section>

<section class="card next-actions">
  <h2 style="margin-top:0">7. 다음 행동 3가지</h2>
  <ol>${nextActions(sel.job, gap, input).map((a) => `<li>${a}</li>`).join('')}</ol>
</section>

<p class="small muted">이 리포트는 입력한 경험과 공개된 직무·자격 정보를 바탕으로 한 참고 자료이며, 채용 여부를 보장하지 않습니다. 직업전망·임금·지역별 채용 밀도는 데이터 연결 전이라 반영되지 않았습니다.</p>
<div class="actions no-print">
  <a class="btn btn-outline" href="#/jobs">다른 직무로 리포트 만들기</a>
  <button type="button" class="btn btn-ghost right" data-action="clear">내 기록 지우기</button>
</div>`;
  return {
    title: '나의 경력전환 리포트 — 다시ON AI',
    html,
    mount(root) {
      root.querySelector('[data-action="print"]').addEventListener('click', () => window.print());
      root.querySelector('[data-action="clear"]').addEventListener('click', () => ctx.clearAll());
    },
  };
}
