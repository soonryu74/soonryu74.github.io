import { useCallback, useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { trackView } from './lib/track'
import Splash, { shouldShowSplash } from './components/Splash'
import { AppProvider } from './lib/state'
import NowPage from './pages/NowPage'
import SpotPage from './pages/SpotPage'
import TodayPage from './pages/TodayPage'
import StampsPage from './pages/StampsPage'
import NearbyPage from './pages/NearbyPage'
import IntroPage from './pages/IntroPage'
import { shouldShowIntro } from './lib/intro'

// 화면을 옮길 때마다 방문을 남긴다 (쿠키 없음, 개인 식별 없음)
function BottomNav() {
  // 안내 화면에서는 숨긴다. 거기서 나가는 길은 Skip 과 Start 두 개로 충분하다.
  if (useLocation().pathname === '/intro') return null
  return (
    <nav className="bottom-nav">
      <div className="inner">
        <NavLink to="/" end><span className="ic">🗺️</span>Home</NavLink>
        <NavLink to="/nearby"><span className="ic">📍</span>Nearby</NavLink>
        <NavLink to="/today"><span className="ic">🇰🇷</span>Today</NavLink>
        <NavLink to="/stamps"><span className="ic">🎫</span>Stamps</NavLink>
      </div>
    </nav>
  )
}

function TrackRoutes() {
  const { pathname } = useLocation()
  useEffect(() => {
    trackView(pathname)
  }, [pathname])
  return null
}

// 첫 방문이면 안내로, 아니면 홈으로.
//
// 이 판단을 <Route element={...}> 자리에 삼항연산자로 적으면 안 된다.
// Routes 의 children JSX 는 App 이 다시 렌더될 때만 새로 만들어지는데, 화면을 옮겨도
// App 은 다시 렌더되지 않는다. 그래서 안내를 끝내고 홈으로 가도 '안내로 보내라'는
// 낡은 element 가 그대로 남아 곧바로 안내로 되튕긴다.
// 컴포넌트로 감싸면 경로가 맞을 때마다 새로 렌더되어 그때의 값을 읽는다.
function HomeOrIntro() {
  return shouldShowIntro() ? <Navigate to="/intro" replace /> : <NowPage />
}

// 스팟 사이를 이동할 때 상태(스탬프 등)가 섞이지 않도록 id별로 새로 마운트
function SpotRoute() {
  const { id = '' } = useParams()
  return <SpotPage key={id} />
}

export default function App() {
  const [splash, setSplash] = useState(shouldShowSplash)
  const hideSplash = useCallback(() => setSplash(false), [])

  return (
    <AppProvider>
      {splash && <Splash onDone={hideSplash} />}
      <TrackRoutes />
      <div className="app">
        <Routes>
          <Route path="/" element={<HomeOrIntro />} />
          <Route path="/intro" element={<IntroPage />} />
          <Route path="/spot/:id" element={<SpotRoute />} />
          <Route path="/nearby" element={<NearbyPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/stamps" element={<StampsPage />} />
        </Routes>
        <BottomNav />
      </div>
    </AppProvider>
  )
}
