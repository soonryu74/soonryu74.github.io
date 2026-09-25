"use server";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/session";
import { DOCUMENT_TYPES, eventSchema, fieldErrors, formToObject } from "@/lib/validation";
import { safeFileName, validateUpload } from "@/lib/files";
import type { FormState } from "@/components/form-message";

export async function createEventAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const parsed = eventSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "입력 내용을 확인해 주세요." };
  const d = parsed.data;
  if (!(await store.getPet(d.pet_id))) return { ok: false, message: "반려동물을 찾을 수 없어요." };
  const value: Record<string, unknown> = {};
  if (d.weight_kg != null) value.weight_kg = d.weight_kg;
  if (d.amount_krw != null) value.amount_krw = d.amount_krw;
  if (d.place) value.place = d.place;
  await store.createEvent(d.pet_id, { event_type: d.event_type, occurred_at: new Date(`${d.occurred_date}T12:00:00+09:00`).toISOString(), value_json: value, note: d.note ?? null });
  revalidatePath("/records");
  return { ok: true, message: "기록했어요." };
}

export async function deleteEventAction(petId: string, eventId: string) {
  const store = await getStore();
  if (!store.user) return;
  await store.deleteEvent(petId, eventId);
  revalidatePath("/records");
}

export async function uploadDocumentAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const petId = String(fd.get("pet_id") ?? "");
  const type = String(fd.get("document_type") ?? "");
  const file = fd.get("file");
  if (!(type in DOCUMENT_TYPES)) return { ok: false, errors: { document_type: "문서 종류를 선택해 주세요." } };
  if (!(file instanceof File) || file.size === 0) return { ok: false, errors: { file: "파일을 선택해 주세요." } };
  if (fd.get("rights_confirmed") !== "on") return { ok: false, errors: { rights_confirmed: "본인 자료이며 타인의 개인정보가 드러나지 않는지 확인해 주세요." } };
  if (!(await store.getPet(petId))) return { ok: false, message: "반려동물을 찾을 수 없어요." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateUpload(file.name, file.type, bytes);
  if (!check.ok) return { ok: false, errors: { file: check.error } };
  try {
    const doc = await store.uploadDocument(petId, { document_type: type, original_name: safeFileName(file.name), mime_type: check.mime, ext: check.ext }, bytes);
    await store.audit("document.uploaded", "document", doc.id, { size: doc.size, mime: doc.mime_type });
  } catch (e) {
    return { ok: false, message: `업로드하지 못했어요. ${(e as Error).message}` };
  }
  revalidatePath("/records");
  return { ok: true, message: "비공개로 저장했어요." };
}

export async function deleteDocumentAction(docId: string) {
  const store = await getStore();
  if (!store.user) return;
  await store.deleteDocument(docId);
  await store.audit("document.deleted", "document", docId);
  revalidatePath("/records");
}
