// 방문 기록 — 어느 홍보가 통했는지 알기 위한 최소한의 측정
//
// 원칙
//  · 쿠키를 쓰지 않고 개인을 식별하지 않는다. 그래서 동의 배너가 필요 없다.
//  · 알고 싶은 것은 두 가지뿐이다: 어느 화면을 봤나, 어디서 왔나.
//  · 실패해도 화면에는 아무 영향이 없다.
import { supabase } from './api'

/** 유입처: utm_source가 있으면 그것, 없으면 추천 링크의 호스트. 직접 방문이면 null */
function referrer(): string | null {
  try {
    const utm = new URLSearchParams(window.location.search).get('utm_source')
    if (utm) return utm.slice(0, 60)
    if (!document.referrer) return null
    const host = new URL(document.referrer).hostname
    // 우리 사이트 안에서의 이동은 유입이 아니다
    if (host === window.location.hostname) return null
    return host.replace(/^www\./, '').slice(0, 60)
  } catch {
    return null
  }
}

function platform(): string {
  return window.matchMedia?.('(pointer: coarse)').matches ? 'mobile' : 'desktop'
}

// 같은 화면을 새로고침해도 한 번만 남긴다 (한 세션 기준)
const seen = new Set<string>()

export function trackView(path: string): void {
  if (!supabase) return
  // 추적 거부 설정을 존중한다
  if (navigator.doNotTrack === '1') return
  if (seen.has(path)) return
  seen.add(path)

  void supabase
    .from('page_views')
    .insert({
      path: path.slice(0, 200),
      ref: referrer(),
      lang: navigator.language?.slice(0, 2) ?? null,
      platform: platform(),
    })
    .then(undefined, () => {
      /* 기록 실패는 조용히 넘어간다 */
    })
}
