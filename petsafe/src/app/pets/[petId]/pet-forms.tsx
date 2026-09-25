"use client";
import { useActionState, useState, useTransition } from "react";
import { addConditionAction, deletePetAction, removeConditionAction, updatePetAction } from "@/app/actions/pets";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormMessage, type FormState } from "@/components/form-message";
import { BodyFields, LifeFields, SpeciesNameFields } from "@/components/pets/pet-fields";
import type { Pet } from "@/lib/types";

export function PetEditForm({ pet }: { pet: Pet }) {
  const [state, action] = useActionState<FormState, FormData>(updatePetAction.bind(null, pet.id), null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <SpeciesNameFields pet={pet} errors={state?.errors} />
      <BodyFields pet={pet} errors={state?.errors} />
      <LifeFields pet={pet} errors={state?.errors} />
      <SubmitButton>저장</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function PetDeleteForm({ pet }: { pet: Pet }) {
  const [state, action] = useActionState<FormState, FormData>(deletePetAction.bind(null, pet.id), null);
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className="btn btn-outline btn-sm mt-2 text-danger" onClick={() => setOpen(true)}>삭제하기…</button>;
  return (
    <form action={action} className="mt-3 space-y-2">
      <div className="field">
        <label htmlFor="confirm_name" className="label">확인을 위해 이름 &lsquo;{pet.name}&rsquo;을(를) 입력하세요</label>
        <input id="confirm_name" name="confirm_name" className="input" autoComplete="off" aria-invalid={!!state?.errors?.confirm_name} aria-describedby={state?.errors?.confirm_name ? "confirm_name-err" : undefined} />
        <FieldError id="confirm_name-err" error={state?.errors?.confirm_name} />
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>취소</button>
        <SubmitButton className="btn btn-danger btn-sm" pendingText="삭제 중…">영구 삭제</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function ConditionForm({ petId }: { petId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addConditionAction.bind(null, petId), null);
  return (
    <form action={action} className="mt-3 grid sm:grid-cols-[auto_1fr_auto] gap-2 items-end" noValidate>
      <div className="field">
        <label htmlFor="cond-type" className="label">종류</label>
        <select id="cond-type" name="type" className="input" defaultValue="disease">
          <option value="disease">질환</option><option value="allergy">알레르기</option><option value="medication">투약(처방 기록)</option><option value="other">기타</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="cond-name" className="label">내용</label>
        <input id="cond-name" name="name" className="input" maxLength={80} aria-invalid={!!state?.errors?.name} aria-describedby={state?.errors?.name ? "cond-name-err" : undefined} />
        <FieldError id="cond-name-err" error={state?.errors?.name} />
      </div>
      <SubmitButton className="btn btn-outline">추가</SubmitButton>
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
    </form>
  );
}

export function ConditionRemove({ petId, conditionId, name }: { petId: string; conditionId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn btn-outline btn-sm" disabled={pending} aria-label={`${name} 삭제`}
      onClick={() => { if (confirm(`'${name}'을(를) 삭제할까요?`)) start(() => removeConditionAction(petId, conditionId)); }}>
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}
