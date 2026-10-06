/* 고용24 OPEN API 어댑터
   브라우저에서 고용24 API를 직접 부르지 않는다(인증키 노출·CORS). 대신
   scripts/fetch_work24.py 가 GitHub Actions 에서 수집해 둔 JSON 캐시(data/cache/*.json)를 읽는다.
   캐시가 없으면 DEMO 데이터와 공식 검색 링크를 돌려주고, 화면에는 반드시 DEMO 로 표시된다. */
import { TRAINING, TRAINING_SOURCE } from '../../data/training.js';
import { OPENINGS, OPENINGS_SOURCE } from '../../data/openings.js';

const base = () => (window.REON_CONFIG || {}).CACHE_BASE || 'data/cache';

async function loadCache(name) {
  try {
    const res = await fetch(`${base()}/${name}.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Array.isArray(data.items) || !data.items.length || !data.source) return null;
    return data;
  } catch {
    return null;
  }
}

export async function loadTraining() {
  const cache = await loadCache('training');
  if (cache) return { source: { mode: 'live', label: '고용24 수집 데이터', note: `수집일 ${cache.source.asOf}`, official: TRAINING_SOURCE.official }, items: cache.items };
  return { source: TRAINING_SOURCE, items: TRAINING };
}

export async function loadOpenings() {
  const cache = await loadCache('openings');
  if (cache) return { source: { mode: 'live', label: '고용24 수집 데이터', note: `수집일 ${cache.source.asOf}`, official: OPENINGS_SOURCE.official }, items: cache.items };
  return { source: OPENINGS_SOURCE, items: OPENINGS };
}
