import { useEffect, useState } from 'react';
import catalog from '../data/services_catalog.json';
import rules from '../data/care_gap_rules.json';
import { loadRegions } from '../adapters/publicData';
import { useStore } from '../state/store';
import { go } from '../state/router';

export default function About() {
  const { clearAll, hasData } = useStore();
  const [meta, setMeta] = useState<{ count: number; builtAt: string; evalYears: [number, number] | null } | null>(null);
  const [cleared, setCleared] = useState(false);
  useEffect(() => {
    loadRegions().then((r) => setMeta(r)).catch(() => setMeta(null));
  }, []);

  return (
    <div className="page narrow prose">
      <h1 className="page-title">데이터 출처 · 개인정보 · 한계</h1>

      <h2>데이터 출처</h2>
      <table className="src-table">
        <thead><tr><th>데이터</th><th>상태</th><th>출처·기준</th></tr></thead>
        <tbody>
          <tr>
            <td>장기요양기관 목록(기관명·급여종류·시군구·평가등급)</td>
            <td><span className="tag tag-real">VERIFIED PUBLIC DATA</span></td>
            <td>
              <a href="https://www.data.go.kr/data/15104801/fileData.do" target="_blank" rel="noopener noreferrer">국민건강보험공단_장기요양기관 평가결과</a> (공공데이터포털)
              {meta && <> · {meta.count.toLocaleString()}곳 · {meta.evalYears?.join('~')}년 평가 · 정리일 {meta.builtAt}</>}
              <br />주소·전화번호는 원자료에 없어 표시하지 않습니다.
            </td>
          </tr>
          <tr>
            <td>치매안심센터 · 보건소</td>
            <td><span className="tag tag-pending">SOURCE NOT YET CONNECTED</span></td>
            <td>공공데이터포털 표준데이터 수집 스크립트 준비됨(인증키 필요). 연결 전까지 공식 누리집으로 안내합니다.</td>
          </tr>
          <tr>
            <td>공공·지역 돌봄서비스 안내</td>
            <td><span className="tag tag-curated">안내 정보(수기 정리·공식 링크)</span></td>
            <td>각 기관 공식 누리집 링크 · 확인일 {catalog.checkedAt}. API 데이터가 아닙니다.</td>
          </tr>
          <tr>
            <td>예시 체험 사례(82세 어르신)</td>
            <td><span className="tag tag-demo">DEMO DATA</span></td>
            <td>가상의 사례입니다. 실제 인물이 아닙니다.</td>
          </tr>
        </tbody>
      </table>

      <h2>Care Gap은 어떻게 찾나요?</h2>
      <p>
        AI가 판단하지 않습니다. 공개된 규칙 파일(<code>care_gap_rules.json</code>, 버전 {rules.version})에 정해진 {rules.rules.length}개 규칙(각 규칙에 ID·버전·근거 기재)이
        ‘입력한 걱정’과 ‘등록된 일정으로 계산한 시간’을 조합해 11개 영역을 점검합니다. 결과마다 “왜 이 결과가 나왔나요?”에서 근거를 볼 수 있습니다.
      </p>
      <p>
        저녁·야간은 {rules.windows.night.start}–{rules.windows.night.end}, 낮은 {rules.windows.day.start}–{rules.windows.day.end}로 계산합니다.
        방문요양·방문간호·주야간보호·가족·병원동행 등 ‘사람이 함께하는 일정’만 곁에 계신 시간으로 셉니다.
      </p>

      <h2>개인정보</h2>
      <ul>
        <li>이름·주민등록번호·생년월일·건강보험번호·장기요양인정번호·진료기록을 받지 않습니다.</li>
        <li>연령·시군구·체크 항목·일정은 <b>이 기기의 브라우저(localStorage)에만</b> 저장되며 서버로 전송되지 않습니다.</li>
        <li>‘말로 설명하기’는 기본적으로 브라우저 안에서 분석합니다. 별도 AI 서버가 설정된 경우에만 화면에 그 사실을 알리고 문장을 보냅니다.</li>
        <li>공유 카드는 사용자가 직접 복사·저장할 때만 만들어지며, 연령대·지역은 기본 제외입니다.</li>
      </ul>
      {hasData ? (
        <button type="button" className="btn btn-outline" onClick={() => { clearAll(); setCleared(true); }}>이 기기에 저장된 입력 모두 지우기</button>
      ) : (
        <p className="muted">이 기기에 저장된 입력이 없습니다.</p>
      )}
      {cleared && <p className="ok-text" role="status">모두 지웠습니다. <button type="button" className="link" onClick={() => go('')}>처음으로</button></p>}

      <h2>한계</h2>
      <ul>
        <li>입력한 일정만 근거로 합니다. 입력하지 않은 돌봄(이웃의 안부 등)은 반영되지 않습니다.</li>
        <li>진단·낙상 예측·치매 판정·장기요양등급 판정을 하지 않으며 의료서비스를 추천하지 않습니다.</li>
        <li>기준 시간(야간 18–09시 등)과 가족 돌봄 부담 기준(주 20시간·가족만 돌보는 날 3일)은 설계값입니다.</li>
        <li>서비스 대상·자격은 지역·시점에 따라 다르므로 공식 창구에서 확인해야 합니다.</li>
        <li>CareGap은 정부·공공기관의 공식 서비스가 아니며, 기관과 제휴·인증 관계가 없습니다.</li>
      </ul>
    </div>
  );
}
