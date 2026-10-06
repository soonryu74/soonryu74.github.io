import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EMPTY_ANSWERS, type Answers, type Interpretation, type Recommendation, type ActionItem } from '../types';
import { buildTags } from '../engine/facts';
import { recommend } from '../engine/recommend';
import { buildPlan } from '../engine/plan';

export type FontScale = 'normal' | 'large' | 'xlarge';
export interface Settings { fontScale: FontScale; highContrast: boolean; ttsRate: number; autoRead: boolean }
const DEFAULT_SETTINGS: Settings = { fontScale: 'normal', highContrast: false, ttsRate: 0.9, autoRead: false };

/** 세션 상태: 이 탭을 닫으면 사라진다(sessionStorage). 이름·연락처·소득액 등 식별 정보는 애초에 받지 않는다. */
interface Session { text: string; interp: Interpretation | null; answers: Answers; done: string[] }
const SESSION_KEY = 'modu-bokji.session.v1';
const SETTINGS_KEY = 'modu-bokji.settings.v1';

function loadSession(): Session {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Session>;
      return { text: s.text ?? '', interp: s.interp ?? null, answers: { ...EMPTY_ANSWERS, ...(s.answers ?? {}) }, done: s.done ?? [] };
    }
  } catch { /* ignore */ }
  return { text: '', interp: null, answers: EMPTY_ANSWERS, done: [] };
}
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

interface Store {
  text: string; setText(t: string): void;
  interp: Interpretation | null; setInterp(i: Interpretation | null): void;
  answers: Answers; setAnswers(a: Answers): void; patchAnswers(p: Partial<Answers>): void;
  done: string[]; toggleDone(key: string): void;
  reset(): void;
  settings: Settings; setSettings(p: Partial<Settings>): void;
  rec: Recommendation; plan: ActionItem[];
  hasInput: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(loadSession);
  const [settings, setSettingsState] = useState<Settings>(loadSettings);

  useEffect(() => { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ } }, [session]);
  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
    const root = document.documentElement;
    root.dataset.font = settings.fontScale;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
  }, [settings]);

  const tags = useMemo(() => buildTags(session.answers, session.interp), [session.answers, session.interp]);
  const rec = useMemo(() => recommend(session.answers, tags), [session.answers, tags]);
  const plan = useMemo(() => buildPlan(rec), [rec]);

  const setText = useCallback((text: string) => setSession((s) => ({ ...s, text })), []);
  const setInterp = useCallback((interp: Interpretation | null) => setSession((s) => ({ ...s, interp })), []);
  const setAnswers = useCallback((answers: Answers) => setSession((s) => ({ ...s, answers })), []);
  const patchAnswers = useCallback((p: Partial<Answers>) => setSession((s) => ({ ...s, answers: { ...s.answers, ...p } })), []);
  const toggleDone = useCallback((key: string) => setSession((s) => ({ ...s, done: s.done.includes(key) ? s.done.filter((k) => k !== key) : [...s.done, key] })), []);
  const reset = useCallback(() => {
    setSession({ text: '', interp: null, answers: EMPTY_ANSWERS, done: [] });
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, []);
  const setSettings = useCallback((p: Partial<Settings>) => setSettingsState((s) => ({ ...s, ...p })), []);

  const hasInput = session.text.trim().length > 0 || Object.values(session.answers).some((v) => v != null);

  const value: Store = {
    text: session.text, setText, interp: session.interp, setInterp, answers: session.answers, setAnswers, patchAnswers,
    done: session.done, toggleDone, reset, settings, setSettings, rec, plan, hasInput,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
}
