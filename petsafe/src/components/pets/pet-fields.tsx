import type { Pet } from "@/lib/types";

type Errors = Record<string, string> | undefined;

function Err({ name, errors }: { name: string; errors: Errors }) {
  return errors?.[name] ? <p id={`${name}-err`} className="err">{errors[name]}</p> : null;
}

function a11y(name: string, errors: Errors) {
  return { "aria-invalid": !!errors?.[name], "aria-describedby": errors?.[name] ? `${name}-err` : undefined };
}

function YesNo({ name, legend, value, errors }: { name: string; legend: string; value: boolean | null | undefined; errors: Errors }) {
  const v = value === true ? "true" : value === false ? "false" : "";
  return (
    <fieldset className="field">
      <legend className="label">{legend}<span className="opt">선택</span></legend>
      <div className="flex flex-wrap gap-2">
        {[["true", "예"], ["false", "아니요"], ["", "모름"]].map(([val, label]) => (
          <label key={val} className="btn btn-outline btn-sm has-[:checked]:border-primary has-[:checked]:bg-[#E6F4F1]">
            <input type="radio" name={name} value={val} defaultChecked={v === val} className="accent-[#0F766E]" /> {label}
          </label>
        ))}
      </div>
      <Err name={name} errors={errors} />
    </fieldset>
  );
}

export function SpeciesNameFields({ pet, errors }: { pet?: Partial<Pet>; errors: Errors }) {
  return (
    <>
      <fieldset className="field">
        <legend className="label">어떤 아이인가요?<span className="req" aria-hidden="true">*</span><span className="sr-only">(필수)</span></legend>
        <div className="grid grid-cols-2 gap-2">
          {[["dog", "🐶 반려견"], ["cat", "🐱 반려묘"]].map(([val, label]) => (
            <label key={val} className="btn btn-outline has-[:checked]:border-primary has-[:checked]:bg-[#E6F4F1]">
              <input type="radio" name="species" value={val} required defaultChecked={pet?.species === val} className="accent-[#0F766E]" /> {label}
            </label>
          ))}
        </div>
        <Err name="species" errors={errors} />
      </fieldset>
      <div className="field">
        <label htmlFor="name" className="label">이름<span className="req" aria-hidden="true">*</span><span className="sr-only">(필수)</span></label>
        <input id="name" name="name" className="input" maxLength={40} required defaultValue={pet?.name ?? ""} {...a11y("name", errors)} />
        <Err name="name" errors={errors} />
      </div>
    </>
  );
}

export function BodyFields({ pet, errors }: { pet?: Partial<Pet>; errors: Errors }) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="birth_date" className="label">생일<span className="opt">선택</span></label>
          <input id="birth_date" name="birth_date" type="date" className="input" defaultValue={pet?.birth_date ?? ""} {...a11y("birth_date", errors)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="estimated_birth" value="true" defaultChecked={pet?.estimated_birth ?? false} className="size-4 accent-[#0F766E]" /> 정확하지 않아요(추정)</label>
          <Err name="birth_date" errors={errors} />
        </div>
        <div className="field">
          <label htmlFor="weight_kg" className="label">체중(kg)<span className="opt">선택</span></label>
          <input id="weight_kg" name="weight_kg" type="number" inputMode="decimal" step="0.01" min="0.05" max="199" className="input" defaultValue={pet?.weight_kg ?? ""} {...a11y("weight_kg", errors)} />
          <Err name="weight_kg" errors={errors} />
        </div>
      </div>
      <fieldset className="field">
        <legend className="label">성별<span className="opt">선택</span></legend>
        <div className="flex flex-wrap gap-2">
          {[["male", "남아"], ["female", "여아"], ["unknown", "모름"]].map(([val, label]) => (
            <label key={val} className="btn btn-outline btn-sm has-[:checked]:border-primary has-[:checked]:bg-[#E6F4F1]">
              <input type="radio" name="sex" value={val} defaultChecked={(pet?.sex ?? "unknown") === val} className="accent-[#0F766E]" /> {label}
            </label>
          ))}
        </div>
      </fieldset>
      <YesNo name="neutered" legend="중성화했나요?" value={pet?.neutered} errors={errors} />
    </>
  );
}

export function HealthFields({ errors }: { errors: Errors }) {
  return (
    <>
      <div className="field">
        <label htmlFor="diseases" className="label">앓고 있는 질환<span className="opt">선택</span></label>
        <textarea id="diseases" name="diseases" rows={2} className="input" placeholder="예: 슬개골 탈구, 피부염 (쉼표로 구분)" />
        <p className="hint">진단받은 내용을 적어 두면 병원에 갈 때 도움이 돼요.</p>
        <Err name="diseases" errors={errors} />
      </div>
      <div className="field">
        <label htmlFor="allergies" className="label">알레르기<span className="opt">선택</span></label>
        <textarea id="allergies" name="allergies" rows={2} className="input" placeholder="예: 닭고기 (쉼표로 구분)" />
      </div>
    </>
  );
}

export function LifeFields({ pet, errors }: { pet?: Partial<Pet>; errors: Errors }) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="registration_status" className="label">동물등록<span className="opt">선택</span></label>
          <select id="registration_status" name="registration_status" className="input" defaultValue={pet?.registration_status ?? "unknown"}>
            <option value="registered">등록했어요</option>
            <option value="not_registered">아직 안 했어요</option>
            <option value="unknown">모르겠어요</option>
            <option value="not_applicable">해당 없음(고양이 등)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="insurance_status" className="label">펫보험<span className="opt">선택</span></label>
          <select id="insurance_status" name="insurance_status" className="input" defaultValue={pet?.insurance_status ?? "unknown"}>
            <option value="insured">가입했어요</option>
            <option value="not_insured">가입 안 했어요</option>
            <option value="unknown">모르겠어요</option>
          </select>
        </div>
      </div>
      <YesNo name="indoor" legend="주로 실내에서 지내나요?" value={pet?.indoor} errors={errors} />
      <YesNo name="multi_pet" legend="다른 반려동물과 함께 사나요?" value={pet?.multi_pet} errors={errors} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="primary_vet_name" className="label">다니는 동물병원<span className="opt">선택</span></label>
          <input id="primary_vet_name" name="primary_vet_name" className="input" maxLength={80} defaultValue={pet?.primary_vet_name ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="primary_vet_phone" className="label">병원 전화번호<span className="opt">선택</span></label>
          <input id="primary_vet_phone" name="primary_vet_phone" type="tel" inputMode="tel" className="input" placeholder="02-123-4567" defaultValue={pet?.primary_vet_phone ?? ""} {...a11y("primary_vet_phone", errors)} />
          <p className="hint">긴급 화면에서 한 번에 전화할 수 있어요.</p>
          <Err name="primary_vet_phone" errors={errors} />
        </div>
      </div>
    </>
  );
}
