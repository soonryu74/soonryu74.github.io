// 시작 화면 — 한옥 문살 문 뒤에서 태극기가 나부끼고, 징이 울리며 문이 좌우로 열린다.
//
// 두 가지 현실적 제약을 반영했다.
//  1) 브라우저는 사용자가 화면을 누르기 전에는 소리를 막는다. 그래서 소리는 '되면 울리고
//     안 되면 조용히 넘어가는' 방식이다. 화면은 소리와 무관하게 항상 나온다.
//  2) 볼 때마다 나오면 성가시다. 한 번 본 뒤에는 그 세션 동안 다시 나오지 않고,
//     아무 곳이나 누르면 즉시 건너뛴다.
import { useCallback, useEffect, useRef, useState } from 'react'
import Taegukgi from './Taegukgi'
import { strikeGong, unlockSound } from '../lib/gong'

const SEEN_KEY = 'korea-now:splash-seen'
export const SPLASH_MS = 2400

/** 이번에 시작 화면을 보여줄지 */
export function shouldShowSplash(): boolean {
  try {
    // 화면 움직임을 줄이도록 설정한 사람에게는 보여주지 않는다
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
    return sessionStorage.getItem(SEEN_KEY) !== '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* 무시 */
  }
}

export default function Splash({ onDone }: { onDone: () => void }) {
  const [closing, setClosing] = useState(false)
  const done = useRef(false)

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    markSeen()
    onDone()
  }, [onDone])

  useEffect(() => {
    const gong = setTimeout(() => strikeGong(), 340)
    const open = setTimeout(() => setClosing(true), 1500)   // 문 열리기 시작
    const end = setTimeout(finish, SPLASH_MS)
    return () => {
      clearTimeout(gong)
      clearTimeout(open)
      clearTimeout(end)
    }
  }, [finish])

  // 누르면 건너뛰되, 그 터치로 소리를 열어 둔다 (다음 실행부터는 징이 울린다)
  const skip = () => {
    unlockSound()
    finish()
  }

  return (
    <div
      className={'splash' + (closing ? ' open' : '')}
      onPointerDown={skip}
      role="presentation"
      aria-hidden="true"
    >
      <div className="splash-door left" />
      <div className="splash-door right" />
      <div className="splash-glow" />
      <div className="splash-vignette" />
      <div className="splash-flag">
        <Taegukgi className="flag-svg" />
        <div className="flag-sheen" />
      </div>
      <div className="splash-skip">tap to skip</div>
    </div>
  )
}
