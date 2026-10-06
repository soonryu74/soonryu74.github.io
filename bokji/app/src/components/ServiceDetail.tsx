import { serviceById } from '../engine/recommend';
import { useStore } from '../state/store';
import { BackLink, OfficialLink, PhoneLink, SafetyNotice, SpeakButton, StatusBadge } from './shared';

export default function ServiceDetail({ id }: { id: string }) {
  const { rec } = useStore();
  const sv = serviceById(id);
  if (!sv) {
    return (
      <div className="page narrow">
        <BackLink href="#/result">결과로</BackLink>
        <h1 className="page-title">서비스를 찾을 수 없어요</h1>
        <p>목록에 없는 서비스예요. <a href="#/result">결과 화면</a>으로 돌아가 주세요.</p>
      </div>
    );
  }
  const scored = [...rec.primary, ...rec.secondary].find((s) => s.service.id === id);
  const speech = `${sv.name_easy}. ${sv.one_line} ${sv.summary_easy} 신청은 ${sv.apply.channel.join(', ')}. ${sv.apply.phone ? `전화 ${sv.apply.phone}.` : ''} 준비할 것: ${sv.documents.join(', ')}.`;

  return (
    <div className="page narrow">
      <BackLink href="#/result">결과로</BackLink>
      <p className="eyebrow">{sv.category}</p>
      <h1 className="page-title">{sv.name_easy}</h1>
      <p className="svc-formal">{sv.name}</p>
      {scored && <StatusBadge status={scored.status} />}
      <div className="row-gap" style={{ marginTop: 12 }}>
        <SpeakButton text={speech} />
      </div>

      <section className="card">
        <h2 className="h3">어떤 제도인가요?</h2>
        <p>{sv.one_line}</p>
        <p>{sv.summary_easy}</p>
        <p><b>왜 확인하나요?</b> {sv.why}</p>
        {scored && scored.reasons.length > 0 && (
          <p className="small muted">이 카드가 나온 이유: {scored.reasons.join(', ')}</p>
        )}
      </section>

      <section className="card">
        <h2 className="h3">어디에, 어떻게 신청하나요?</h2>
        <ul className="plain">
          {sv.apply.channel.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <p>가능한 방법: <b>{sv.apply.methods.join(' · ')}</b></p>
        {sv.apply.phone ? (
          <p><PhoneLink phone={sv.apply.phone} label={sv.apply.phone_label} big />{sv.apply.phone_hours && <span className="small muted"> {sv.apply.phone_hours}</span>}</p>
        ) : (
          <p className="muted">{sv.apply.phone_label ?? '전화 문의처는 지역에 따라 다릅니다.'}</p>
        )}
        {sv.what_to_say && <p className="say-box"><b>이렇게 말해 보세요</b><br />{sv.what_to_say}</p>}
      </section>

      <section className="card">
        <h2 className="h3">준비할 것</h2>
        <ul>{sv.documents.map((d) => <li key={d}>{d}</li>)}</ul>
        <p className="small muted">서류는 기관과 상황에 따라 다를 수 있어요. 전화로 먼저 물어보면 헛걸음을 줄일 수 있습니다.</p>
      </section>

      <section className="card">
        <h2 className="h3">대상 기준(요약)</h2>
        <p>{sv.eligibility_note}</p>
        <div className="row-gap">
          <OfficialLink service={sv} className="btn btn-primary" />
          {sv.official_links.map((l) => (
            <a key={l.url} className="btn btn-ghost" href={l.url} target="_blank" rel="noopener noreferrer">{l.label} <span aria-hidden="true">↗</span></a>
          ))}
        </div>
        <p className="small muted">출처: {sv.source_org} · 확인일 {sv.verified_at}{sv.official_url_label ? ` · ${sv.official_url_label}` : ''}</p>
      </section>

      <SafetyNotice />
      <div className="row-gap">
        <a className="btn btn-ghost" href="#/result">← 결과로</a>
        <a className="btn btn-primary" href="#/today">오늘 할 일 보기</a>
      </div>
    </div>
  );
}
