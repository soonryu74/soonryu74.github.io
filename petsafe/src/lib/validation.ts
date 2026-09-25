// 서버측 입력 검증 (폼 → 도메인). 클라이언트 검증과 별개로 항상 실행한다.
import { z } from "zod";
import { TREATMENT_CATEGORIES } from "@/content/insurance";

const optText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v), z.string().max(max).nullable().optional());
const optDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않아요.").nullable().optional(),
);
const optBool = z.preprocess((v) => (v === "true" || v === "on" ? true : v === "false" ? false : v === "" || v == null ? null : v), z.boolean().nullable().optional());
const optNum = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(min).max(max).nullable().optional());
const phone = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v),
  z.string().regex(/^[0-9+\-() ]{3,20}$/, "전화번호는 숫자와 - 만 입력해 주세요.").nullable().optional(),
);

export const petSchema = z.object({
  species: z.enum(["dog", "cat"], { message: "반려견 또는 반려묘를 선택해 주세요." }),
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(40, "이름은 40자 이내로 입력해 주세요."),
  birth_date: optDate.refine((v) => !v || v <= new Date().toISOString().slice(0, 10), "생일은 오늘 이전이어야 해요."),
  estimated_birth: optBool,
  sex: z.enum(["male", "female", "unknown"]).default("unknown"),
  neutered: optBool,
  weight_kg: optNum(0.05, 199),
  indoor: optBool,
  multi_pet: optBool,
  registration_status: z.enum(["registered", "not_registered", "unknown", "not_applicable"]).default("unknown"),
  insurance_status: z.enum(["insured", "not_insured", "unknown"]).default("unknown"),
  primary_vet_name: optText(80),
  primary_vet_phone: phone,
});
export type PetInput = z.infer<typeof petSchema>;

export const conditionSchema = z.object({
  type: z.enum(["disease", "allergy", "medication", "other"]),
  name: z.string().trim().min(1, "내용을 입력해 주세요.").max(80),
  note: optText(300),
});
export type ConditionInput = z.infer<typeof conditionSchema>;

export const taskCreateSchema = z.object({
  pet_id: z.string().uuid(),
  title: z.string().trim().min(1, "할 일을 입력해 주세요.").max(120),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_time: z.string().regex(/^\d{2}:\d{2}$/).default("21:00"),
  repeat_rule: z.preprocess((v) => (v === "" || v === "none" ? null : v), z.enum(["daily", "weekly", "monthly"]).nullable()),
  note: optText(500),
});

export const taskActionSchema = z.object({
  task_id: z.string().uuid(),
  action: z.enum(["complete", "undo", "snooze", "note", "skip"]),
  note: optText(500),
});

export const EVENT_TYPES = {
  weight: "체중",
  observation: "관찰 메모",
  medication_note: "투약 메모 (수의사 처방 기록)",
  exam: "검사",
  visit: "진료",
  cost: "비용",
} as const;

export const eventSchema = z.object({
  pet_id: z.string().uuid(),
  event_type: z.enum(Object.keys(EVENT_TYPES) as [keyof typeof EVENT_TYPES, ...(keyof typeof EVENT_TYPES)[]]),
  occurred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: optNum(0.05, 199),
  amount_krw: optNum(0, 100_000_000),
  place: optText(80),
  note: optText(1000),
}).superRefine((v, ctx) => {
  if (v.event_type === "weight" && (v.weight_kg == null)) ctx.addIssue({ code: "custom", path: ["weight_kg"], message: "체중을 입력해 주세요." });
  if (v.event_type === "cost" && (v.amount_krw == null)) ctx.addIssue({ code: "custom", path: ["amount_krw"], message: "금액을 입력해 주세요." });
  if (!["weight", "cost"].includes(v.event_type) && !v.note) ctx.addIssue({ code: "custom", path: ["note"], message: "메모를 입력해 주세요." });
});

export const DOCUMENT_TYPES = {
  receipt: "진료비 영수증",
  lab: "검사 결과",
  vaccination: "접종 기록",
  insurance: "보험 서류",
  registration: "동물등록증",
  photo: "사진",
  other: "기타",
} as const;

export const policySchema = z.object({
  pet_id: z.string().uuid(),
  insurer: z.string().trim().min(1, "보험사를 입력해 주세요.").max(80),
  product_name: z.string().trim().min(1, "상품명을 입력해 주세요.").max(120),
  terms_version: optText(60),
  joined_at: optDate,
  renewal_at: optDate,
  annual_limit: optNum(0, 1_000_000_000),
  per_visit_limit: optNum(0, 1_000_000_000),
  coverage_rate: optNum(0, 100),
  deductible_per_visit: optNum(0, 10_000_000),
  customer_center: phone,
});

export const termSchema = z.object({
  policy_id: z.string().uuid(),
  category: z.enum(TREATMENT_CATEGORIES.map((c) => c.key) as [string, ...string[]]),
  clause_text: z.string().trim().min(1, "약관 문구를 입력해 주세요.").max(2000),
  clause_reference: optText(80),
  classification: z.enum(["covered", "excluded", "conditional", "unknown"]),
});

export const checkSchema = z.object({
  policy_id: z.string().uuid(),
  category: z.enum(TREATMENT_CATEGORIES.map((c) => c.key) as [string, ...string[]]),
});

export const incidentSchema = z.object({
  incident_type: z.enum(["lost_found", "my_pet_lost", "abuse", "illegal_practice", "dispute"]),
  occurred_at: z.preprocess((v) => (v === "" ? null : v), z.string().max(40).nullable().optional()),
  location_text: optText(120),
  features: optText(1000),
  memo: optText(1000),
});

export const consentSchema = z.object({
  terms: z.literal("on", { message: "이용약관에 동의해 주세요." }),
  privacy: z.literal("on", { message: "개인정보 처리방침에 동의해 주세요." }),
  location: z.literal("on", { message: "위치정보 안내에 동의해 주세요." }),
  copyright: z.literal("on", { message: "저작권·게시물 정책에 동의해 주세요." }),
  marketing: z.preprocess((v) => v === "on", z.boolean()),
});

export const emailSchema = z.object({ email: z.string().trim().toLowerCase().email("이메일 주소를 확인해 주세요.").max(254) });

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "form");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

export function formToObject(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  fd.forEach((v, k) => { if (typeof v === "string") o[k] = v; });
  return o;
}
