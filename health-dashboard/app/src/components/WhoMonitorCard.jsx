import Cite from "./Cite";

/* WHO 건강 불평등 모니터링 5단계와 이 대시보드의 대응표 + 없는 것(한계).
   계기: 소유자가 WHO 도구 기반 강좌(The GRAPH Courses 「Health Inequality Monitoring 101」)를 보고 반영 여부를 물음(2026-10-16).
   기준 문서는 WHO(2017) 단계별 매뉴얼·HEAT Plus 기술노트 v4.0. ○ = 있음, △ = 일부, ✕ = 없음. */
const ROWS = [
  { step: "① 범위 정하기", what: "무엇을, 어떤 집단 사이의 차이로 볼지 정한다(건강 지표 + 불평등 차원)",
    here: "지표 171개 선택 · 비교 범위(전국 시도 / 전국 조사 단위 258곳 / 시도 내) · 질병대응센터 5권역 · 지역박탈지수 5분위", mark: "○" },
  { step: "② 자료 확보", what: "지표와 불평등 차원을 함께 가진 자료를 찾고 품질을 확인한다",
    here: "자료원 탭(원 출처·갱신 주기·결측), 데이터 전수 검증, 표본오차(95% 신뢰구간·상대표준오차) 표시", mark: "○" },
  { step: "③ 분석 — 단순지표", what: "두 집단의 차이(절대)·비(상대)를 함께",
    here: "지표 분석 「격차 읽기」(최댓값−최솟값 · 상·하위 20% 경계값 · 상·하위 20% 평균 × %p·배), 비교 지역 30곳 이하는 분위 방식 미적용", mark: "○" },
  { step: "③ 분석 — 복합지표", what: "모든 집단을 쓰는 요약지표: 순서 없는 집단(지역)·순서 있는 집단(소득·박탈)",
    here: "지역 간 퍼짐 COV·MDMU·IDISU(「격차 읽기」 아래 연구자용) · 박탈 경사 SII·RII(「건강형평성」 카드) — 모두 비가중", mark: "○" },
  { step: "③ 분석 — 시간 변화", what: "격차가 줄었다면 불리한 쪽이 좋아졌는지 확인",
    here: "연대기 격차 뉴스 4유형(끌어올림·하향 수렴·동반 악화·전체 이동), 분포 요약지표·SII 연도 추이", mark: "○" },
  { step: "④ 보고", what: "집단별 값과 요약값을 함께, 기준·방식·불확실성을 밝혀서",
    here: "「우리 지역 읽기」 5단계 해석 문장, 보고서 3종(지역별·지표별·고령층), 표 서식째 복사", mark: "○" },
  { step: "⑤ 지식 전환", what: "결과를 정책·사업 결정으로 연결",
    here: "우선 검토 항목 → 왜 강조됐나 → 검토해 볼 공중보건 대응(NICE·CPSTF·국가·시도 계획), 예방·관리 탭", mark: "○" },
];
const GAPS = [
  { t: "성별·연령·소득·교육·도시/농촌으로 나눈 비교", why: "공개된 시군구 표(KOSIS)는 대부분 지역 합계만 있어, 시군구 × 성·소득·교육 교차표가 없습니다(성별로 나뉜 지표는 「남자 현재흡연율」 하나). 지역사회건강조사 원시자료를 신청해야 만들 수 있습니다. 이 대시보드의 불평등 차원은 사실상 지역과 지역박탈지수(지역 단위)뿐입니다." },
  { t: "인구 가중 복합지표(BGV·Theil·MLD)", why: "보건소 조사 단위별 인구 자료가 없어 넣지 않았습니다. 그래서 COV·MDMU·IDISU·SII·RII 는 모두 비가중이며, 표본이 작은 지역의 불안정한 값도 같은 비중으로 들어갑니다." },
  { t: "기여 위험(PAR·PAF) — 「격차가 없다면 얼마나 줄었을까」", why: "기준 집단 선택과 해석 문구 검토가 필요해 아직 넣지 않았습니다." },
];

export default function WhoMonitorCard() {
  return (
    <div className="card span2 who-mon">
      <h3>건강 불평등 모니터링 기준(WHO)과 이 대시보드<Cite k={["whomon", "heat"]} /></h3>
      <div className="desc">WHO 단계별 매뉴얼(2017)의 5단계와 HEAT 요약지표를 기준으로, 이 대시보드에 무엇이 있고 무엇이 없는지 정리했습니다. ○ 있음 · △ 일부 · ✕ 없음.</div>
      <div className="tbl-wrap"><table className="gr-tbl">
        <thead><tr><th>단계</th><th>하는 일</th><th>이 대시보드</th><th>상태</th></tr></thead>
        <tbody>{ROWS.map((r) => (
          <tr key={r.step}><th scope="row">{r.step}</th><td className="muted">{r.what}</td><td>{r.here}</td><td className="num"><b>{r.mark}</b></td></tr>))}</tbody>
      </table></div>
      <div className="who-gaps">
        <b>없는 것과 이유</b>
        <ul>{GAPS.map((g) => <li key={g.t}><b>✕ {g.t}</b> — {g.why}</li>)}</ul>
      </div>
      <div className="desc muted">모든 비교는 지역 평균끼리의 비교(생태학적 비교)입니다. 개인의 소득·학력에 따른 건강 차이를 뜻하지 않습니다.</div>
    </div>
  );
}
