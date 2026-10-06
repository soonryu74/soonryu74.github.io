import { SERVICES } from '../engine/recommend';
import { remoteAiAvailable } from '../adapters/ai';
import { SafetyNotice } from './shared';

const VERIFY_LABEL = { 'search-index': '검색 색인에서 공식 주소 확인', direct: '직접 접속 확인', unverified: '미확인' } as const;

export default function About() {
  return (
    <div className="page narrow">
      <p className="eyebrow">출처 · 한계 · 개인정보</p>
      <h1 className="page-title">이 서비스가 하는 일과 하지 않는 일</h1>

      <section className="card">
        <h2 className="h3">하는 일</h2>
        <ul>
          <li>말씀하신 상황을 ‘혼자 지내심’, ‘병원 가기 어려움’ 같은 항목으로 정리합니다.</li>
          <li>공식 제도 목록({SERVICES.length}개, 화이트리스트)에서만 먼저 확인할 지원을 고릅니다.</li>
          <li>어려운 제도 설명을 쉬운 말로 바꾸고, 어디에 전화할지·무엇을 준비할지·오늘 할 일을 순서대로 보여 줍니다.</li>
        </ul>
        <h2 className="h3">하지 않는 일</h2>
        <ul>
          <li>수급자격을 확정하지 않습니다. “먼저 확인해 보세요 / 조건 확인이 필요합니다 / 현재 정보만으로 판단하기 어렵습니다”로만 말합니다.</li>
          <li>의료 진단, 소득·재산 자동 판정을 하지 않습니다.</li>
          <li>목록에 없는 제도·전화번호·주소를 만들어내지 않습니다. 확인되지 않은 링크는 ‘공식 링크 확인 중’으로 표시합니다.</li>
        </ul>
        <SafetyNotice />
      </section>

      <section className="card">
        <h2 className="h3">AI는 어디에 쓰이나요?</h2>
        <p>구조는 <b>공식 데이터 → 규칙 필터 → 쉬운 설명 → 공식 원문 링크</b>입니다. 자연어 해석은 기본적으로 브라우저 안의 키워드 규칙으로 돌아가고(외부 전송 없음), 운영자가 AI 서버를 연결하면 그 결과를 쓰되 정해진 항목 밖의 값은 버립니다. 지금 이 화면: <b>{remoteAiAvailable() ? 'AI 서버 연결됨' : '브라우저 안 규칙만 사용(AI 서버 미연결)'}</b>.</p>
      </section>

      <section className="card">
        <h2 className="h3">개인정보</h2>
        <ul>
          <li>이름·주민번호·연락처·소득액·재산은 묻지 않습니다.</li>
          <li>입력한 문장과 답변은 이 탭의 브라우저 안(sessionStorage)에만 잠시 머물고, 탭을 닫으면 지워집니다. 서버로 보내지 않습니다.</li>
          <li>글자 크기·고대비 설정만 이 기기에 저장됩니다.</li>
          <li>‘가족에게 보내기’ 글에는 제도 이름·전화번호·할 일만 담기고 개인정보는 들어가지 않습니다.</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="h3">데이터 출처와 확인일</h2>
        <p className="small muted">제도 기준과 금액은 해마다 바뀝니다. 아래 확인일 이후 달라졌을 수 있으니 공식 사이트에서 다시 확인하세요.</p>
        <div className="table-wrap">
          <table className="src-table">
            <thead><tr><th>제도</th><th>담당</th><th>공식 링크</th><th>확인일</th></tr></thead>
            <tbody>
              {SERVICES.map((s) => (
                <tr key={s.id}>
                  <td><a href={`#/service/${s.id}`}>{s.name}</a></td>
                  <td>{s.source_org}</td>
                  <td>{s.official_url ? <a href={s.official_url} target="_blank" rel="noopener noreferrer">{s.official_url_label ?? '공식 사이트'} ↗</a> : <span className="pending-link">공식 링크 확인 중</span>}</td>
                  <td>{s.verified_at}<br /><span className="small muted">{VERIFY_LABEL[s.verification]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="h3">한계</h2>
        <ul>
          <li>지역(시·군·구)마다 다른 지원(교통비, 지역 돌봄 등)은 아직 담지 않았습니다. 정부24 혜택알리미와 행정복지센터에서 추가로 확인하세요.</li>
          <li>외국어·수어·그림(Easy Read) 안내는 다음 단계입니다.</li>
          <li>자연어 해석은 키워드 규칙이라 표현이 낯설면 놓칠 수 있어요. 그래서 질문 화면에서 항상 다시 확인합니다.</li>
        </ul>
      </section>
      <p><a className="btn btn-ghost" href="#/">← 처음으로</a></p>
    </div>
  );
}
