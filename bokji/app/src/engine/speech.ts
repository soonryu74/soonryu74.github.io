/** 브라우저 음성 읽기(TTS)·음성 입력(STT). 외부 서버 없음. */

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function speak(text: string, rate = 0.9): boolean {
  if (!ttsSupported()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = rate;
  const ko = synth.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('ko'));
  if (ko) u.voice = ko;
  synth.speak(u);
  return true;
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

type SR = { lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean; start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error?: string }) => void) | null };
type SRCtor = new () => SR;

function getSR(): SRCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function sttSupported(): boolean {
  return getSR() != null;
}

export interface Listener { stop(): void }

export function startListening(onResult: (text: string, final: boolean) => void, onEnd: (err?: string) => void): Listener | null {
  const Ctor = getSR();
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = 'ko-KR';
  r.interimResults = true;
  r.maxAlternatives = 1;
  r.continuous = false;
  r.onresult = (e) => {
    let text = '';
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      const res = e.results[i] as ArrayLike<{ transcript: string }> & { isFinal?: boolean };
      text += res[0].transcript;
      if (res.isFinal) final = true;
    }
    onResult(text, final);
  };
  r.onerror = (e) => onEnd(e.error || 'error');
  r.onend = () => onEnd();
  try { r.start(); } catch { return null; }
  return { stop: () => { try { r.stop(); } catch { /* noop */ } } };
}
