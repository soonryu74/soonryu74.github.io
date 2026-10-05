import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CareInput } from '../types';
import { emptyInput } from '../engine/defaults';

/**
 * 입력 상태는 이 브라우저의 localStorage 에만 저장한다(서버 전송 없음).
 */
const KEY = 'caregap.v1';

interface Stored {
  input: CareInput;
  isDemo: boolean;
  savedAt: string;
}

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (!s.input?.profile || !Array.isArray(s.input.schedule)) return null;
    // 이전 버전에 없던 필드 보완
    s.input = { ...emptyInput(), ...s.input, profile: { ...emptyInput().profile, ...s.input.profile }, concerns: { ...emptyInput().concerns, ...s.input.concerns } };
    return s;
  } catch {
    return null;
  }
}

interface Ctx {
  input: CareInput;
  isDemo: boolean;
  hasData: boolean;
  setInput: (fn: (prev: CareInput) => CareInput) => void;
  replace: (input: CareInput, isDemo: boolean) => void;
  clearAll: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(load, []);
  const [input, setInputState] = useState<CareInput>(initial?.input ?? emptyInput());
  const [isDemo, setIsDemo] = useState(initial?.isDemo ?? false);
  const [hasData, setHasData] = useState(!!initial);

  useEffect(() => {
    if (!hasData) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ input, isDemo, savedAt: new Date().toISOString() } satisfies Stored));
    } catch {
      /* 저장 불가(사생활 보호 모드 등) — 화면은 그대로 동작 */
    }
  }, [input, isDemo, hasData]);

  const setInput = useCallback((fn: (prev: CareInput) => CareInput) => {
    setInputState(fn);
    setHasData(true);
  }, []);
  const replace = useCallback((next: CareInput, demo: boolean) => {
    setInputState(next);
    setIsDemo(demo);
    setHasData(true);
  }, []);
  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
    setInputState(emptyInput());
    setIsDemo(false);
    setHasData(false);
  }, []);

  return <StoreCtx.Provider value={{ input, isDemo, hasData, setInput, replace, clearAll }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider 밖에서 사용됨');
  return c;
}
