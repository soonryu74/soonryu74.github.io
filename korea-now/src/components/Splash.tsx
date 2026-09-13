// 시작 화면 — 한옥 문살 문 뒤에서 태극기가 나부끼고, 징이 울리며 문이 좌우로 열린다.
//
// 두 가지 현실적 제약을 반영했다.
//  1) 브라우저는 사용자가 화면을 누르기 전에는 소리를 막는다. 그래서 소리는 '되면 울리고
//     안 되면 조용히 넘어가는' 방식이다. 화면은 소리와 무관하게 항상 나온다.
//  2) 볼 때마다 나오면 성가시다. 한 번 본 뒤에는 그 세션 동안 다시 나오지 않고,
//     아무 곳이나 누르면 즉시 건너뛴다.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Taegukgi from './Taegukgi'
import { strikeGong, unlockSound } from '../lib/gong'

const SEEN_KEY = 'korea-now:splash-seen'
export const SPLASH_MS = 2400

// 깃면을 세로로 몇 조각 내어 나부끼게 할지. 많을수록 부드럽지만 그릴 것이 늘어난다.
const STRIPS = 26

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
        {/* 깃대에 매단 것이 아니라 허공에서 나부끼는 천처럼 보여야 한다.
            한 장을 통째로 돌리면 한쪽 끝이 고정된 것처럼 보이므로,
            세로로 잘라 각 조각이 조금씩 늦게 움직이게 한다. 그러면 주름이 왼쪽에서
            오른쪽으로 흘러간다. 밝기도 같이 흔들어 접힌 면의 명암을 만든다. */}
        {Array.from({ length: STRIPS }, (_, i) => (
          <div key={i} className="flag-strip" style={{ '--i': i } as CSSProperties}>
            <Taegukgi className="flag-svg" />
          </div>
        ))}
      </div>
      <div className="splash-skip">tap to skip</div>
    </div>
  )
}
