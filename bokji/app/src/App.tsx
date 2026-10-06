import { useEffect, useRef } from 'react';
import { useRoute } from './state/router';
import { useStore } from './state/store';
import Home from './components/Home';
import Questions from './components/Questions';
import Results from './components/Results';
import ServiceDetail from './components/ServiceDetail';
import TodayPlan from './components/TodayPlan';
import Settings from './components/Settings';
import About from './components/About';
import Emergency from './components/Emergency';
import { SafetyNotice } from './components/shared';

export default function App() {
  const route = useRoute();
  const { hasInput } = useStore();
  const mainRef = useRef<HTMLElement>(null);

  // 화면이 바뀌면 제목으로 초점 이동(화면낭독기·키보드 사용자)
  useEffect(() => {
    const h = mainRef.current?.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }, [route]);

  const nav = [
    { href: '#/result', label: '확인할 지원', show: hasInput, active: route.name === 'result' || route.name === 'service' },
    { href: '#/today', label: '오늘 할 일', show: hasInput, active: route.name === 'today' },
    { href: '#/emergency', label: '급할 때', show: true, active: route.name === 'emergency' },
    { href: '#/settings', label: '글자·소리', show: true, active: route.name === 'settings' },
  ];

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.querySelector('h1')?.focus(); }}>본문 바로가기</a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#/" aria-label="모두의 복지 AI 처음 화면으로">
            <span className="brand-mark" aria-hidden="true">✓</span>
            <span>모두의 복지 <b>AI</b></span>
          </a>
          <nav className="topnav" aria-label="주요 화면">
            {nav.filter((n) => n.show).map((n) => (
              <a key={n.href} href={n.href} aria-current={n.active ? 'page' : undefined}>{n.label}</a>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" ref={mainRef} className={`main ${route.name === 'home' ? 'main-home' : ''}`}>
        {route.name === 'home' && <Home />}
        {route.name === 'start' && <Questions step={route.step} />}
        {route.name === 'result' && <Results />}
        {route.name === 'service' && <ServiceDetail id={route.id} />}
        {route.name === 'today' && <TodayPlan />}
        {route.name === 'settings' && <Settings />}
        {route.name === 'about' && <About />}
        {route.name === 'emergency' && <Emergency />}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <SafetyNotice compact />
          <p className="small muted">
            입력한 내용은 이 기기의 브라우저에만 잠시 머물고 서버로 보내지 않습니다. 이름·주민번호·소득액은 묻지 않습니다. ·{' '}
            <a href="#/about">출처·한계·개인정보</a> · <a href="#/emergency">급할 때 연락처</a>
          </p>
        </div>
      </footer>
    </>
  );
}
