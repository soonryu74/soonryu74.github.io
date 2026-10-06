import { useMemo } from 'react';
import { prefillAnswers } from '../engine/facts';
import { go, STEPS } from '../state/router';
import { useStore } from '../state/store';
import { EMPTY_ANSWERS, type Answers } from '../types';

type Key = keyof Answers;
interface Q { key: Key; title: string; help: string; options: { value: string; label: string; desc?: string }[] }

const QUESTIONS: Q[] = [
  { key: 'who', title: '누구를 위한 도움인가요?', help: '가족을 대신해 알아보셔도 괜찮아요.', options: [
    { value: 'self', label: '나를 위한 도움' },
    { value: 'family', label: '가족·지인을 위한 도움', desc: '보호자 모드' },
  ] },
  { key: 'ageBand', title: '도움이 필요한 분의 나이는요?', help: '정확한 나이가 아니어도 돼요. 65세부터 달라지는 제도가 많습니다.', options: [
    { value: 'under60', label: '60세 미만' },
    { value: '60_64', label: '60~64세' },
    { value: '65_74', label: '65~74세' },
    { value: '75_84', label: '75~84세' },
    { value: '85plus', label: '85세 이상' },
    { value: 'unknown', label: '잘 모르겠어요' },
  ] },
  { key: 'livesAlone', title: '혼자 지내시나요?', help: '같이 사는 가족이 있으면 ‘아니요’예요.', options: [
    { value: 'yes', label: '네, 혼자 지내요' },
    { value: 'no', label: '아니요, 같이 사는 가족이 있어요' },
    { value: 'unknown', label: '잘 모르겠어요' },
  ] },
  { key: 'disability', title: '장애 등록이 되어 있나요?', help: '장애인등록증(복지카드)이 있으면 ‘등록’이에요.', options: [
    { value: 'none', label: '장애 등록 없음' },
    { value: 'registered', label: '등록장애인 (지체·시각·청각 등)' },
    { value: 'registered_dev', label: '등록장애인 (발달: 지적·자폐성)' },
    { value: 'applying', label: '등록 신청 중이거나 할 예정' },
    { value: 'unknown', label: '잘 모르겠어요' },
  ] },
  { key: 'ltc', title: '장기요양 등급이 있나요?', help: '국민건강보험공단에서 받는 1~5등급·인지지원등급이에요. 65세 미만이면 ‘없음’을 누르셔도 돼요.', options: [
    { value: 'has_grade', label: '등급이 있어요' },
    { value: 'no_grade', label: '없어요 (신청한 적 없음)' },
    { value: 'unknown', label: '잘 모르겠어요' },
  ] },
  { key: 'mainNeed', title: '지금 가장 필요한 도움은요?', help: '하나만 골라 주세요. 나머지는 ‘추가로 확인’에 함께 보여 드려요.', options: [
    { value: 'care', label: '집에서의 돌봄', desc: '식사·청소·안부·말벗' },
    { value: 'hospital', label: '병원 가기·이동' },
    { value: 'money', label: '생활비·돈' },
    { value: 'energy', label: '전기·가스·난방비' },
    { value: 'daytime', label: '낮 시간 돌봄(장애)' },
    { value: 'medical_cost', label: '큰 병원비' },
    { value: 'safety', label: '혼자 있을 때 안전' },
    { value: 'other', label: '그 외' },
  ] },
  { key: 'urgent', title: '며칠 안에 꼭 해결해야 하는 급한 일인가요?', help: '예: 소득이 끊겨 당장 생활이 어렵다, 큰 병원비가 생겼다.', options: [
    { value: 'yes', label: '네, 급해요' },
    { value: 'no', label: '아니요, 차근차근 알아볼게요' },
    { value: 'unknown', label: '잘 모르겠어요' },
  ] },
];

export default function Questions({ step }: { step: number }) {
  const { answers, patchAnswers, interp } = useStore();
  const q = QUESTIONS[step - 1];
  const pre = useMemo(() => prefillAnswers(EMPTY_ANSWERS, interp), [interp]);
  const value = answers[q.key];
  const prefilled = value != null && pre[q.key] === value;
  const last = step === STEPS;

  function choose(v: string) {
    patchAnswers({ [q.key]: v } as Partial<Answers>);
  }
  function next() {
    if (value == null) return;
    if (last) go('result'); else go(`start/${step + 1}`);
  }

  return (
    <div className="page narrow">
      <p className="progress" aria-live="polite">질문 {step} / {STEPS}</p>
      <div className="stepper" aria-hidden="true">
        {Array.from({ length: STEPS }, (_, i) => <span key={i} className={i < step ? 'on' : ''} />)}
      </div>
      <h1 className="page-title" id={`q-${q.key}`}>{q.title}</h1>
      <p className="lead-sm">{q.help}</p>
      {prefilled && <p className="hint" data-testid="prefilled-hint">말씀하신 내용에서 미리 골랐어요. 맞으면 <b>다음</b>을 누르세요.</p>}

      <div className="options" role="radiogroup" aria-labelledby={`q-${q.key}`}>
        {q.options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={`choice choice-row ${value === o.value ? 'on' : ''}`}
            onClick={() => choose(o.value)}
            data-testid={`opt-${q.key}-${o.value}`}
          >
            <span className="radio" aria-hidden="true" />
            <span><b>{o.label}</b>{o.desc && <span className="choice-desc">{o.desc}</span>}</span>
          </button>
        ))}
      </div>

      <div className="nav-row">
        <a className="btn btn-ghost" href={step === 1 ? '#/' : `#/start/${step - 1}`}>← 뒤로</a>
        <button type="button" className="btn btn-primary" onClick={next} disabled={value == null} data-testid="next-button">
          {last ? '결과 보기' : '다음 →'}
        </button>
      </div>
      {step > 1 && <p className="small muted center"><a href="#/result">지금까지 답한 내용으로 결과 보기</a></p>}
    </div>
  );
}
