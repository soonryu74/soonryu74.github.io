import { JOBS } from '../../data/jobs.js';
import { JOB_EVIDENCE, POLICY_EVIDENCE, GRADE_LABEL } from '../../data/evidence.js';
import { esc, badge } from '../ui.js';

const g = (grade) => badge(grade === 'law' ? 'ok' : grade === 'official' ? 'ai' : 'muted', GRADE_LABEL[grade]);

export function view() {
  const counts = Object.values(JOB_EVIDENCE).flat().reduce((a, e) => { a[e.grade] = (a[e.grade] || 0) + 1; return a; }, {});
  const html = `
<h1>근거와 한계</h1>
<p class="lead">다시ON AI가 무엇을 근거로 추천하는지, 무엇이 아직 연결되지 않았는지를 숨기지 않고 적습니다. (확인일 2026-10-06)</p>

<section class="card">
  <h2 style="margin-top:0">1. 왜 필요한가 — 정책 근거</h2>
  <ul style="padding-left:18px">${POLICY_EVIDENCE.map((e) => `<li style="margin:8px 0">${g(e.grade)} ${esc(e.claim)} <span class="small muted">— ${esc(e.source)}</span> <a class="small" href="${e.url}" target="_blank" rel="noopener">↗</a></li>`).join('')}</ul>
  <p class="small muted">2차 출처는 고용노동부 발표를 요약한 매체 기사입니다. 수치는 발표 시점 기준이며 제도 개편에 따라 바뀔 수 있습니다.</p>
</section>

<section class="card">
  <h2 style="margin-top:0">2. 추천이 근거한 것</h2>
  <div class="table-wrap"><table><thead><tr><th>요소</th><th>근거</th><th>성격</th></tr></thead><tbody>
    <tr><td>역량 추출</td><td>역량 40개 사전(키워드 규칙). 각 역량에 원문 근거 문장 표시</td><td>수기 정리 · AI 서버 연결 시 대체</td></tr>
    <tr><td>전환직무 ${JOBS.length}개</td><td>직무별 핵심·보조 역량, 근무 패턴, 진입장벽을 수기로 정리</td><td>수기 정리(공식 분류 아님)</td></tr>
    <tr><td>직무 요건</td><td>법령 ${counts.law || 0}건 · 공식 안내 ${counts.official || 0}건 · 채용공고 ${counts.posting || 0}건 · 2차 출처 ${counts.secondary || 0}건 — 각 직무의 Gap 화면 "이 직무 요건의 근거"에서 확인</td><td>법령은 국가법령정보센터 원문 확인 권장</td></tr>
    <tr><td>필수/권장 자격</td><td>법령·채용공고에 따라 ● 필수 / ○ 권장 구분. 필수 미보유 시 AI가 적합 판정을 대신하지 않고 경고</td><td>—</td></tr>
    <tr><td>적합도 점수</td><td>전이역량 40 · 희망조건 20 · 진입장벽 15 (반영) / 전망 15 · 접근성 10 (미반영, 재정규화)</td><td>가중치는 기획 단계 설정값</td></tr>
  </tbody></table></div>
</section>

<section class="card">
  <h2 style="margin-top:0">3. 아직 연결되지 않은 것</h2>
  <ul style="padding-left:18px">
    <li><b>고용24 직업정보·직업정보 상세</b> — 직무 사전이 수기 정리입니다. OPEN-API 키 발급 후 직업코드·능력·지식·전망·임금을 연결합니다.</li>
    <li><b>고용24 채용정보·훈련과정</b> — 화면의 목록은 ${badge('demo', 'DEMO')} 표시된 형식 예시입니다. 수집 스크립트와 캐시 구조는 준비되어 있고, 키가 들어오면 자동으로 "고용24 수집 데이터"로 바뀝니다.</li>
    <li><b>원격 AI 분석</b> — 현재는 규칙 기반 DEMO 분석기입니다. 서버 주소를 설정하면 같은 화면이 AI 결과로 바뀌고 배지가 변경됩니다.</li>
    <li><b>지역별 채용 밀도·임금 데이터</b> — 희망지역·희망임금은 점수에 반영하지 않고 검색 조건으로만 씁니다.</li>
  </ul>
</section>

<section class="card">
  <h2 style="margin-top:0">4. 지키는 원칙</h2>
  <ul style="padding-left:18px">
    <li>존재하지 않는 API·통계·채용공고를 만들어 보여주지 않습니다.</li>
    <li>AI는 제안만 하고, 역량의 최종 결정은 사용자가 합니다.</li>
    <li>입력은 이 브라우저에만 저장되고 서버로 보내지 않습니다.</li>
    <li>자세한 조사 기록: <code>reon/DATA_SOURCES.md</code></li>
  </ul>
</section>
<div class="actions"><a class="btn btn-primary" href="#/input">3분 만에 내 다음 직업 찾기</a><a class="btn btn-ghost" href="#/">홈으로</a></div>`;
  return { title: '근거와 한계 — 다시ON AI', html, mount() {} };
}
