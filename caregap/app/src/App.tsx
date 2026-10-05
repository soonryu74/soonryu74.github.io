import { useEffect, useRef } from 'react';
import { useRoute } from './state/router';
import { useStore } from './state/store';
import Home from './components/Home';
import Onboarding from './components/Onboarding';
import CareMapPage from './components/CareMapPage';
import Results from './components/Results';
import Services from './components/Services';
import Share from './components/Share';
import About from './components/About';

export default function App() {
  const route = useRoute();
  const { isDemo, hasData } = useStore();
  const mainRef = useRef<HTMLElement>(null);

  // 화면이 바뀌면 본문 제목으로 초점 이동(화면낭독기 사용자 배려)
  useEffect(() => {
    const h = mainRef.current?.querySelector('h1');
    if (h) {
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }
  }, [route]);

  const nav = [
    { href: '#/start/1', label: '입력', active: route.name === 'start' },
    { href: '#/map', label: 'Care Map', active: route.name === 'map' },
    { href: '#/result', label: '결과', active: route.name === 'result' },
    { href: '#/services', label: '서비스', active: route.name === 'services' },
  ];

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.querySelector('h1')?.focus(); }}>본문 바로가기</a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#/" aria-label="CareGap AI 처음으로">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-text">CareGap <b>AI</b></span>
          </a>
          {hasData && (
            <nav className="topnav" aria-label="주요 화면">
              {nav.map((n) => (
                <a key={n.href} href={n.href} aria-current={n.active ? 'page' : undefined}>{n.label}</a>
              ))}
            </nav>
          )}
        </div>
        {isDemo && route.name !== 'home' && (
          <div className="demo-banner" role="note">
            <span className="tag tag-demo">DEMO DATA</span> <b>예시 체험 중</b> · 가상의 82세 어르신 사례입니다. 실제 정보로 바꾸려면 <a href="#/start/1">입력 화면</a>에서 수정하세요.
          </div>
        )}
      </header>

      <main id="main" ref={mainRef} className={route.name === 'home' ? 'main main-home' : 'main'}>
        {route.name === 'home' && <Home />}
        {route.name === 'start' && <Onboarding step={route.step} />}
        {route.name === 'map' && <CareMapPage />}
        {route.name === 'result' && <Results />}
        {route.name === 'services' && <Services domainId={route.domain} />}
        {route.name === 'share' && <Share />}
        {route.name === 'about' && <About />}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <p>
            CareGap AI는 의료 진단·장기요양등급 판정·질병 예측을 하지 않습니다. 입력한 내용과 등록된 일정을 바탕으로
            <b> 확인이 필요한 돌봄 영역</b>을 정리해 드리는 참고 도구입니다. 응급상황에는 <b>119</b>로 연락하세요.
          </p>
          <p>
            입력 정보는 이 기기의 브라우저에만 저장되며 서버로 전송되지 않습니다. ·{' '}
            <a href="#/about">데이터 출처·개인정보·한계</a>
          </p>
        </div>
      </footer>
    </>
  );
}
