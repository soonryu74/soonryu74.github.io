"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { DEMO_COOKIE, getStore } from "@/lib/session";
import type { FormState } from "@/components/form-message";

export async function deleteAccountAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  if (String(fd.get("confirm") ?? "").trim() !== "탈퇴합니다") return { ok: false, errors: { confirm: "‘탈퇴합니다’를 정확히 입력해 주세요." } };
  let result: "deleted" | "requested";
  try {
    result = await store.deleteMyAccount();
  } catch (e) {
    return { ok: false, message: `탈퇴를 처리하지 못했어요: ${(e as Error).message}` };
  }
  if (isSupabaseConfigured()) { const sb = await supabaseServer(); await sb.auth.signOut(); }
  (await cookies()).delete(DEMO_COOKIE);
  redirect(`/?account=${result}`);
}
