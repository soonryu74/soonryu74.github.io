"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/session";
import { checkSchema, fieldErrors, formToObject, policySchema, termSchema } from "@/lib/validation";
import { classifyTreatment, RESULT_LABELS } from "@/lib/insurance";
import type { FormState } from "@/components/form-message";

export async function createPolicyAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const parsed = policySchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "입력 내용을 확인해 주세요." };
  const d = parsed.data;
  if (!(await store.getPet(d.pet_id))) return { ok: false, message: "반려동물을 찾을 수 없어요." };
  const policy = await store.createPolicy({
    pet_id: d.pet_id, insurer: d.insurer, product_name: d.product_name, terms_version: d.terms_version ?? null,
    joined_at: d.joined_at ?? null, renewal_at: d.renewal_at ?? null,
    coverage_json: { annual_limit: d.annual_limit ?? null, per_visit_limit: d.per_visit_limit ?? null, coverage_rate: d.coverage_rate ?? null },
    deductible_json: { per_visit: d.deductible_per_visit ?? null },
    customer_center: d.customer_center ?? null,
  });
  revalidatePath("/insurance");
  redirect(`/insurance?policy=${policy.id}`);
}

export async function deletePolicyAction(policyId: string) {
  const store = await getStore();
  if (!store.user) return;
  await store.deletePolicy(policyId);
  revalidatePath("/insurance");
  redirect("/insurance");
}

export async function addTermAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const parsed = termSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "입력 내용을 확인해 주세요." };
  if (!(await store.getPolicy(parsed.data.policy_id))) return { ok: false, message: "보험 정보를 찾을 수 없어요." };
  await store.addTerm({ ...parsed.data, clause_reference: parsed.data.clause_reference ?? null });
  revalidatePath("/insurance");
  return { ok: true, message: "약관 조항을 저장했어요." };
}

export async function deleteTermAction(policyId: string, termId: string) {
  const store = await getStore();
  if (!store.user) return;
  await store.deleteTerm(policyId, termId);
  revalidatePath("/insurance");
}

export async function runCheckAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const parsed = checkSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: "진료 유형을 선택해 주세요." };
  const policy = await store.getPolicy(parsed.data.policy_id);
  if (!policy) return { ok: false, message: "보험 정보를 찾을 수 없어요." };
  const terms = await store.listTerms(policy.id);
  const outcome = classifyTreatment(parsed.data.category, terms, policy.terms_version);
  await store.createCheck({ policy_id: policy.id, input_json: { category: parsed.data.category }, result: outcome.result, evidence_json: outcome.evidence });
  revalidatePath("/insurance");
  return { ok: true, message: `결과: ${RESULT_LABELS[outcome.result]}` };
}
