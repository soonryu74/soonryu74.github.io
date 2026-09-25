"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ACTIVE_PET_COOKIE, getStore } from "@/lib/session";
import { conditionSchema, fieldErrors, formToObject, petSchema, type ConditionInput } from "@/lib/validation";
import { generateInitialTasks } from "@/lib/rules";
import { CARE_TASK_TEMPLATES } from "@/content/care-task-templates";
import { safeNext } from "@/lib/guard";
import type { FormState } from "@/components/form-message";

function splitList(v: FormDataEntryValue | null): string[] {
  return String(v ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
}

async function setActive(petId: string) {
  (await cookies()).set(ACTIVE_PET_COOKIE, petId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function createPetAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const parsed = petSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "입력 내용을 확인해 주세요." };
  const conditions: ConditionInput[] = [
    ...splitList(fd.get("diseases")).map((name) => ({ type: "disease" as const, name, note: null })),
    ...splitList(fd.get("allergies")).map((name) => ({ type: "allergy" as const, name, note: null })),
  ].filter((c) => conditionSchema.safeParse(c).success);
  const pet = await store.createPet(parsed.data, conditions);
  await store.createTasks(pet.id, generateInitialTasks(pet, CARE_TASK_TEMPLATES));
  await store.audit("pet.created", "pet", pet.id, { species: pet.species });
  await setActive(pet.id);
  revalidatePath("/", "layout");
  redirect("/today?welcome=1");
}

export async function updatePetAction(petId: string, _: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const parsed = petSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "입력 내용을 확인해 주세요." };
  try {
    await store.updatePet(petId, parsed.data);
  } catch {
    return { ok: false, message: "저장하지 못했어요. 권한이 없거나 삭제된 반려동물이에요." };
  }
  await store.audit("pet.updated", "pet", petId);
  revalidatePath(`/pets/${petId}`);
  return { ok: true, message: "저장했어요." };
}

export async function deletePetAction(petId: string, _: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const pet = await store.getPet(petId);
  if (!pet || pet.owner_id !== store.user.id) return { ok: false, message: "삭제할 수 없어요." };
  if (String(fd.get("confirm_name") ?? "").trim() !== pet.name) return { ok: false, errors: { confirm_name: "이름이 일치하지 않아요." }, message: "확인을 위해 이름을 정확히 입력해 주세요." };
  await store.deletePet(petId);
  await store.audit("pet.deleted", "pet", petId);
  (await cookies()).delete(ACTIVE_PET_COOKIE);
  revalidatePath("/", "layout");
  redirect("/pets?deleted=1");
}

export async function selectPetAction(fd: FormData) {
  const store = await getStore();
  const petId = String(fd.get("pet_id") ?? "");
  const next = safeNext(String(fd.get("next") ?? ""), "/today");
  if (store.user && (await store.getPet(petId))) await setActive(petId);
  redirect(next);
}

export async function addConditionAction(petId: string, _: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const parsed = conditionSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "입력 내용을 확인해 주세요." };
  await store.addCondition(petId, parsed.data);
  revalidatePath(`/pets/${petId}`);
  return { ok: true, message: "추가했어요." };
}

export async function removeConditionAction(petId: string, conditionId: string) {
  const store = await getStore();
  if (!store.user) return;
  await store.removeCondition(petId, conditionId);
  revalidatePath(`/pets/${petId}`);
}
