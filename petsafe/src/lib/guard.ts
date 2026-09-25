import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_PET_COOKIE, getStore } from "@/lib/session";
import type { Store } from "@/lib/store/types";
import type { LegalDocumentRow, Pet, SessionUser } from "@/lib/types";

export async function missingConsents(store: Store): Promise<LegalDocumentRow[]> {
  const [docs, consents] = await Promise.all([store.listLegalDocuments(), store.listConsents()]);
  return docs.filter((d) => d.required && !consents.some((c) => c.document_type === d.document_type && c.document_version === d.version && !c.withdrawn_at));
}

/** 보호자 화면 진입: 비로그인 → null(화면에서 로그인 안내), 동의 미완료 → /consent 로 이동 */
export async function requireMember(next: string): Promise<{ store: Store; user: SessionUser } | null> {
  const store = await getStore();
  if (!store.user) return null;
  if ((await missingConsents(store)).length > 0) redirect(`/consent?next=${encodeURIComponent(next)}`);
  return { store, user: store.user };
}

export async function requireStaff(kind: "reviewer" | "admin"): Promise<{ store: Store; user: SessionUser } | "anon" | "forbidden"> {
  const store = await getStore();
  if (!store.user) return "anon";
  const ok = kind === "admin" ? store.user.role === "admin" : store.user.role === "admin" || store.user.role === "reviewer";
  return ok ? { store, user: store.user } : "forbidden";
}

/** 돌봄 대상(떠나보내지 않은 아이)만 전환·오늘 할 일에 쓴다. 떠나보낸 아이는 memorial 로 따로 준다. */
export async function getActivePet(store: Store, preferId?: string | null): Promise<{ pets: Pet[]; active: Pet | null; memorial: Pet[] }> {
  const all = await store.listPets();
  const pets = all.filter((p) => !p.passed_at);
  const memorial = all.filter((p) => !!p.passed_at);
  const jar = await cookies();
  const want = preferId || jar.get(ACTIVE_PET_COOKIE)?.value;
  const active = pets.find((p) => p.id === want) ?? pets[0] ?? null;
  return { pets, active, memorial };
}

export function safeNext(next: string | null | undefined, fallback = "/today"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
