"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { isSupabaseConfigured, publicEnv, serverEnv } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { demoUpsertUser } from "@/lib/store/demo";
import { DEMO_COOKIE, getStore, signDemoSession } from "@/lib/session";
import { consentSchema, emailSchema, fieldErrors, formToObject } from "@/lib/validation";
import { safeNext } from "@/lib/guard";
import type { FormState } from "@/components/form-message";

export async function requestLogin(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "입력 내용을 확인해 주세요." };
  const next = safeNext(String(fd.get("next") ?? ""));
  const { email } = parsed.data;

  if (!isSupabaseConfigured()) {
    // 예시 모드: 이메일을 발송하지 않고 예시 계정으로 바로 로그인한다(화면에 명시).
    const user = await demoUpsertUser(email, serverEnv().adminBootstrapEmail);
    const jar = await cookies();
    jar.set(DEMO_COOKIE, signDemoSession(user.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && publicEnv().appUrl.startsWith("https"), path: "/", maxAge: 60 * 60 * 24 * 30 });
    redirect(next);
  }

  const sb = await supabaseServer();
  const origin = publicEnv().appUrl || (await headers()).get("origin") || "";
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
  });
  if (error) return { ok: false, message: `로그인 링크를 보내지 못했어요: ${error.message}` };
  return { ok: true, message: `${email} 로 로그인 링크를 보냈어요. 메일함(스팸함 포함)을 확인해 주세요.` };
}

export async function logout() {
  const store = await getStore();
  await store.audit("auth.logout", "user", store.user?.id ?? null);
  if (isSupabaseConfigured()) {
    const sb = await supabaseServer();
    await sb.auth.signOut();
  }
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  redirect("/");
}

export async function submitConsent(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const parsed = consentSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "필수 항목에 모두 동의해야 이용할 수 있어요." };
  const docs = await store.listLegalDocuments();
  const required = docs.filter((d) => d.required);
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ipHash = ip ? createHash("sha256").update(`petsafe365:${ip}`).digest("hex").slice(0, 32) : null;
  await store.recordConsents(required.map((d) => ({ document_type: d.document_type, document_version: d.version })), ipHash, parsed.data.marketing);
  await store.audit("consent.recorded", "user", store.user.id, { documents: required.map((d) => `${d.document_type}@${d.version}`), marketing: parsed.data.marketing });
  const pets = await store.listPets();
  const next = safeNext(String(fd.get("next") ?? ""));
  redirect(pets.length === 0 ? "/onboarding" : next);
}
