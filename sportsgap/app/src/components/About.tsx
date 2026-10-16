import { DATA, IS_DEMO } from '../data';
import { W } from '../engine/score';

export default function About() {
  return (
    <article className="prose">
      <h1>데이터 · 계산법 · 한계</h1>
      <h2>쓰는 데이터</h2>
      {IS_DEMO ? (
        <p><b>지금은 예시(DEMO) 데이터입니다.</b> 시설 이름·위치·인구는 화면 확인용 가상값이에요. 아래 공공데이터를 넣으면 실제 값으로 바뀝니다.</p>
      ) : (
        <p>기준: {DATA.asOf}</p>
      )}
      <ul>
        {(DATA.sources ?? [
          { name: '경기도 공공체육시설 현황(위치·시설 정보)', org: '경기도 · 경기데이터드림', url: 'https://data.gg.go.kr' },
          { name: '주민등록 연령별 인구(시군별 65세 이상)', org: '행정안전부', url: 'https://jumin.mois.go.kr' },
          { name: '시군별 등록장애인 현황', org: '경기도 · 경기데이터드림', url: 'https://data.gg.go.kr' },
          { name: '생활체육 프로그램·스포츠강좌이용권 시설', org: '국민체육진흥공단 · 공공데이터포털', url: 'https://www.data.go.kr' },
        ]).map((s) => <li key={s.name}>{s.name} — {s.org} (<a href={s.url} target="_blank" rel="noreferrer">{s.url.replace('https://', '')}</a>)</li>)}
      </ul>
      <h2>접근성 지수 계산법</h2>
      <ol>
        <li>시설 점수: 시설 1곳 {W.base}점, 무장애(배리어프리) +{W.barrierFree}점, 어르신 프로그램 +{W.senior}점, 장애인 프로그램 +{W.disabledProg}점</li>
        <li>대상 인구: 65세 이상 인구 + 등록장애인 수</li>
        <li>시군별 “대상 인구 1만 명당 시설 점수”를 경기도 전체 값으로 나눠 100을 곱합니다. <b>100 = 경기도 평균</b></li>
        <li>등급: 60 미만 매우 부족 · 60~84 부족 · 85~114 보통 · 115~149 양호 · 150 이상 충분</li>
      </ol>
      <h2>한계 (솔직하게)</h2>
      <ul>
        <li>65세 이상과 등록장애인은 일부 겹칩니다. 그래서 절대 숫자가 아니라 <b>시군끼리 비교</b>하는 용도로만 씁니다.</li>
        <li>시설 수만 셉니다. 실제 이동 거리·대중교통·운영 시간은 다음 단계에서 반영할 예정입니다.</li>
        <li>“말로 찾기”는 정해 둔 낱말 규칙으로 조건을 뽑습니다. 입력한 문장은 외부로 보내지 않습니다.</li>
        <li>시설 정보는 바뀔 수 있으니 방문 전에 시설에 확인해 주세요.</li>
      </ul>
    </article>
  );
}
