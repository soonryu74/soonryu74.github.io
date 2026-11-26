"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getRepo } from "./repo";
import type { ID, Pet, SessionUser } from "./types";

type SessionState = { user: SessionUser | null; loading: boolean; refresh: () => void };
const SessionContext = createContext<SessionState>({ user: null, loading: true, refresh: () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    getRepo().auth.getUser().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    refresh();
    return getRepo().auth.onChange(refresh);
  }, [refresh]);
  const value = useMemo(() => ({ user, loading, refresh }), [user, loading, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

export type AsyncState<T> = { data: T | undefined; error: Error | null; loading: boolean; reload: () => void };

/** 비동기 조회 훅. deps 가 바뀌면 다시 불러온다. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<{ data: T | undefined; error: Error | null; loading: boolean }>({ data: undefined, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    let alive = true;
    fnRef.current()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error: Error) => alive && setState({ data: undefined, error, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

const CURRENT_PET_KEY = "ps365:current-pet";

/** 내 반려동물 목록과 현재 선택한 아이. 선택값은 이 기기에만 기억한다. */
export function usePets() {
  const { user } = useSession();
  const state = useAsync<Pet[]>(async () => (user ? getRepo().list("pets", { order: { column: "created_at" } }) : []), [user?.id]);
  const [currentId, setCurrentId] = useState<ID | null>(null);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentId(window.localStorage.getItem(CURRENT_PET_KEY));
    } catch {
      /* 저장소를 못 쓰면 첫 번째 아이를 쓴다 */
    }
  }, []);
  const pets = useMemo(() => (state.data ?? []).filter((p) => !p.deleted_at), [state.data]);
  const current = pets.find((p) => p.id === currentId) ?? pets[0] ?? null;
  const select = useCallback((id: ID) => {
    setCurrentId(id);
    try {
      window.localStorage.setItem(CURRENT_PET_KEY, id);
    } catch {
      /* 무시 */
    }
  }, []);
  return { pets, current, select, loading: state.loading, error: state.error, reload: state.reload };
}
