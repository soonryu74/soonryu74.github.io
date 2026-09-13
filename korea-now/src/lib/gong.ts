// 징 소리를 파일 없이 만들어 낸다 (Web Audio).
// 음원 파일을 넣지 않는 이유: 앱 용량이 커지고 오프라인 캐시도 무거워진다.
//
// 징은 배음이 정수배가 아니라(비조화 배음) '댕—' 하고 퍼지는 소리가 난다.
// 그래서 1, 1.73, 2.41, ... 같은 어긋난 비율의 사인파를 겹치고 길게 감쇠시킨다.

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC()
    return ctx
  } catch {
    return null
  }
}

/** 브라우저가 소리를 허용하는 상태인지 (첫 방문에는 대부분 막혀 있다) */
export function canPlaySound(): boolean {
  const a = audio()
  return !!a && a.state === 'running'
}

/** 사용자가 화면을 한 번이라도 누르면 호출 — 이후로는 소리를 낼 수 있다 */
export function unlockSound(): void {
  const a = audio()
  if (a && a.state === 'suspended') void a.resume()
}

/** 징 한 번. 소리가 막혀 있으면 조용히 아무 일도 하지 않는다. */
export function strikeGong(volume = 0.28): void {
  const a = audio()
  if (!a || a.state !== 'running') return

  const t0 = a.currentTime
  const out = a.createGain()
  out.gain.value = volume
  out.connect(a.destination)

  // 징의 어긋난 배음들 — 비율, 세기, 감쇠시간
  const partials: [number, number, number][] = [
    [1.0, 1.0, 3.6],
    [1.73, 0.55, 3.0],
    [2.41, 0.38, 2.4],
    [3.14, 0.24, 1.8],
    [4.27, 0.16, 1.3],
    [5.85, 0.09, 0.9],
  ]
  const base = 138  // 큰 징에 가까운 낮은 기음

  for (const [ratio, amp, decay] of partials) {
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(base * ratio * 1.012, t0)
    // 때린 직후 살짝 음이 내려앉는 금속 특유의 흔들림
    osc.frequency.exponentialRampToValueAtTime(base * ratio, t0 + 0.5)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(amp, t0 + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay)
    osc.connect(g).connect(out)
    osc.start(t0)
    osc.stop(t0 + decay + 0.1)
  }

  // 때리는 순간의 '탁' — 짧은 잡음
  const len = Math.floor(a.sampleRate * 0.05)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const ch = buf.getChannelData(0)
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
  const noise = a.createBufferSource()
  const nf = a.createBiquadFilter()
  nf.type = 'bandpass'
  nf.frequency.value = 1400
  const ng = a.createGain()
  ng.gain.value = 0.35
  noise.buffer = buf
  noise.connect(nf).connect(ng).connect(out)
  noise.start(t0)
}
