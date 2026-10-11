import { useMemo } from 'react';
import { useStore } from '../state/store';
import { computeFacts } from '../engine/facts';
import { formatFact } from '../engine/evaluate';
import CareMap from './CareMap';
import NeedsInput from './NeedsInput';

export default function CareMapPage() {
  const { input, hasData } = useStore();
  const facts = useMemo(() => computeFacts(input), [input]);
  if (!hasData) return <NeedsInput />;
  const alone = input.profile.livesAlone === true;
  const care = facts['time.weeklyCareHours'] as number;

  return (
    <div className="page">
      <p className="eyebrow">STEP 결과 1 · 일주일 돌봄 지도</p>
      <h1 className="page-title">Care Map</h1>
      <p className="lead-sm">일주일 168시간 중, 등록된 일정으로 누가 언제 곁에 있는지 보여드립니다.</p>

      <div className="stat-row">
        <div className="stat"><span className="stat-label">사람이 함께하는 시간</span><b>{formatFact('time.weeklyCareHours', care)}</b><small>168시간 중</small></div>
        {alone ? (
          <>
            <div className="stat"><span className="stat-label">낮(09–18시) 혼자 계신 시간</span><b>{formatFact('time.dayAloneHours', facts['time.dayAloneHours'])}</b><small>63시간 중</small></div>
            <div className="stat"><span className="stat-label">저녁·야간(18–09시) 혼자 계신 시간</span><b>{formatFact('time.nightAloneHours', facts['time.nightAloneHours'])}</b><small>105시간 중</small></div>
          </>
        ) : (
          <div className="stat"><span className="stat-label">함께 사는 가족</span><b>있음</b><small>혼자 계신 시간은 계산하지 않음</small></div>
        )}
        <div className="stat"><span className="stat-label">사람이 오는 일정이 없는 요일</span><b>{formatFact('time.daysWithoutVisit', facts['time.daysWithoutVisit'])}</b><small>{String(facts['time.daysWithoutVisitList'])}</small></div>
      </div>

      <CareMap schedule={input.schedule} livesAlone={alone} />

      <div className="step-actions">
        <a className="btn btn-ghost" href="#/start/4">일정 수정</a>
        <a className="btn btn-primary" href="#/result">확인 필요한 영역 보기</a>
      </div>
    </div>
  );
}
