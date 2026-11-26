"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, Loading, LoginRequired, Notice, PageHeader, TextareaField } from "@/components/ui";
import { createPetWithTasks } from "@/lib/domain";
import { usePets, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { SessionUser } from "@/lib/types";
import { EMPTY_PET_FORM, PetFormFields, errorText, formToPet, splitList, validatePetForm, type PetFormErrors, type PetFormValues } from "../pets/pet-shared";

const DRAFT_KEY = "ps365:onboarding-draft";
type Draft = { pet: PetFormValues; conditions: string; allergies: string };
const EMPTY_DRAFT: Draft = { pet: EMPTY_PET_FORM, conditions: "", allergies: "" };

function loadDraft(): { draft: Draft; restored: boolean } {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return { draft: EMPTY_DRAFT, restored: false };
    const saved = JSON.parse(raw) as Partial<Draft>;
    return {
      draft: {
        pet: { ...EMPTY_PET_FORM, ...(saved.pet ?? {}) },
        conditions: typeof saved.conditions === "string" ? saved.conditions : "",
        allergies: typeof saved.allergies === "string" ? saved.allergies : "",
      },
      restored: true,
    };
  } catch {
    return { draft: EMPTY_DRAFT, restored: false };
  }
}

function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* 무시 */
  }
}

export default function OnboardingPage() {
  const { user, loading } = useSession();
  return (
    <>
      <PageHeader title="우리 아이 등록" description="알려 주신 정보로 오늘 챙길 일을 준비해요. 1분이면 돼요." />
      {loading ? <Loading /> : user ? <OnboardingForm user={user} /> : <LoginRequired what="반려동물 등록" />}
    </>
  );
}

function OnboardingForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const { select } = usePets();
  // 로그인 확인이 끝난 뒤(브라우저)에만 그려지므로 저장해 둔 초안을 바로 읽어 온다.
  const [initial] = useState(loadDraft);
  const [draft, setDraft] = useState<Draft>(initial.draft);
  const [restored, setRestored] = useState(initial.restored);
  const [errors, setErrors] = useState<PetFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // 적는 도중 화면을 떠나도 이어서 쓸 수 있게 이 탭에 초안을 남긴다.
  useEffect(() => {
    if (saved) return;
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* 저장소를 못 쓰면 초안 없이 진행한다 */
    }
  }, [draft, saved]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problems = validatePetForm(draft.pet);
    setErrors(problems);
    setFormError(Object.keys(problems).length > 0 ? "빨간 글씨로 표시된 곳을 확인해 주세요." : null);
    if (Object.keys(problems).length > 0) return;
    setBusy(true);
    try {
      const repo = getRepo();
      const pet = await createPetWithTasks(user, formToPet(draft.pet));
      const rows = [
        ...splitList(draft.conditions).map((name) => ({ type: "condition" as const, name })),
        ...splitList(draft.allergies).map((name) => ({ type: "allergy" as const, name })),
      ];
      for (const row of rows) {
        await repo.insert("pet_conditions", { pet_id: pet.id, type: row.type, name: row.name, note: null, active: true, source: "guardian" });
      }
      setSaved(true);
      clearDraft();
      select(pet.id);
      router.push("/today");
    } catch (err) {
      setFormError(errorText(err, "등록하지 못했어요. 잠시 뒤 다시 시도해 주세요."));
      setBusy(false);
    }
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setRestored(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {restored ? (
        <Notice>
          <p>적던 내용을 불러왔어요. 이어서 적어 주세요.</p>
          <button type="button" onClick={reset} className="mt-1 inline-flex min-h-11 items-center text-brand underline">
            처음부터 다시 적기
          </button>
        </Notice>
      ) : null}
      <Card className="flex flex-col gap-4">
        <PetFormFields idPrefix="onboarding" values={draft.pet} errors={errors} onChange={(patch) => setDraft((d) => ({ ...d, pet: { ...d.pet, ...patch } }))} />
      </Card>
      <Card className="flex flex-col gap-4">
        <TextareaField
          id="onboarding-conditions"
          label="앓고 있는 질환"
          optional
          placeholder="쉼표나 줄바꿈으로 나눠 적어 주세요"
          value={draft.conditions}
          onChange={(e) => setDraft((d) => ({ ...d, conditions: e.target.value }))}
        />
        <TextareaField
          id="onboarding-allergies"
          label="알레르기"
          optional
          placeholder="쉼표나 줄바꿈으로 나눠 적어 주세요"
          value={draft.allergies}
          onChange={(e) => setDraft((d) => ({ ...d, allergies: e.target.value }))}
        />
        <p className="text-sm text-muted">병원에서 들은 내용을 그대로 적어 두는 메모예요. 이 앱은 진단하거나 치료를 권하지 않아요.</p>
      </Card>
      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {busy ? "등록하는 중이에요" : "등록하고 오늘 할 일 보기"}
      </Button>
    </form>
  );
}
