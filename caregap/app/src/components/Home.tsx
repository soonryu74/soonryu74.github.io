import { demoInput } from '../engine/defaults';
import { go } from '../state/router';
import { useStore } from '../state/store';

export default function Home() {
  const { replace, hasData, isDemo } = useStore();

  const startDemo = () => {
    replace(demoInput(), true);
    go('result');
  };

  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">CareGap AI · 케어갭</p>
        <h1>
          부모님의 돌봄,
          <br />
          <span className="accent">비어 있는 시간</span>은 없을까요?
        </h1>
        <p className="lead">
          현재 받고 있는 돌봄을 알려주시면
          <br className="br-sm" /> 확인이 필요한 돌봄 영역을 함께 찾아드립니다.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary btn-lg" href="#/start/1">돌봄 공백 확인하기</a>
          <button type="button" className="btn btn-ghost btn-lg" onClick={startDemo}>예시로 체험하기</button>
        </div>
        {hasData && !isDemo && (
          <p className="resume">
            이전에 입력한 내용이 이 기기에 있습니다. <a href="#/result">결과 이어보기</a>
          </p>
        )}
        <p className="hero-note">약 3분 · 이름·주민번호는 묻지 않습니다 · 입력 내용은 이 기기에만 저장</p>
      </section>

      <section className="steps" aria-labelledby="how">
        <h2 id="how" className="section-title">이렇게 진행됩니다</h2>
        <ol className="step-list">
          <li><span className="num">1</span><div><b>현재 돌봄 입력</b><p>부모님 상황과 요일별 돌봄 일정을 적어요.</p></div></li>
          <li><span className="num">2</span><div><b>Care Map 생성</b><p>일주일 24시간 중 누가 언제 곁에 있는지 한눈에 봐요.</p></div></li>
          <li><span className="num">3</span><div><b>확인 필요한 영역 발견</b><p>식사·복약·야간 안전 등 11개 영역을 규칙으로 점검해요.</p></div></li>
          <li><span className="num">4</span><div><b>관련 서비스 찾기</b><p>공공·지역 돌봄서비스와 우리 동네 기관을 연결해요.</p></div></li>
        </ol>
      </section>

      <section className="why" aria-labelledby="why">
        <h2 id="why" className="section-title">기관 검색이 아니라, 빈 시간을 먼저 봅니다</h2>
        <div className="why-grid">
          <div className="why-card">
            <h3>🕰️ 168시간 지도</h3>
            <p>주 3회 방문요양이 있어도 나머지 159시간은 어떻게 지내시는지, 시간 단위로 보여드려요.</p>
          </div>
          <div className="why-card">
            <h3>🧭 기능별 점검</h3>
            <p>“돌봄을 받고 있다”가 아니라 식사·복약·밤 시간처럼 어떤 기능이 비어 있는지 나눠 봅니다.</p>
          </div>
          <div className="why-card">
            <h3>🔍 이유가 보이는 결과</h3>
            <p>모든 결과에 “왜 이 결과가 나왔나요?”가 있어요. 입력 → 규칙 → 결과를 그대로 보여드립니다.</p>
          </div>
        </div>
        <p className="disclaimer-inline">
          CareGap은 진단·등급 판정·질병 예측을 하지 않습니다. 가족이 확인해 볼 질문과 이용 가능한 서비스를 찾도록 돕습니다.
        </p>
      </section>
    </div>
  );
}
