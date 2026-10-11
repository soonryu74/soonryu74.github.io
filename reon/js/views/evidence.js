import { JOB_MAP } from '../../data/jobs.js';
import { buildEvidence } from '../engine/explanationGenerator.js';
import { WEIGHTS } from '../engine/jobMatcher.js';
import { esc, modeBadge, LABELS } from '../ui.js';
import { QUAL_MAP, SKILL_MAP } from '../../data/skills.js';

const SOURCES = [
  ['사용자 입력', '이 브라우저(sessionStorage)', '서버 전송·저장 없음'],
  ['역량 사전 40개', 'reon/data/skills.js (수기 정리)', '키워드 규칙으로 추출, AI 서버 연결 시 대체'],
  ['전환직무 사전 18개', 'reon/data/jobs.js (수기 정리, 직무별 공식 출처 링크)', '핵심·보조 역량, 필수·권장 자격, 근무 패턴'],
  ['자격 요건', '큐넷·한국사회복지사협회·국시원·아이돌봄서비스 등 공식 사이트', '확인일 2026-10-06'],
  ['직무별 법령·공고 근거', '노인복지법·산업안전보건법 시행령·경비업법·도로교통법 조문, 수행기관 채용공고 (reon/data/evidence.js)', '각 직무 Gap 화면과 근거·한계 페이지에 표시'],
  ['정책 근거', '고용노동부 해커톤 보도자료(2026.9.21), 중장년 취업지원사업, 고령자고용법 제21조의3', '근거·한계 페이지'],
  ['직업전망·임금', '고용24 직업정보 상세 (연결 예정)', '현재 데모 미반영'],
  ['교육훈련', '고용24 OPEN API 훈련과정 (연결 예정) · 현재 DEMO', 'DEMO 표기'],
  ['채용정보', '고용24 OPEN API 채용정보 (연결 예정) · 현재 DEMO', 'DEMO 표기, 공식 검색 링크 제공'],
];

export function view(ctx) {
  const ranked = ctx.rankedJobs();
  const ev = buildEvidence(ctx.state, JOB_MAP, ranked);
  const html = `
<h1>이 추천은 무엇을 근거로 했나요?</h1>
<p class="lead">다시ON AI는 결과만 주지 않습니다. 입력 → 추출 → 비교 → 조건 → 출처를 그대로 공개합니다.</p>
<div class="evidence">
<section class="card"><h2 style="margin-top:0">1. 사용자 입력</h2>
  <pre data-testid="ev-input">${esc(ev.input.text)}</pre>
  <div class="table-wrap"><table><tbody>
    <tr><td>희망지역</td><td>${esc(ev.input.region || '미입력')}</td></tr>
    <tr><td>근무형태 / 시간</td><td>${esc(LABELS.workType[ev.input.workType])} / ${esc(LABELS.hours[ev.input.hours])}</td></tr>
    <tr><td>희망임금</td><td>${esc(LABELS.wage[ev.input.wage])} <span class="badge badge-muted">점수 미반영</span></td></tr>
    <tr><td>자격</td><td>${ev.input.quals.map((q) => esc(QUAL_MAP[q]?.label || q)).join(', ') || '없음'}</td></tr>
    <tr><td>교육 의향</td><td>${esc(LABELS.training[ev.input.training])}</td></tr>
  </tbody></table></div></section>

<section class="card"><h2 style="margin-top:0">2. 추출된 역량 ${modeBadge(ev.analysisMode)}</h2>
  <div class="table-wrap"><table data-testid="ev-skills"><thead><tr><th>역량</th><th>근거(원문 조각 / 선택 자격)</th><th>상태</th></tr></thead><tbody>
  ${ev.extracted.map((s) => `<tr><td>${esc(s.label)}</td><td class="small">${esc(s.evidence.join(' / '))}</td><td>${ev.userEdited.includes(s.id) ? '<span class="badge badge-ok">사용</span>' : '<span class="badge badge-muted">사용자가 삭제</span>'}</td></tr>`).join('')}
  ${ev.userEdited.filter((id) => !ev.extracted.some((s) => s.id === id)).map((id) => `<tr><td>${esc(SKILL_MAP[id]?.label || id)}</td><td class="small">사용자가 직접 추가</td><td><span class="badge badge-ok">사용</span></td></tr>`).join('')}
  </tbody></table></div></section>

<section class="card"><h2 style="margin-top:0">3. 비교한 직무와 점수 구성</h2>
  <p class="small muted">가중치: ${WEIGHTS.map((w) => `${w.label} ${Math.round(w.weight * 100)}%`).join(' · ')}. 미반영 요소는 적용 가중치 합으로 재정규화.</p>
  <div class="table-wrap"><table data-testid="ev-compare"><thead><tr><th>직무</th><th>적합도</th><th>전이역량</th><th>희망조건</th><th>진입장벽</th><th>전망</th><th>접근성</th></tr></thead><tbody>
  ${ev.compared.map((c) => `<tr><td>${esc(c.title)}</td><td><b>${c.score}%</b></td><td>${Math.round(c.parts.transfer.value * 100)}</td><td>${Math.round(c.parts.prefs.value * 100)}</td><td>${Math.round(c.parts.barrier.value * 100)}</td><td class="muted">미반영</td><td class="muted">미반영</td></tr>`).join('')}
  </tbody></table></div></section>

<section class="card"><h2 style="margin-top:0">4. 데이터 출처와 연결 상태</h2>
  <div class="table-wrap"><table><thead><tr><th>데이터</th><th>출처</th><th>상태</th></tr></thead><tbody>
  ${SOURCES.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>
  <p class="small muted">자세한 조사 내용: <code>reon/DATA_SOURCES.md</code></p></section>
</div>
<div class="actions"><a class="btn btn-outline" href="#/jobs">직무 TOP3로</a><a class="btn btn-ghost" href="#/report">리포트로</a></div>`;
  return { title: '추천 근거 — 다시ON AI', html, mount() {} };
}
