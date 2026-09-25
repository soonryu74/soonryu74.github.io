"use server";
import { z } from "zod";
import { getStore } from "@/lib/session";
import type { FormState } from "@/components/form-message";

const schema = z.object({
  facility_id: z.string().uuid(),
  report_type: z.enum(["closed", "wrong_phone", "wrong_hours", "wrong_location", "pet_policy", "other"]),
  details: z.string().trim().max(1000).optional(),
});

export async function reportFacilityAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "오류 신고는 로그인 후 할 수 있어요." };
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "신고 유형을 선택해 주세요." };
  try {
    await store.reportFacility(parsed.data.facility_id, parsed.data.report_type, parsed.data.details || null);
  } catch {
    return { ok: false, message: "접수하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  await store.audit("facility.reported", "facility", parsed.data.facility_id, { type: parsed.data.report_type });
  return { ok: true, message: "접수했어요. 운영자가 확인 후 반영해요(목표 48시간)." };
}
