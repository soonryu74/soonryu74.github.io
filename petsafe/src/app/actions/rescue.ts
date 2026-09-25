"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/session";
import type { FormState } from "@/components/form-message";

const opt = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v), z.string().max(max).nullable());

const watchSchema = z.object({
  sido_code: opt(20), sido_name: opt(30), sigungu_code: opt(20), sigungu_name: opt(30),
  species: z.preprocess((v) => (v === "" ? null : v), z.enum(["dog", "cat", "other"]).nullable()),
  keyword: opt(60),
});

const SPECIES = { dog: "개", cat: "고양이", other: "기타" } as const;

export async function saveRescueWatchAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인하면 조건을 저장할 수 있어요." };
  const p = watchSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: "조건을 확인해 주세요." };
  const d = p.data;
  if (!d.sido_code && !d.species && !d.keyword) return { ok: false, message: "지역·종류·키워드 중 하나 이상을 정해 주세요. 전국 전체는 너무 많아요." };
  const label = [d.sigungu_name ?? d.sido_name, d.species ? SPECIES[d.species] : null, d.keyword].filter(Boolean).join(" · ").slice(0, 40) || "관심 조건";
  try {
    await store.createRescueWatch({ label, ...d });
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  revalidatePath("/lost");
  revalidatePath("/");
  return { ok: true, message: `'${label}' 조건을 저장했어요. 새 공고가 올라오면 홈 화면에 알려드려요.` };
}

export async function deleteRescueWatchAction(id: string) {
  const store = await getStore();
  if (!store.user) return;
  await store.deleteRescueWatch(id);
  revalidatePath("/lost");
  revalidatePath("/");
}

export async function markRescueWatchSeenAction(id: string) {
  const store = await getStore();
  if (!store.user) return;
  await store.markRescueWatchSeen(id);
  revalidatePath("/");
}
