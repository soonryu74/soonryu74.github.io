import emergency from '../data/emergency.json';
import { TAG_LABEL } from '../engine/facts';
import { buildSpeechText } from '../engine/share';
import { useStore } from '../state/store';
import type { EmergencyContact, Scored } from '../types';
import { OfficialLink, PhoneLink, SafetyNotice, SpeakButton, StatusBadge } from './shared';

function Card({ s, n }: { s: Scored; n: number }) {
  const sv = s.service;
  return (
    <li className="svc-card" data-testid={`card-${sv.id}`} data-status={s.status}>
      <div className="svc-head">
        <span className="num" aria-hidden="true">{n}</span>
        <div>
          <h3 className="svc-name">{sv.name_easy}</h3>
          <p className="svc-formal">{sv.name}</p>
        </div>
      </div>
      <StatusBadge status={s.status} />
      <p className="svc-line">{sv.one_line}</p>
      <p className="svc-why"><b>왜 확인하나요?</b> {sv.why}</p>
      <dl className="svc-dl">
        <dt>신청·문의</dt>
        <dd>{sv.apply.channel[0]}{sv.apply.phone && <> · <PhoneLink phone={sv.apply.phone} label={sv.apply.phone_label} /></>}</dd>
        <dt>방법</dt>
        <dd>{sv.apply.methods.join(' · ')}</dd>
        <dt>준비할 것</dt>
        <dd>{sv.documents.slice(0, 2).join(', ')}{sv.documents.length > 2 ? ' 등' : ''}</dd>
      </dl>
      <div className="row-gap">
        <a className="btn btn-soft" href={`#/service/${sv.id}`}>자세히 보기</a>
        <OfficialLink service={sv} />
      </div>
    </li>
  );
}

export default function Results() {
  const { rec, plan, answers, reset, hasInput } = useStore();
  const contacts = emergency as EmergencyContact[];
  const chips = rec.tags.map((t) => TAG_LABEL[t]);

  return (
    <div className="page narrow">
      {rec.emergency && (
        <section className="urgent" role="alert" data-testid="urgent-panel">
          <h2>급한 상황이면 먼저 전화하세요</h2>
          <div className="row-gap">
            {contacts.filter((c) => ['119', '129', '109'].includes(c.phone)).map((c) => (
              <PhoneLink key={c.phone} phone={c.phone} label={c.label} big />
            ))}
          </div>
          <p className="small">129는 긴급복지·학대·정신건강 상담을 24시간 받습니다. <a href="#/emergency">다른 연락처 보기</a></p>
        </section>
      )}

      <p className="eyebrow">결과</p>
      <h1 className="page-title">지금 먼저 확인할 지원</h1>
      {chips.length > 0 ? (
        <p className="lead-sm" data-testid="result-summary">입력하신 상황: {chips.join(' · ')}{answers.who === 'family' ? ' · 가족이 대신 알아봄' : ''}</p>
      ) : (
        <p className="lead-sm" data-testid="result-summary">아직 입력된 상황이 없어요.</p>
      )}
      <div className="row-gap">
        <SpeakButton text={buildSpeechText(rec, plan)} label="결과 읽어주기" />
        <a className="btn btn-ghost" href="#/start/1">답변 고치기</a>
      </div>

      {rec.primary.length === 0 ? (
        <div className="empty" data-testid="empty-result">
          <p><b>지금 정보만으로는 맞는 제도를 고르기 어려워요.</b></p>
          <p>{hasInput ? '질문에 몇 가지만 더 답해 주시면 좁혀 드릴게요.' : '처음 화면에서 상황을 적거나 예시를 눌러 주세요.'} 전화로 바로 상담받으려면 <PhoneLink phone="129" label="보건복지상담센터" />에 거시면 됩니다.</p>
          <div className="row-gap"><a className="btn btn-primary" href="#/start/1">질문에 답하기</a><a className="btn btn-ghost" href="#/">처음으로</a></div>
        </div>
      ) : (
        <ol className="svc-list" data-testid="primary-list">
          {rec.primary.map((s, i) => <Card key={s.service.id} s={s} n={i + 1} />)}
        </ol>
      )}

      {rec.primary.length > 0 && (
        <div className="cta-box">
          <a className="btn btn-primary btn-lg btn-block" href="#/today" data-testid="today-button">오늘 할 일 1·2·3 보기 →</a>
        </div>
      )}

      {rec.secondary.length > 0 && (
        <section aria-labelledby="more-title">
          <h2 id="more-title" className="section-title">추가로 확인할 서비스</h2>
          <ul className="more-list" data-testid="secondary-list">
            {rec.secondary.map((s) => (
              <li key={s.service.id}>
                <a href={`#/service/${s.service.id}`}><b>{s.service.name_easy}</b> <span className="muted small">{s.service.name}</span></a>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <SafetyNotice />
      <p className="small muted center"><button type="button" className="link" onClick={() => { reset(); window.location.hash = '#/'; }}>처음부터 다시 하기(입력 지우기)</button></p>
    </div>
  );
}
