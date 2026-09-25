"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/session";
import type { FormState } from "@/components/form-message";
import type { ContentStatus } from "@/lib/types";

async function staff(kind: "reviewer" | "admin") {
  const store = await getStore();
  const u = store.user;
  const ok = u && (kind === "admin" ? u.role === "admin" : u.role === "admin" || u.role === "reviewer");
  return ok ? store : null;
}

const reviewSchema = z.object({
  version_id: z.string().uuid(),
  reviewer_name: z.string().trim().min(2, "검수자 이름을 입력해 주세요.").max(60),
  reviewer_credential: z.string().trim().min(2, "검수자 자격(예: 수의사 면허)을 입력해 주세요.").max(120),
  reviewed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "검토일을 입력해 주세요."),
  next_review_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "다음 검토예정일을 입력해 주세요."),
});

export async function reviewVersionAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await staff("reviewer");
  if (!store) return { ok: false, message: "권한이 없어요." };
  const p = reviewSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  if (p.data.next_review_at <= p.data.reviewed_at) return { ok: false, message: "다음 검토예정일은 검토일 이후여야 해요." };
  await store.admin.reviewVersion(p.data.version_id, { ...p.data, expires_at: p.data.next_review_at });
  await store.audit("content.reviewed", "content_version", p.data.version_id, { reviewer: p.data.reviewer_name });
  revalidatePath("/admin/content");
  return { ok: true, message: "검수 정보를 기록했어요. 이제 승인할 수 있어요." };
}

export async function setVersionStatusAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await staff("reviewer");
  if (!store) return { ok: false, message: "권한이 없어요." };
  const id = String(fd.get("version_id") ?? "");
  const to = String(fd.get("to") ?? "") as ContentStatus;
  try {
    await store.admin.setVersionStatus(id, to);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  await store.audit("content.status_changed", "content_version", id, { to });
  revalidatePath("/admin/content");
  revalidatePath("/health/zoonoses", "layout");
  return { ok: true, message: "상태를 바꿨어요." };
}

const lines = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
const BODY_KEYS = ["animalSigns", "humanSigns", "transmission", "prevention", "humanSeekCare", "animalSeekVet", "dont"];

export async function createVersionAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await staff("reviewer");
  if (!store) return { ok: false, message: "권한이 없어요." };
  const contentId = String(fd.get("content_id") ?? "");
  const title = String(fd.get("title") ?? "").trim();
  const summary = String(fd.get("summary") ?? "").trim();
  const reason = String(fd.get("change_reason") ?? "").trim();
  if (!title || !summary || !reason) return { ok: false, message: "제목·요약·변경 사유는 필수예요." };
  const sources = lines(fd.get("sources")).map((l) => { const [organization, url] = l.split("|").map((s) => s.trim()); return { organization, url, checkedAt: new Date().toISOString().slice(0, 10) }; });
  if (!sources.length || sources.some((s) => !s.organization || !/^https:\/\//.test(s.url ?? ""))) return { ok: false, message: "공식 출처를 '기관명|https://주소' 형식으로 한 줄에 하나씩 입력해 주세요." };
  const body: Record<string, string[]> = {};
  for (const k of BODY_KEYS) body[k] = lines(fd.get(k));
  await store.admin.createVersion(contentId, { title, summary, body_json: body, source_json: sources, change_reason: reason, author_name: store.user!.email });
  await store.audit("content.version_created", "content", contentId, { reason });
  revalidatePath("/admin/content");
  return { ok: true, message: "새 초안 버전을 만들었어요. 검수를 요청하세요." };
}

export async function resolveReportAction(fd: FormData) {
  const store = await staff("admin");
  if (!store) return;
  const id = String(fd.get("id") ?? "");
  const status = fd.get("status") === "rejected" ? "rejected" : "resolved";
  await store.admin.resolveFacilityReport(id, status);
  await store.audit("facility_report.resolved", "facility_report", id, { status });
  revalidatePath("/admin/facilities");
}

const contactSchema = z.object({
  id: z.string().uuid(),
  phone: z.string().trim().max(20).regex(/^[0-9+\-() ]*$/, "전화번호 형식을 확인해 주세요."),
  url: z.string().trim().max(300).refine((v) => v === "" || /^https:\/\//.test(v), "https 주소만 입력할 수 있어요."),
  source_url: z.string().trim().max(300).refine((v) => v === "" || /^https:\/\//.test(v), "근거 주소는 https만 가능해요."),
  status: z.enum(["active", "pending_verification", "retired"]),
});

export async function updateContactAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await staff("admin");
  if (!store) return { ok: false, message: "권한이 없어요." };
  const p = contactSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  if (p.data.status === "active" && !p.data.source_url) return { ok: false, message: "게시(active)하려면 근거 주소가 필요해요." };
  const today = new Date().toISOString().slice(0, 10);
  await store.admin.updateContact(p.data.id, { phone: p.data.phone || null, url: p.data.url || null, source_url: p.data.source_url || null, status: p.data.status, verified_at: today });
  await store.audit("contact.verified", "official_contact", p.data.id, { status: p.data.status });
  revalidatePath("/admin/legal");
  revalidatePath("/reports");
  return { ok: true, message: `확인일을 ${today}로 기록했어요.` };
}
