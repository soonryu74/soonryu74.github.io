// 경보음·진동. 브라우저는 사용자가 한 번 눌러야 소리를 낼 수 있어서,
// 고지문 동의 버튼을 누를 때 unlock()을 함께 부른다.
// 웹은 폰 음량을 바꿀 수 없다. 음량은 사용자가 직접 올려야 한다.
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function beep(freq: number, ms: number) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.value = 1;
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + ms / 1000);
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* 진동 미지원 기기 */
  }
}

export function unlock() {
  getCtx();
}

export function startAlarm() {
  if (timer) return;
  let high = true;
  const pulse = () => {
    beep(high ? 988 : 740, 350);
    vibrate(350);
    high = !high;
  };
  pulse();
  timer = setInterval(pulse, 500);
}

export function stopAlarm() {
  if (timer) clearInterval(timer);
  timer = null;
  vibrate(0);
}

export function testAlarm() {
  beep(988, 350);
  setTimeout(() => beep(740, 350), 500);
  vibrate([350, 150, 350]);
}
