import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicEnv, serverEnv } from "@/lib/env";

/** 요청 사용자 세션으로 동작하는 클라이언트 (RLS 적용) */
export async function supabaseServer(): Promise<SupabaseClient> {
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  const store = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { for (const c of list) store.set(c.name, c.value, c.options); } catch { /* 서버 컴포넌트에서는 쓰기 불가 — proxy가 갱신 */ }
      },
    },
  });
}

/** 서비스 롤 클라이언트: 탈퇴(auth 사용자 삭제)·관리자 부트스트랩 전용. 키가 없으면 null. */
export function supabaseService(): SupabaseClient | null {
  const { supabaseUrl } = publicEnv();
  const { serviceRoleKey } = serverEnv();
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
