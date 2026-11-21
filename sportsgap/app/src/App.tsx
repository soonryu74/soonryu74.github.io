import { useEffect, useRef } from 'react';
import { useRoute } from './router';
import { IS_DEMO } from './data';
import Home from './components/Home';
import Finder from './components/Finder';
import GapMapPage from './components/GapMapPage';
import About from './components/About';

export default function App() {
  const route = useRoute();
  const mainRef = useRef<HTMLElement>(null);

  // 화면이 바뀌면 본문 제목으로 초점 이동(화면낭독기 사용자 배려)
  useEffect(() => {
    window.scrollTo(0, 0);
    const h = mainRef.current?.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }, [route.name]);

  const nav = [
    { href: '#/find', label: '운동할 곳 찾기', active: route.name === 'find' },
    { href: '#/map', label: '격차 지도', active: route.name === 'map' },
    { href: '#/about', label: '데이터·계산법', active: route.name === 'about' },
  ];

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.querySelector('h1')?.focus(); }}>본문 바로가기</a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#/" aria-label="SportsGap AI 처음으로">
            <span className="brand-mark" aria-hidden="true" />
            <span>SportsGap <b>AI</b></span>
          </a>
          <nav className="topnav" aria-label="주요 화면">
            {nav.map((n) => <a key={n.href} href={n.href} aria-current={n.active ? 'page' : undefined}>{n.label}</a>)}
          </nav>
        </div>
        {IS_DEMO && (
          <div className="demo-banner" role="note">
            <span className="tag">DEMO DATA</span> 지금 보이는 시설·인구 숫자는 <b>화면 확인용 예시값</b>입니다. 공공데이터를 넣으면 실제 값으로 바뀝니다.
          </div>
        )}
      </header>
      <main id="main" ref={mainRef} className="main">
        {route.name === 'home' && <Home />}
        {route.name === 'find' && <Finder />}
        {route.name === 'map' && <GapMapPage region={route.region} />}
        {route.name === 'about' && <About />}
      </main>
      <footer className="footer">
        <p>SportsGap AI는 경기도 공공체육시설·인구 공공데이터로 <b>생활체육 접근성</b>을 비교하는 참고 도구입니다. 시설 운영 시간·프로그램은 방문 전 시설에 꼭 확인하세요.</p>
        <p>입력한 내용은 이 기기 밖으로 보내지 않습니다. · <a href="#/about">데이터 출처·계산법·한계</a></p>
      </footer>
    </>
  );
}
