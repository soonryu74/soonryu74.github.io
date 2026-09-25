"use server";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/session";
import { fieldErrors, formToObject, incidentSchema } from "@/lib/validation";
import type { FormState } from "@/components/form-message";

export async function saveIncidentDraftAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "계정 저장은 로그인 후 가능해요. 대신 '이 기기에 저장'을 이용하세요." };
  const parsed = incidentSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "입력 내용을 확인해 주세요." };
  if (fd.get("account_consent") !== "on") return { ok: false, errors: { account_consent: "보관 목적·기간에 동의해야 계정에 저장할 수 있어요." } };
  const d = parsed.data;
  const evidence = fd.getAll("evidence").map(String).slice(0, 20);
  await store.createIncidentDraft({

    incident_type: d.incident_type,
    occurred_at: d.occurred_at ? new Date(d.occurred_at).toISOString() : null,
    location_precision: d.location_text ? "coarse" : "none",
    location_text: d.location_text ?? null,
    details_json: { features: d.features ?? undefined, memo: d.memo ?? undefined, evidence },
  });
  revalidatePath("/reports");
  return { ok: true, message: "계정에 저장했어요. 90일 뒤 자동 삭제돼요. 공식 기관 신고는 아래 연락처로 직접 해 주세요." };
}

export async function deleteIncidentDraftAction(id: string) {
  const store = await getStore();
  if (!store.user) return;
  await store.deleteIncidentDraft(id);
  revalidatePath("/reports");
}
