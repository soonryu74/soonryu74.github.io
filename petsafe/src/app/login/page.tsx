import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { getStore } from "@/lib/session";
import { safeNext } from "@/lib/guard";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const store = await getStore();
  if (store.user) redirect(next);
  return (
    <div className="max-w-md mx-auto">
      <h1 className="h1">로그인 · 가입</h1>
      <p className="text-muted mt-1">비밀번호 없이 이메일로 받은 링크를 누르면 들어와요. 처음이면 자동으로 가입됩니다.</p>
      {sp.error && <p role="alert" className="mt-3 rounded-xl p-3 text-sm bg-[#FEF2F2] text-[#7F1D1D]">{sp.error}</p>}
      <LoginForm next={next} demo={!isSupabaseConfigured()} />
      <p className="text-sm text-muted mt-4">긴급 도움, 지도, 신고, 감염병 정보는 로그인 없이 이용할 수 있어요.</p>
    </div>
  );
}
