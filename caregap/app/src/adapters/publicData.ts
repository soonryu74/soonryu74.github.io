/**
 * 공공데이터 어댑터.
 * - 실제 데이터 파일이 있으면 그 내용을, 없으면 status:'not_connected' 를 돌려준다.
 * - 데이터가 없을 때 0건·가짜 기관으로 채우지 않는다(화면에서 '출처 확인 중'으로 표시).
 * 파일은 caregap/scripts/ 의 수집 스크립트가 만든다(API 키는 빌드 환경에만 존재).
 */

export interface SourceMeta {
  name: string;
  provider: string;
  url: string;
  license?: string;
  note?: string;
}

export type DatasetStatus = 'connected' | 'not_connected' | 'error';

export interface Institution {
  name: string;
  kind: string; // 서비스 종류(급여종류 등)
  sigungu: string;
  address?: string;
  phone?: string;
  grade?: string;
  basis: string; // 데이터 기준(평가연도 등)
}

export interface DatasetResult {
  key: DatasetKey;
  label: string;
  status: DatasetStatus;
  source?: SourceMeta;
  /** 데이터 기준일 / 수집일 */
  asOf?: string;
  items: Institution[];
  message?: string;
  officialFinder: { label: string; url: string };
}

export type DatasetKey = 'ltc' | 'dementia' | 'health_center';

interface RegionsFile {
  source: SourceMeta;
  builtAt: string;
  count: number;
  evalYears: [number, number] | null;
  regions: Record<string, { file: string; sigungu: string[] }>;
}

const cache = new Map<string, Promise<unknown>>();
function getJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    );
  }
  const p = cache.get(path) as Promise<T>;
  p.catch(() => cache.delete(path));
  return p;
}

export function loadRegions(): Promise<RegionsFile> {
  return getJson<RegionsFile>('./data/regions.json');
}

export const FINDERS: Record<DatasetKey, { label: string; url: string }> = {
  ltc: { label: '노인장기요양보험 누리집 — 장기요양기관 찾기', url: 'https://www.longtermcare.or.kr' },
  dementia: { label: '중앙치매센터 — 치매안심센터 찾기', url: 'https://www.nid.or.kr' },
  health_center: { label: '정부24 — 보건소 찾기', url: 'https://www.gov.kr' },
};

const LABELS: Record<DatasetKey, string> = {
  ltc: '장기요양기관',
  dementia: '치매안심센터',
  health_center: '보건소',
};

export async function loadLtc(sido: string, sigungu: string): Promise<DatasetResult> {
  const base = { key: 'ltc' as const, label: LABELS.ltc, officialFinder: FINDERS.ltc };
  try {
    const regions = await loadRegions();
    const r = regions.regions[sido];
    if (!r) return { ...base, status: 'not_connected', items: [], message: '선택한 시·도의 데이터가 없습니다.' };
    const file = await getJson<{ source: SourceMeta; items: { n: string; t: string; g: string; gr?: string; y?: number }[] }>(
      `./data/ltc/${r.file}`,
    );
    const items = file.items
      .filter((x) => x.g === sigungu)
      .map((x) => ({ name: x.n, kind: x.t, sigungu: x.g, grade: x.gr, basis: x.y ? `${x.y}년 평가` : '평가연도 미상' }));
    const years = regions.evalYears ? `${regions.evalYears[0]}~${regions.evalYears[1]}년 평가` : undefined;
    return { ...base, status: 'connected', source: file.source, asOf: years, items };
  } catch (e) {
    return { ...base, status: 'error', items: [], message: `데이터를 불러오지 못했습니다 (${String(e)})` };
  }
}

/** 치매안심센터·보건소: 수집 파일(data/<key>.json)이 있을 때만 연결. 없으면 미연결로 표시. */
export async function loadOptional(key: 'dementia' | 'health_center', sido: string, sigungu: string): Promise<DatasetResult> {
  const base = { key, label: LABELS[key], officialFinder: FINDERS[key] };
  let res: Response;
  try {
    res = await fetch(`./data/${key}.json`);
  } catch {
    return { ...base, status: 'not_connected', items: [], message: '서비스 정보 출처 확인 중' };
  }
  // 파일이 없으면 404, 일부 정적 서버는 index.html(200)을 돌려주므로 JSON 여부도 확인
  if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) {
    return { ...base, status: 'not_connected', items: [], message: '서비스 정보 출처 확인 중' };
  }
  try {
    const file = (await res.json()) as { source: SourceMeta; fetchedAt: string; items: (Institution & { sido: string })[] };
    const items = file.items.filter((x) => x.sido === sido && (x.sigungu === sigungu || sigungu.startsWith(x.sigungu)));
    return { ...base, status: 'connected', source: file.source, asOf: `${file.fetchedAt} 수집`, items };
  } catch (e) {
    return { ...base, status: 'error', items: [], message: `데이터 형식 오류 (${String(e)})` };
  }
}
