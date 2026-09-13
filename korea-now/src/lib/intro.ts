// 안내 화면을 봤는지. 기기에 남겨 두어 다시 오더라도 또 보여주지 않는다.
// (시작 화면은 세션마다, 이 안내는 평생 한 번)
const KEY = 'korea-now:intro-seen'

export function shouldShowIntro(): boolean {
  try {
    return localStorage.getItem(KEY) !== '1'
  } catch {
    return false   // 저장을 막아 둔 브라우저에서는 조용히 건너뛴다
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* 무시 */
  }
}
