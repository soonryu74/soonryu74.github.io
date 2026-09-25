import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, serverEnv } from "@/lib/env";
import { supabaseServer, supabaseService } from "@/lib/supabase/server";
import { safeNext } from "@/lib/guard";

// 매직링크 → 세션 교환 (PKCE code). 관리자 부트스트랩 이메일이면 서비스 키로 역할 부여.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  if (!isSupabaseConfigured()) return NextResponse.redirect(new URL("/login", url.origin));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const sb = await supabaseServer();
  let error: { message: string } | null = null;
  if (code) ({ error } = await sb.auth.exchangeCodeForSession(code));
  else if (tokenHash) ({ error } = await sb.auth.verifyOtp({ type: "email", token_hash: tokenHash }));
  else error = { message: "missing code" };
  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("링크가 만료되었거나 이미 사용됐어요. 다시 요청해 주세요.")}`, url.origin));

  const { data } = await sb.auth.getUser();
  const admin = serverEnv().adminBootstrapEmail;
  if (data.user && admin && data.user.email?.toLowerCase() === admin) {
    const service = supabaseService();
    if (service) {
      await service.from("profiles").update({ role: "admin" }).eq("user_id", data.user.id);
      await service.from("audit_logs").insert({ actor_id: data.user.id, actor_role: "system", action: "admin.bootstrap", entity_type: "user", entity_id: data.user.id });
    }
  }
  if (data.user) await sb.from("audit_logs").insert({ actor_id: data.user.id, actor_role: "guardian", action: "auth.login", entity_type: "user", entity_id: data.user.id });
  return NextResponse.redirect(new URL(`/consent?next=${encodeURIComponent(next)}`, url.origin));
}
