import { useEffect, useState } from 'react';
import { go } from '../state/router';
import { useStore } from '../state/store';
import { CONCERNS } from '../engine/defaults';
import { SERVICE_TYPES } from '../engine/serviceTypes';
import { loadRegions } from '../adapters/publicData';
import type { LtcGrade, ServiceTypeId } from '../types';
import ScheduleEditor from './ScheduleEditor';
import NaturalInput from './NaturalInput';

const TITLES = ['부모님 기본정보', '현재 건강·생활 상태', '현재 이용 중인 서비스', '요일·시간 입력'];

export default function Onboarding({ step }: { step: number }) {
  const { input, isDemo } = useStore();
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => setErrors([]), [step]);

  const validate = (): string[] => {
    if (step !== 1) return [];
    const e: string[] = [];
    const p = input.profile;
    if (p.age === null || p.age < 40 || p.age > 120) e.push('연령을 40~120 사이 숫자로 입력해 주세요.');
    if (!p.sido || !p.sigungu) e.push('거주 시·도와 시·군·구를 선택해 주세요.');
    if (p.livesAlone === null) e.push('혼자 사시는지 선택해 주세요.');
    return e;
  };

  const next = () => {
    const e = validate();
    if (e.length) {
      setErrors(e);
      return;
    }
    if (step < 4) go(`start/${step + 1}`);
    else go('map');
  };

  return (
    <div className="page narrow">
      <div className="stepper" aria-label={`4단계 중 ${step}단계`}>
        {TITLES.map((t, i) => (
          <a
            key={t}
            href={`#/start/${i + 1}`}
            className={`stepper-item ${i + 1 === step ? 'is-current' : ''} ${i + 1 < step ? 'is-done' : ''}`}
            aria-current={i + 1 === step ? 'step' : undefined}
          >
            <span className="stepper-num">{i + 1 < step ? '✓' : i + 1}</span>
            <span className="stepper-label">{t}</span>
          </a>
        ))}
      </div>

      <p className="step-count">STEP {step} / 4</p>
      <h1 className="page-title">{TITLES[step - 1]}</h1>
      {isDemo && <p className="hint">예시 사례가 채워져 있습니다. 그대로 두거나 바꿔 보세요.</p>}

      {step === 1 && <Step1 />}
      {step === 2 && <Step2 />}
      {step === 3 && <Step3 />}
      {step === 4 && <ScheduleEditor />}

      {errors.length > 0 && (
        <div className="error-box" role="alert">
          {errors.map((e) => <p key={e}>{e}</p>)}
        </div>
      )}

      <div className="step-actions">
        {step > 1 ? (
          <a className="btn btn-ghost" href={`#/start/${step - 1}`}>이전</a>
        ) : (
          <a className="btn btn-ghost" href="#/">처음으로</a>
        )}
        <button type="button" className="btn btn-primary" onClick={next}>
          {step < 4 ? '다음' : 'Care Map 만들기'}
        </button>
      </div>
      {step === 4 && input.schedule.length === 0 && (
        <p className="hint center">일정이 없어도 진행할 수 있어요. 이 경우 일주일 전체가 ‘등록된 돌봄 없음’으로 표시됩니다.</p>
      )}
    </div>
  );
}

function Step1() {
  const { input, setInput } = useStore();
  const p = input.profile;
  const [regions, setRegions] = useState<Record<string, { sigungu: string[] }> | null>(null);
  const [loadErr, setLoadErr] = useState('');
  useEffect(() => {
    loadRegions().then((r) => setRegions(r.regions)).catch((e) => setLoadErr(String(e)));
  }, []);
  const setP = (patch: Partial<typeof p>) => setInput((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  const sidoList = regions ? Object.keys(regions) : [];
  const sggList = regions && p.sido ? regions[p.sido]?.sigungu ?? [] : [];

  return (
    <div className="form-stack">
      <div className="field">
        <label htmlFor="age">연령 <span className="req">필수</span></label>
        <div className="input-suffix">
          <input
            id="age" type="number" inputMode="numeric" min={40} max={120} placeholder="예: 82"
            value={p.age ?? ''}
            onChange={(e) => setP({ age: e.target.value === '' ? null : Number(e.target.value) })}
          />
          <span>세</span>
        </div>
        <p className="field-help">정확한 생년월일은 받지 않습니다.</p>
      </div>

      <fieldset className="field">
        <legend>성별</legend>
        <div className="seg">
          {([['female', '여성'], ['male', '남성'], ['unspecified', '선택 안 함']] as const).map(([v, l]) => (
            <label key={v} className={`seg-item ${p.sex === v ? 'on' : ''}`}>
              <input type="radio" name="sex" value={v} checked={p.sex === v} onChange={() => setP({ sex: v })} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field-row">
        <div className="field">
          <label htmlFor="sido">거주 시·도 <span className="req">필수</span></label>
          <select id="sido" value={p.sido} onChange={(e) => setP({ sido: e.target.value, sigungu: '' })} disabled={!regions}>
            <option value="">{regions ? '선택하세요' : '불러오는 중…'}</option>
            {sidoList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sigungu">시·군·구 <span className="req">필수</span></label>
          <select id="sigungu" value={p.sigungu} onChange={(e) => setP({ sigungu: e.target.value })} disabled={!p.sido}>
            <option value="">{p.sido ? '선택하세요' : '시·도를 먼저 선택'}</option>
            {sggList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {loadErr && <p className="error-text">지역 목록을 불러오지 못했습니다: {loadErr}</p>}

      <fieldset className="field">
        <legend>혼자 사시나요? <span className="req">필수</span></legend>
        <div className="seg">
          {([[true, '네, 혼자 사세요'], [false, '아니요, 함께 사는 가족이 있어요']] as const).map(([v, l]) => (
            <label key={String(v)} className={`seg-item ${p.livesAlone === v ? 'on' : ''}`}>
              <input type="radio" name="alone" checked={p.livesAlone === v} onChange={() => setP({ livesAlone: v })} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="grade">장기요양 등급 <span className="opt">선택</span></label>
        <select id="grade" value={p.ltcGrade} onChange={(e) => setP({ ltcGrade: e.target.value as LtcGrade })}>
          <option value="unknown">잘 모르겠어요</option>
          <option value="none">등급 없음 / 신청 안 함</option>
          <option value="1">1등급</option>
          <option value="2">2등급</option>
          <option value="3">3등급</option>
          <option value="4">4등급</option>
          <option value="5">5등급</option>
          <option value="cognitive">인지지원등급</option>
        </select>
        <p className="field-help">CareGap은 등급을 판정하지 않습니다. 서비스 안내에만 참고합니다.</p>
      </div>
    </div>
  );
}

function Step2() {
  const { input, setInput } = useStore();
  return (
    <div className="form-stack">
      <p className="lead-sm">해당하는 것을 모두 골라 주세요. 진단이 아니라 <b>가족이 느끼는 걱정</b>을 적는 단계입니다.</p>
      <div className="check-list">
        {CONCERNS.map((c) => (
          <label key={c.id} className={`check-item ${input.concerns[c.id] ? 'on' : ''}`}>
            <input
              type="checkbox"
              checked={input.concerns[c.id]}
              onChange={(e) => setInput((prev) => ({ ...prev, concerns: { ...prev.concerns, [c.id]: e.target.checked } }))}
            />
            <span className="box" aria-hidden="true" />
            <span>{c.label}</span>
          </label>
        ))}
      </div>
      <NaturalInput />
    </div>
  );
}

function Step3() {
  const { input, setInput } = useStore();
  const opts = SERVICE_TYPES.filter((t) => t.onboarding);
  const toggle = (id: ServiceTypeId, on: boolean) =>
    setInput((prev) => ({
      ...prev,
      servicesInUse: on ? [...new Set([...prev.servicesInUse, id])] : prev.servicesInUse.filter((x) => x !== id),
    }));
  return (
    <div className="form-stack">
      <p className="lead-sm">지금 이용하고 있는 것을 모두 골라 주세요. 시간이 정해진 서비스는 다음 단계에서 요일·시간을 적습니다.</p>
      <div className="check-list">
        {opts.map((t) => (
          <label key={t.id} className={`check-item ${input.servicesInUse.includes(t.id) ? 'on' : ''}`}>
            <input type="checkbox" checked={input.servicesInUse.includes(t.id)} onChange={(e) => toggle(t.id, e.target.checked)} />
            <span className="box" aria-hidden="true" />
            <span>
              {t.label === '기타(사람이 함께하는 일정)' ? '기타' : t.label}
              {t.continuous && <small className="muted"> — 시간 입력 없이 상시 서비스로 반영</small>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

