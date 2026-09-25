"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/session";
import { kstDate } from "@/lib/dates";
import type { FormState } from "@/components/form-message";

export async function markPassedAction(petId: string, _: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const date = String(fd.get("passed_at") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > kstDate()) return { ok: false, errors: { passed_at: "날짜를 확인해 주세요. 오늘 이후 날짜는 넣을 수 없어요." } };
  const pet = await store.getPet(petId);
  if (!pet || pet.owner_id !== store.user.id) return { ok: false, message: "권한이 없어요." };
  if (pet.birth_date && date < pet.birth_date) return { ok: false, errors: { passed_at: "생일보다 앞선 날짜예요." } };
  await store.setPetPassed(petId, date);
  await store.audit("pet.memorialized", "pet", petId);
  revalidatePath("/", "layout");
  redirect(`/pets/${petId}/memorial`);
}

export async function undoPassedAction(petId: string) {
  const store = await getStore();
  if (!store.user) return;
  await store.setPetPassed(petId, null);
  await store.audit("pet.memorial_undone", "pet", petId);
  revalidatePath("/", "layout");
  redirect(`/pets/${petId}`);
}

export async function toggleRemindersAction(petId: string, on: boolean) {
  const store = await getStore();
  if (!store.user) return;
  await store.setMemorialReminders(petId, on);
  revalidatePath(`/pets/${petId}/memorial`);
  revalidatePath("/");
}

const letterSchema = z.object({ body: z.string().trim().min(1, "하고 싶은 말을 적어 주세요.").max(2000, "2000자 이내로 적어 주세요.") });

export async function addLetterAction(petId: string, _: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const p = letterSchema.safeParse({ body: fd.get("body") });
  if (!p.success) return { ok: false, errors: { body: p.error.issues[0].message } };
  if (!(await store.getPet(petId))) return { ok: false, message: "권한이 없어요." };
  await store.addLetter(petId, p.data.body);
  revalidatePath(`/pets/${petId}/memorial`);
  return { ok: true, message: "편지를 남겼어요. 나만 볼 수 있어요." };
}

export async function deleteLetterAction(petId: string, id: string) {
  const store = await getStore();
  if (!store.user) return;
  await store.deleteLetter(petId, id);
  revalidatePath(`/pets/${petId}/memorial`);
}
