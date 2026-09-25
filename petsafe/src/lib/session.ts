// 세션·저장소 진입점. 모든 서버 코드는 getStore()로 데이터에 접근한다.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isSupabaseConfigured, serverEnv } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { createSupabaseStore } from "@/lib/store/supabase";
import { createDemoStore, demoGetUser } from "@/lib/store/demo";
import type { Store } from "@/lib/store/types";
import type { SessionUser, UserRole } from "@/lib/types";

export const DEMO_COOKIE = "ps_demo_session";

function demoSecret(): string {
  const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), serverEnv().demoDir);
  const f = path.join(dir, "secret");
  mkdirSync(dir, { recursive: true });
  if (!existsSync(f)) writeFileSync(f, randomBytes(32).toString("hex"), { mode: 0o600 });
  return readFileSync(f, "utf8").trim();
}

export function signDemoSession(userId: string): string {
  const mac = createHmac("sha256", demoSecret()).update(userId).digest("hex");
  return `${userId}.${mac}`;
}

function verifyDemoSession(value: string | undefined): string | null {
  if (!value) return null;
  const [id, mac] = value.split(".");
  if (!id || !mac) return null;
  const expected = createHmac("sha256", demoSecret()).update(id).digest("hex");
  return expected === mac ? id : null;
}

/** 요청당 1회: 현재 사용자와 저장소 */
export const getStore = cache(async (): Promise<Store> => {
  if (isSupabaseConfigured()) {
    const sb = await supabaseServer();
    const { data } = await sb.auth.getUser();
    let user: SessionUser | null = null;
    if (data.user) {
      const { data: prof } = await sb.from("profiles").select("role").eq("user_id", data.user.id).maybeSingle();
      user = { id: data.user.id, email: data.user.email ?? "", role: ((prof?.role as UserRole) ?? "guardian") };
    }
    return createSupabaseStore(sb, user);
  }
  const jar = await cookies();
  const id = verifyDemoSession(jar.get(DEMO_COOKIE)?.value);
  const user = id ? await demoGetUser(id) : null;
  return createDemoStore(user);
});

export async function getUser(): Promise<SessionUser | null> {
  return (await getStore()).user;
}

export const ACTIVE_PET_COOKIE = "ps_active_pet";
