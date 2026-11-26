"use client";
// 보호자 화면(등록·상세·기록·오늘)이 함께 쓰는 반려동물 폼과 표시 도우미.
import { Field, SelectField, formatWon } from "@/components/ui";
import { RepoError } from "@/lib/repo";
import { ageInMonths } from "@/lib/rules";
import type { HealthEvent, Insert, Pet } from "@/lib/types";

export const SPECIES_LABEL: Record<Pet["species"], string> = { dog: "강아지", cat: "고양이" };

export type PetFormValues = {
  species: "" | Pet["species"];
  name: string;
  birth_date: string;
  estimated_birth: boolean;
  sex: Pet["sex"];
  neutered: "yes" | "no" | "unknown";
  weight: string;
  indoor: "yes" | "no" | "unknown";
  registration_status: Pet["registration_status"];
  insurance_status: Pet["insurance_status"];
};

export const EMPTY_PET_FORM: PetFormValues = {
  species: "",
  name: "",
  birth_date: "",
  estimated_birth: false,
  sex: "unknown",
  neutered: "unknown",
  weight: "",
  indoor: "unknown",
  registration_status: "unknown",
  insurance_status: "unknown",
};

const tri = (v: boolean | null): "yes" | "no" | "unknown" => (v === null ? "unknown" : v ? "yes" : "no");
const untri = (v: "yes" | "no" | "unknown"): boolean | null => (v === "unknown" ? null : v === "yes");

export function petToForm(pet: Pet): PetFormValues {
  return {
    species: pet.species,
    name: pet.name,
    birth_date: pet.birth_date ? pet.birth_date.slice(0, 10) : "",
    estimated_birth: pet.estimated_birth,
    sex: pet.sex,
    neutered: tri(pet.neutered),
    weight: pet.weight_kg === null ? "" : String(pet.weight_kg),
    indoor: tri(pet.indoor),
    registration_status: pet.registration_status,
    insurance_status: pet.insurance_status,
  };
}

export type PetFormErrors = Partial<Record<"species" | "name" | "birth_date" | "weight", string>>;

/** 이벤트 핸들러에서만 부른다 (오늘 날짜와 비교한다). */
export function validatePetForm(v: PetFormValues): PetFormErrors {
  const errors: PetFormErrors = {};
  if (v.species !== "dog" && v.species !== "cat") errors.species = "강아지인지 고양이인지 골라 주세요.";
  const name = v.name.trim();
  if (!name) errors.name = "이름을 적어 주세요.";
  else if (name.length > 30) errors.name = "이름은 30자까지 적을 수 있어요.";
  if (v.birth_date) {
    const d = new Date(v.birth_date);
    if (Number.isNaN(d.getTime())) errors.birth_date = "날짜를 다시 확인해 주세요.";
    else if (v.birth_date > toDateInput(new Date())) errors.birth_date = "오늘보다 뒤의 날짜는 고를 수 없어요.";
  }
  if (v.weight.trim()) {
    const w = Number(v.weight);
    if (!Number.isFinite(w) || w < 0.1 || w > 120) errors.weight = "체중은 0.1kg에서 120kg 사이로 적어 주세요.";
  }
  return errors;
}

export function formToPet(v: PetFormValues): Omit<Insert<"pets">, "owner_id" | "deleted_at"> {
  return {
    species: v.species === "cat" ? "cat" : "dog",
    name: v.name.trim(),
    birth_date: v.birth_date || null,
    estimated_birth: v.birth_date ? v.estimated_birth : false,
    sex: v.sex,
    neutered: untri(v.neutered),
    weight_kg: v.weight.trim() ? Math.round(Number(v.weight) * 100) / 100 : null,
    registration_status: v.registration_status,
    insurance_status: v.insurance_status,
    indoor: untri(v.indoor),
  };
}

export function PetFormFields({ values, onChange, errors, idPrefix }: { values: PetFormValues; onChange: (patch: Partial<PetFormValues>) => void; errors: PetFormErrors; idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <>
      <fieldset aria-describedby={errors.species ? id("species-error") : undefined}>
        <legend className="font-medium">
          어떤 아이인가요? <span className="text-sm font-normal text-muted">(필수)</span>
        </legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(["dog", "cat"] as const).map((s) => (
            <label key={s} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[12px] border border-line bg-card px-3 font-semibold has-[:checked]:border-brand has-[:checked]:bg-tint has-[:checked]:text-brand">
              <input type="radio" name={id("species")} value={s} checked={values.species === s} onChange={() => onChange({ species: s })} className="size-5 accent-brand" />
              {SPECIES_LABEL[s]}
            </label>
          ))}
        </div>
        {errors.species ? (
          <p id={id("species-error")} role="alert" className="mt-1 text-sm text-danger">
            {errors.species}
          </p>
        ) : null}
      </fieldset>
      <Field id={id("name")} label="이름 (필수)" value={values.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={30} required autoComplete="off" error={errors.name} />
      <Field id={id("birth")} label="생년월일" optional type="date" value={values.birth_date} onChange={(e) => onChange({ birth_date: e.target.value })} error={errors.birth_date} hint="정확히 모르면 짐작되는 날짜를 넣고 아래를 체크해 주세요." />
      <label className="flex min-h-12 items-center gap-3">
        <input type="checkbox" checked={values.estimated_birth} onChange={(e) => onChange({ estimated_birth: e.target.checked })} className="size-5 shrink-0 accent-brand" />
        <span>생년월일은 추정이에요</span>
      </label>
      <SelectField id={id("sex")} label="성별" optional value={values.sex} onChange={(e) => onChange({ sex: e.target.value as Pet["sex"] })}>
        <option value="unknown">모름</option>
        <option value="female">여아</option>
        <option value="male">남아</option>
      </SelectField>
      <SelectField id={id("neutered")} label="중성화" optional value={values.neutered} onChange={(e) => onChange({ neutered: e.target.value as PetFormValues["neutered"] })}>
        <option value="unknown">모름</option>
        <option value="yes">예</option>
        <option value="no">아니오</option>
      </SelectField>
      <Field id={id("weight")} label="체중 (kg)" optional type="number" inputMode="decimal" min={0.1} max={120} step={0.1} value={values.weight} onChange={(e) => onChange({ weight: e.target.value })} error={errors.weight} />
      <SelectField id={id("indoor")} label="주로 실내에서 지내나요?" optional value={values.indoor} onChange={(e) => onChange({ indoor: e.target.value as PetFormValues["indoor"] })}>
        <option value="unknown">모름</option>
        <option value="yes">네, 실내에서 지내요</option>
        <option value="no">아니요, 바깥 생활도 해요</option>
      </SelectField>
      <SelectField id={id("registration")} label="동물등록" optional value={values.registration_status} onChange={(e) => onChange({ registration_status: e.target.value as Pet["registration_status"] })}>
        <option value="unknown">모름</option>
        <option value="registered">등록했어요</option>
        <option value="unregistered">아직 안 했어요</option>
      </SelectField>
      <SelectField id={id("insurance")} label="보험 가입" optional value={values.insurance_status} onChange={(e) => onChange({ insurance_status: e.target.value as Pet["insurance_status"] })}>
        <option value="unknown">모름</option>
        <option value="insured">가입했어요</option>
        <option value="uninsured">가입하지 않았어요</option>
      </SelectField>
    </>
  );
}

export function ageLabel(pet: Pick<Pet, "birth_date" | "estimated_birth">, now: Date): string {
  const months = ageInMonths(pet.birth_date, now);
  if (months === null || months < 0) return "나이 모름";
  const text = months < 12 ? `${months}개월` : `${Math.floor(months / 12)}살`;
  return pet.estimated_birth ? `${text} (추정)` : text;
}

export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const EVENT_LABEL: Record<HealthEvent["event_type"], string> = {
  task_done: "할 일 완료",
  weight: "체중",
  medication_note: "투약 메모",
  test: "검사",
  visit: "진료",
  cost: "비용",
  note: "메모",
};

/** 기록의 값(체중·비용·완료한 할 일)을 한 줄로 보여 준다. */
export function eventValue(e: HealthEvent): string | null {
  const v = e.value_json;
  if (e.event_type === "weight" && typeof v.weight_kg === "number") return `${v.weight_kg}kg`;
  if (e.event_type === "cost" && typeof v.amount_krw === "number") return formatWon(v.amount_krw);
  if (e.event_type === "task_done" && typeof v.title === "string") return v.title;
  return null;
}

export function errorText(e: unknown, fallback = "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요."): string {
  return e instanceof RepoError && e.message ? e.message : fallback;
}

/** "질환, 알레르기" 처럼 쉼표나 줄바꿈으로 적은 글을 항목으로 나눈다. */
export function splitList(text: string): string[] {
  return [...new Set(text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))].map((s) => s.slice(0, 60));
}
