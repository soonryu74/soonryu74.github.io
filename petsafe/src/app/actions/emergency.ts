"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/session";
import type { FormState } from "@/components/form-message";

const schema = z.object({
  pet_id: z.string().uuid(),
  flags: z.string().max(300),
  started_at: z.string().max(40).optional(),
  substance: z.string().max(200).optional(),
  amount: z.string().max(100).optional(),
  memo: z.string().max(1000).optional(),
});

export async function saveEmergencyNoteAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인하면 기록에 저장할 수 있어요. 지금은 '메모 복사'를 이용하세요." };
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "입력 내용을 확인해 주세요." };
  const d = parsed.data;
  if (!(await store.getPet(d.pet_id))) return { ok: false, message: "반려동물을 찾을 수 없어요." };
  const note = [
    d.flags && `관찰한 신호: ${d.flags}`,
    d.started_at && `시작 시각: ${d.started_at}`,
    d.substance && `먹은 것/제품: ${d.substance}`,
    d.amount && `양: ${d.amount}`,
    d.memo && `메모: ${d.memo}`,
  ].filter(Boolean).join("\n");
  await store.createEvent(d.pet_id, { event_type: "emergency_note", occurred_at: new Date().toISOString(), value_json: { flags: d.flags }, note });
  revalidatePath("/records");
  return { ok: true, message: "건강 기록에 저장했어요." };
}
