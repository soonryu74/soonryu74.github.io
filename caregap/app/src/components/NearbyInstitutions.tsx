import { useEffect, useMemo, useState } from 'react';
import { loadLtc, loadOptional, type DatasetResult } from '../adapters/publicData';

const PAGE = 8;

export default function NearbyInstitutions(props: {
  sido: string;
  sigungu: string;
  ltcTypes: string[];
  showDementia: boolean;
  showHealth: boolean;
}) {
  const { sido, sigungu, ltcTypes, showDementia, showHealth } = props;
  const [ltc, setLtc] = useState<DatasetResult | null>(null);
  const [others, setOthers] = useState<DatasetResult[]>([]);

  useEffect(() => {
    let alive = true;
    setLtc(null);
    loadLtc(sido, sigungu).then((r) => alive && setLtc(r));
    const jobs: Promise<DatasetResult>[] = [];
    if (showDementia) jobs.push(loadOptional('dementia', sido, sigungu));
    if (showHealth) jobs.push(loadOptional('health_center', sido, sigungu));
    Promise.all(jobs).then((r) => alive && setOthers(r));
    return () => {
      alive = false;
    };
  }, [sido, sigungu, showDementia, showHealth]);

  return (
    <div className="nearby">
      <p className="muted">{sido} {sigungu} 기준 · 지도 없이 목록으로 보여드립니다.</p>
      {ltc ? <LtcBlock data={ltc} types={ltcTypes} /> : <p className="loading">장기요양기관 불러오는 중…</p>}
      {others.map((d) => <DatasetBlock key={d.key} data={d} />)}
    </div>
  );
}

function StatusTag({ d }: { d: DatasetResult }) {
  if (d.status === 'connected') return <span className="tag tag-real">공공데이터 · 실제 데이터</span>;
  if (d.status === 'error') return <span className="tag tag-warn">불러오기 실패</span>;
  return <span className="tag tag-pending">서비스 정보 출처 확인 중</span>;
}

function SourceLine({ d }: { d: DatasetResult }) {
  if (!d.source) return null;
  return (
    <p className="source-line">
      출처: <a href={d.source.url} target="_blank" rel="noopener noreferrer">{d.source.name}</a> ({d.source.provider})
      {d.asOf && <> · 데이터 기준: {d.asOf}</>}
      {d.source.note && <><br />{d.source.note}</>}
    </p>
  );
}

function NotConnected({ d }: { d: DatasetResult }) {
  return (
    <div className="not-connected" data-testid={`dataset-${d.key}-missing`}>
      <p>
        {d.label} 공공데이터는 아직 이 서비스에 연결되지 않았습니다. 기관 수를 0으로 표시하거나 임의로 채우지 않습니다.
        {d.message && d.status === 'error' && <><br />{d.message}</>}
      </p>
      <a className="btn btn-outline btn-sm" href={d.officialFinder.url} target="_blank" rel="noopener noreferrer">{d.officialFinder.label} ↗</a>
    </div>
  );
}

function LtcBlock({ data, types }: { data: DatasetResult; types: string[] }) {
  const allTypes = useMemo(() => [...new Set(data.items.map((i) => i.kind))].sort(), [data]);
  const initial = types.find((t) => allTypes.includes(t)) ?? '';
  const [type, setType] = useState(initial);
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { setType(initial); setShown(PAGE); }, [initial]);

  const list = data.items.filter((i) => !type || i.kind === type);
  return (
    <section className="dataset" data-testid="dataset-ltc">
      <div className="dataset-head">
        <h3>장기요양기관</h3>
        <StatusTag d={data} />
      </div>
      {data.status !== 'connected' ? (
        <NotConnected d={data} />
      ) : (
        <>
          <div className="field inline-field">
            <label htmlFor="ltc-type">서비스 종류</label>
            <select id="ltc-type" value={type} onChange={(e) => { setType(e.target.value); setShown(PAGE); }}>
              <option value="">전체 ({data.items.length})</option>
              {allTypes.map((t) => <option key={t} value={t}>{t} ({data.items.filter((i) => i.kind === t).length})</option>)}
            </select>
          </div>
          {list.length === 0 ? (
            <p className="empty">원자료에 이 지역의 해당 종류 기관이 없습니다. 원자료는 평가를 받은 기관만 포함하므로 실제 기관이 더 있을 수 있습니다.</p>
          ) : (
            <ul className="inst-list">
              {list.slice(0, shown).map((i, idx) => (
                <li key={`${i.name}-${idx}`} className="inst-card">
                  <b className="inst-name">{i.name}</b>
                  <span className="inst-kind">{i.kind}</span>
                  <dl>
                    <dt>주소</dt><dd className="muted">원자료 미포함 — 공식 누리집에서 확인</dd>
                    <dt>전화</dt><dd className="muted">원자료 미포함</dd>
                    <dt>공단 평가</dt><dd>{i.grade ?? '—'} ({i.basis})</dd>
                  </dl>
                </li>
              ))}
            </ul>
          )}
          {shown < list.length && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShown(shown + PAGE * 2)}>더 보기 ({list.length - shown}곳 남음)</button>
          )}
          <SourceLine d={data} />
          <p className="muted small">목록 순서는 가나다순이며 추천·보증이 아닙니다. <a href={data.officialFinder.url} target="_blank" rel="noopener noreferrer">{data.officialFinder.label} ↗</a></p>
        </>
      )}
    </section>
  );
}

function DatasetBlock({ data }: { data: DatasetResult }) {
  return (
    <section className="dataset" data-testid={`dataset-${data.key}`}>
      <div className="dataset-head">
        <h3>{data.label}</h3>
        <StatusTag d={data} />
      </div>
      {data.status !== 'connected' ? (
        <NotConnected d={data} />
      ) : data.items.length === 0 ? (
        <p className="empty">수집된 자료에서 이 시·군·구의 {data.label}을(를) 찾지 못했습니다. <a href={data.officialFinder.url} target="_blank" rel="noopener noreferrer">공식 누리집 확인 ↗</a></p>
      ) : (
        <ul className="inst-list">
          {data.items.map((i, idx) => (
            <li key={`${i.name}-${idx}`} className="inst-card">
              <b className="inst-name">{i.name}</b>
              <span className="inst-kind">{i.kind}</span>
              <dl>
                <dt>주소</dt><dd>{i.address ?? '—'}</dd>
                <dt>전화</dt><dd>{i.phone ? <a href={`tel:${i.phone}`}>{i.phone}</a> : '—'}</dd>
                <dt>기준</dt><dd>{i.basis}</dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
      <SourceLine d={data} />
    </section>
  );
}
