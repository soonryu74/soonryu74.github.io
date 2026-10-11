import { useMemo } from 'react';
import catalog from '../data/services_catalog.json';
import { useStore } from '../state/store';
import { DOMAINS, evaluate } from '../engine/evaluate';
import NearbyInstitutions from './NearbyInstitutions';
import { STATUS_MARK, STATUS_TEXT } from './Results';

type Svc = (typeof catalog.services)[number];
const SVC = new Map(catalog.services.map((s) => [s.id, s]));

export default function Services({ domainId }: { domainId?: string }) {
  const { input, hasData } = useStore();
  const result = useMemo(() => evaluate(input), [input]);
  const domain = DOMAINS.find((d) => d.id === domainId);
  const dr = result.domains.find((d) => d.domain.id === domainId);

  const ids = domain ? domain.services : [...new Set(result.domains.filter((d) => d.status === 'needs_confirmation').flatMap((d) => d.domain.services))];
  const services = ids.map((id) => SVC.get(id)).filter(Boolean) as Svc[];
  const ltcTypes = domain ? domain.ltcTypes : [];
  const showDementia = !domain || domain.id === 'cognition';
  const showHealth = !domain || ['meds', 'cognition', 'fall'].includes(domain.id);

  return (
    <div className="page narrow">
      <p className="eyebrow">STEP 결과 3 · 서비스 연결</p>
      <h1 className="page-title">{domain ? `${domain.icon} ${domain.label} — 관련 서비스` : '관련 서비스 찾아보기'}</h1>
      {dr && (
        <p className={`badge badge-${dr.status}`}><span className="badge-mark" aria-hidden="true">{STATUS_MARK[dr.status]}</span>{STATUS_TEXT[dr.status]}</p>
      )}
      {dr && <p className="lead-sm">{dr.reason}</p>}
      {!domain && (
        <>
          <p className="lead-sm">‘확인 필요’로 나온 영역과 관련된 공공·지역 서비스입니다. 영역을 골라 자세히 볼 수도 있어요.</p>
          <div className="chip-row">
            {result.domains.map((d) => (
              <a key={d.domain.id} className={`chip chip-${d.status}`} href={`#/services/${d.domain.id}`}>
                <span aria-hidden="true">{d.domain.icon}</span> {d.domain.label}
                {d.status === 'needs_confirmation' && <span className="sr-only"> (확인 필요)</span>}
                {d.status === 'needs_confirmation' && <span className="chip-mark" aria-hidden="true">!</span>}
              </a>
            ))}
          </div>
        </>
      )}

      <div className="notice">
        <span className="tag tag-curated">안내 정보(수기 정리·공식 링크)</span><br />
        <b>공공데이터 API가 아닌 안내 정보입니다.</b> 아래 서비스는 공식 누리집으로 연결하는 안내이며, CareGap이 서비스를 처방하거나 대상 여부를 판정하지 않습니다.
        대상·비용·운영 여부는 지역과 시점에 따라 다르니 <b>반드시 공식 창구에서 확인</b>하세요. (안내 정보 확인일 {catalog.checkedAt})
      </div>

      {services.length === 0 ? (
        <p className="empty">현재 ‘확인 필요’ 영역이 없어 표시할 서비스가 없습니다. 위에서 영역을 골라 보세요.</p>
      ) : (
        <ul className="svc-list">
          {services.map((s) => (
            <li key={s.id} className="svc-card" data-testid={`svc-${s.id}`}>
              <h3>{s.name}</h3>
              <p className="svc-op">{s.operator} · {s.kind === 'national' ? '전국 공통 제도' : '지역별 운영 상이'}</p>
              <p>{s.summary}</p>
              <dl className="svc-dl">
                <dt>신청·문의</dt><dd>{s.howTo}</dd>
                <dt>연락처</dt><dd>{s.contact}</dd>
              </dl>
              <a className="btn btn-outline btn-sm" href={s.url} target="_blank" rel="noopener noreferrer">{s.urlLabel} ↗</a>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title">우리 동네 기관</h2>
      {hasData && input.profile.sido && input.profile.sigungu ? (
        <NearbyInstitutions
          sido={input.profile.sido}
          sigungu={input.profile.sigungu}
          ltcTypes={ltcTypes}
          showDementia={showDementia}
          showHealth={showHealth}
        />
      ) : (
        <p className="empty">1단계에서 거주 지역을 선택하면 해당 시·군·구 기관을 보여드립니다. <a href="#/start/1">지역 입력</a></p>
      )}

      <div className="step-actions">
        <a className="btn btn-ghost" href="#/result">결과로 돌아가기</a>
        <a className="btn btn-primary" href="#/share">가족과 공유</a>
      </div>
    </div>
  );
}
