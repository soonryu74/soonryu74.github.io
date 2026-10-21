/* SportsGap AI — 점수 엔진 (순수 함수, 브라우저·Node 공용)
 *
 * 입력은 data/regions.json 의 원값. 여기서 하는 일:
 *  1) 지역별 원지표 계산 (공급량·추정거리·취약인구비율·대중교통밀도)
 *  2) 0~100 정규화 (P5~P95 윈저라이즈 후 min-max; 높을수록 '격차가 큼')
 *  3) 가중 합성 점수·순위
 *  4) 예산 시나리오(탐욕 배분)와 규칙 기반 정책 제안
 *
 * LLM을 쓰지 않는다. '제안'은 지표 템플릿 규칙의 결과다.
 */

export const INDICATORS = [
  { key: 'shortage', label: '시설 부족도', unit: '시설/1만 명', desc: '인구 1만 명당 시설 수의 역순. 적을수록 점수↑', inverse: true },
  { key: 'distance', label: '접근거리 불리함', unit: 'km(추정)', desc: '0.5×√(면적÷시설 수) 평균 최근접 직선거리 추정. 멀수록 점수↑', inverse: false },
  { key: 'vulnerable', label: '취약인구 비율', unit: '%', desc: '선택한 집단(65세 이상 또는 0~14세) 비율. 높을수록 점수↑', inverse: false },
  { key: 'transit', label: '대중교통 접근 밀도', unit: '정류장/㎢', desc: '버스정류장 밀도의 역순. 낮을수록 점수↑', inverse: true },
];

export const DEFAULT_WEIGHTS = { shortage: 35, distance: 30, vulnerable: 20, transit: 15 };

export const GROUPS = {
  elder: { label: '고령자(65세 이상)', pop: 'pop_elder_65p', scope: 'elder', available: true },
  child: { label: '아동(0~14세)', pop: 'pop_child_0_14', scope: 'child', available: true },
  disabled: { label: '장애인', pop: null, scope: null, available: false, reason: '시군별 등록장애인·무장애 시설 데이터 미확보 → 평가불가' },
};

export const SCOPES = {
  all: { label: '주요 공공체육시설 전체(23분류)', field: 'facilities_total' },
  life: { label: '생활밀착형(체육관·수영장·축구장·테니스장·게이트볼장 등)', field: 'facilities_life' },
  elder: { label: '고령친화형(게이트볼장·파크골프장·생활체육관·수영장)', field: 'facilities_elder' },
  child: { label: '아동친화형(수영장·축구장·풋살장·체육관·빙상장 등)', field: 'facilities_child' },
};

export const CLIP = { low: 5, high: 95 };

/** 선형보간 백분위 */
export function percentile(sorted, p) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const pos = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** null 을 건너뛰고 P5~P95로 자른 뒤 0~100 min-max. inverse 면 작을수록 100 */
export function normalize(values, inverse = false) {
  const valid = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (valid.length < 2) return values.map((v) => (typeof v === 'number' ? 50 : null));
  const lo = percentile(valid, CLIP.low), hi = percentile(valid, CLIP.high);
  return values.map((v) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    const c = Math.min(hi, Math.max(lo, v));
    const s = hi === lo ? 50 : ((c - lo) / (hi - lo)) * 100;
    return Math.round((inverse ? 100 - s : s) * 10) / 10;
  });
}

export function facilityCount(region, scope, extra = 0) {
  const f = (SCOPES[scope] || SCOPES.all).field;
  return (region[f] || 0) + extra;
}

/** 지역 하나의 원지표 */
export function rawIndicators(region, { scope = 'all', group = 'elder' } = {}, extra = 0) {
  const fac = facilityCount(region, scope, extra);
  const pop = region.pop_total;
  const g = GROUPS[group];
  const vulnPop = g && g.pop ? region[g.pop] : null;
  return {
    facilities: fac,
    supply_per_10k: pop > 0 ? (fac / pop) * 10000 : null,
    est_km: fac > 0 && region.area_km2 > 0 ? 0.5 * Math.sqrt(region.area_km2 / fac) : null,
    vuln_ratio: vulnPop != null && pop > 0 ? (vulnPop / pop) * 100 : null,
    transit_density: typeof region.bus_stops === 'number' && region.area_km2 > 0 ? region.bus_stops / region.area_km2 : null,
  };
}

function weightSum(w) {
  return INDICATORS.reduce((s, i) => s + (Number(w[i.key]) > 0 ? Number(w[i.key]) : 0), 0);
}

/**
 * 모든 지역 점수화.
 * @param regions data/regions.json 의 regions
 * @param options { scope, group, weights, extras: {지역명: 추가 시설 수} }
 */
export function scoreRegions(regions, options = {}) {
  const scope = options.scope || 'all';
  const group = options.group || 'elder';
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights || {}) };
  const extras = options.extras || {};
  const wsum = weightSum(weights);

  const raws = regions.map((r) => rawIndicators(r, { scope, group }, extras[r.name] || 0));
  const norm = {
    shortage: normalize(raws.map((x) => x.supply_per_10k), true),
    distance: normalize(raws.map((x) => x.est_km), false),
    vulnerable: normalize(raws.map((x) => x.vuln_ratio), false),
    transit: normalize(raws.map((x) => x.transit_density), true),
  };

  const out = regions.map((r, i) => {
    const scores = {};
    let composite = 0;
    let status = 'ok';
    const missing = [];
    for (const ind of INDICATORS) {
      const w = Number(weights[ind.key]) > 0 ? Number(weights[ind.key]) : 0;
      const s = norm[ind.key][i];
      scores[ind.key] = s;
      if (w === 0) continue;
      if (s == null) { status = 'na'; missing.push(ind.key); continue; }
      composite += (w / wsum) * s;
    }
    if (wsum === 0) status = 'na';
    return {
      name: r.name,
      code: r.code,
      raw: raws[i],
      scores,
      composite: status === 'ok' ? Math.round(composite * 10) / 10 : null,
      status,
      missing,
      extra: extras[r.name] || 0,
    };
  });

  const ranked = out.filter((x) => x.status === 'ok').sort((a, b) => b.composite - a.composite || a.name.localeCompare(b.name, 'ko'));
  ranked.forEach((x, i) => { x.rank = i + 1; });
  out.filter((x) => x.status !== 'ok').forEach((x) => { x.rank = null; });
  return { scope, group, weights, wsum, results: out, ranked };
}

/** 도 중앙값·평균 등 비교 기준 */
export function summary(results) {
  const pick = (f) => results.map(f).filter((v) => typeof v === 'number').sort((a, b) => a - b);
  const med = (arr) => percentile(arr, 50);
  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const s = {
    supply_per_10k: pick((r) => r.raw.supply_per_10k),
    est_km: pick((r) => r.raw.est_km),
    vuln_ratio: pick((r) => r.raw.vuln_ratio),
    transit_density: pick((r) => r.raw.transit_density),
  };
  const o = {};
  for (const k of Object.keys(s)) o[k] = { median: med(s[k]), mean: mean(s[k]), min: s[k][0], max: s[k][s[k].length - 1] };
  return o;
}

/**
 * 예산 시나리오: 예산(억 원)÷단가(억 원/개소) = 추가 가능 시설 수 n.
 * n개를 한 개씩, 한계효과가 가장 큰 지역에 배분(탐욕). objective='people'(기본)은 점수 감소폭×인구(만 명),
 * objective='score'는 점수 감소폭만 본다.
 * 후보를 candidates 로 제한할 수 있다(미지정 시 전체).
 */
export function simulateBudget(regions, options, { budgetEok, unitCostEok, candidates = null, maxUnits = 60, objective = 'people' } = {}) {
  const n = unitCostEok > 0 ? Math.min(maxUnits, Math.floor(budgetEok / unitCostEok)) : 0;
  const before = scoreRegions(regions, options);
  const extras = { ...(options.extras || {}) };
  const steps = [];
  const cand = new Set(candidates && candidates.length ? candidates : regions.map((r) => r.name));
  for (let k = 0; k < n; k++) {
    let best = null;
    const base = scoreRegions(regions, { ...options, extras });
    const baseMap = Object.fromEntries(base.results.map((r) => [r.name, r]));
    for (const r of regions) {
      if (!cand.has(r.name) || baseMap[r.name].status !== 'ok') continue;
      const trial = scoreRegions(regions, { ...options, extras: { ...extras, [r.name]: (extras[r.name] || 0) + 1 } });
      const t = trial.results.find((x) => x.name === r.name);
      const drop = baseMap[r.name].composite - (t.composite ?? baseMap[r.name].composite);
      // objective: 'score' = 점수 감소폭, 'people' = 감소폭 × 인구(만 명) → 수혜 규모 가중
      const delta = objective === 'people' ? drop * (r.pop_total / 10000) : drop;
      if (!best || delta > best.delta + 1e-9 || (Math.abs(delta - best.delta) < 1e-9 && baseMap[r.name].composite > best.compositeBefore)) {
        best = { name: r.name, delta, drop, compositeBefore: baseMap[r.name].composite, compositeAfter: t.composite };
      }
    }
    if (!best || best.delta <= 0) break;
    extras[best.name] = (extras[best.name] || 0) + 1;
    steps.push({ step: k + 1, ...best });
  }
  const after = scoreRegions(regions, { ...options, extras });
  const allocation = Object.entries(extras).filter(([, v]) => v > 0).map(([name, units]) => {
    const b = before.results.find((x) => x.name === name);
    const a = after.results.find((x) => x.name === name);
    return { name, units, costEok: units * unitCostEok, rankBefore: b.rank, rankAfter: a.rank, compositeBefore: b.composite, compositeAfter: a.composite };
  }).sort((x, y) => y.units - x.units || x.name.localeCompare(y.name, 'ko'));
  return { n, objective, usedUnits: steps.length, budgetEok, unitCostEok, spentEok: steps.length * unitCostEok, allocation, steps, before, after };
}

/** 규칙 기반 정책 제안 (LLM 미사용). 상위 3개 지역 + 구조 제안 */
export function proposals(scored, regionsByName, topN = 3) {
  const sum = summary(scored.results);
  const fmt1 = (v) => (v == null ? '—' : v.toFixed(1));
  const out = [];
  const top = scored.ranked.slice(0, topN);
  const groupLabel = GROUPS[scored.group]?.label || '';
  for (const r of top) {
    const region = regionsByName[r.name];
    const ev = [];
    const drivers = INDICATORS.filter((i) => Number(scored.weights[i.key]) > 0 && r.scores[i.key] != null)
      .map((i) => ({ ...i, s: r.scores[i.key] })).sort((a, b) => b.s - a.s);
    for (const d of drivers.slice(0, 3)) {
      if (d.key === 'shortage') ev.push(`인구 1만 명당 시설 ${fmt1(r.raw.supply_per_10k)}개 (도 중앙값 ${fmt1(sum.supply_per_10k.median)}개) → 부족도 ${d.s}점`);
      if (d.key === 'distance') ev.push(`추정 평균 최근접거리 ${fmt1(r.raw.est_km)}km (도 중앙값 ${fmt1(sum.est_km.median)}km, 균등분포 가정 직선거리) → ${d.s}점`);
      if (d.key === 'vulnerable') ev.push(`${groupLabel} 비율 ${fmt1(r.raw.vuln_ratio)}% (도 중앙값 ${fmt1(sum.vuln_ratio.median)}%) → ${d.s}점`);
      if (d.key === 'transit') ev.push(`버스정류장 밀도 ${fmt1(r.raw.transit_density)}개/㎢ (도 중앙값 ${fmt1(sum.transit_density.median)}) → 접근 밀도 ${d.s}점`);
    }
    // 시설 유형 제안: 집단별 권장 유형 중 이 지역에 1만 명당 가장 적은 것
    const want = scored.group === 'child' ? ['수영장', '풋살장', '생활체육관', '구기체육관'] : ['전천후게이트볼장', '파크골프장', '생활체육관', '수영장'];
    const per10k = want.map((t) => ({ t, n: region.facilities_by_type[t] || 0, per: ((region.facilities_by_type[t] || 0) / region.pop_total) * 10000 })).sort((a, b) => a.per - b.per);
    const sparse = r.raw.est_km != null && sum.est_km.median != null && r.raw.est_km > sum.est_km.median * 1.5;
    const kind = sparse ? '소규모·분산형(읍면 단위 생활체육관·다목적 실내시설) 또는 순회 프로그램' : '거점형 생활체육시설';
    out.push({
      kind: 'region',
      rank: r.rank,
      region: r.name,
      composite: r.composite,
      title: `${r.name}: ${per10k[0].t} 등 ${groupLabel.replace(/\(.*\)/, '')} 대상 시설 우선 검토`,
      body: `현재 ${per10k[0].t} ${per10k[0].n}개(1만 명당 ${per10k[0].per.toFixed(2)}개). 면적 ${region.area_km2}㎢·${sparse ? '시설 간 거리가 긴 편이라 ' : ''}${kind} 형태가 적합할 가능성이 큼.`,
      evidence: ev,
      caveat: '직선거리·행정구역 면적 기반 추정이며 실제 이동시간·시설 노후도·운영시간은 반영되지 않음. 현장 수요조사 후 결정.',
    });
  }
  // 구조 제안
  const farLowTransit = scored.results.filter((r) => r.status === 'ok' && r.scores.distance >= 70 && r.scores.transit >= 70).map((r) => r.name);
  if (farLowTransit.length) {
    out.push({
      kind: 'structural',
      title: '거리·교통이 동시에 불리한 지역은 "시설 신축"보다 "접근 수단" 먼저',
      body: `${farLowTransit.join(', ')}: 추정거리와 정류장 밀도가 모두 하위권. 체육시설 셔틀·수요응답형(DRT) 연계, 학교체육관 개방, 이동식 프로그램을 신축과 함께 비교 검토.`,
      evidence: ['접근거리 점수 ≥70 이고 대중교통 점수 ≥70 인 지역을 규칙으로 추출'],
      caveat: '정류장 밀도는 운행 빈도·노선을 반영하지 않음.',
    });
  }
  const dense = scored.results.filter((r) => r.status === 'ok' && r.scores.shortage >= 70 && r.scores.distance <= 30).map((r) => r.name);
  if (dense.length) {
    out.push({
      kind: 'structural',
      title: '인구 대비 부족하지만 거리는 가까운 도시 지역은 "운영 시간·회전율"로 대응',
      body: `${dense.join(', ')}: 시설이 가깝지만 인구 1만 명당 수가 적음. 야간·주말 개방 확대, 예약제 회전율 개선, 학교·민간시설 공유를 신축보다 먼저 검토.`,
      evidence: ['부족도 점수 ≥70 이고 접근거리 점수 ≤30 인 지역을 규칙으로 추출'],
      caveat: '시설 규모(면적·수용인원) 차이는 개소 수 지표에 반영되지 않음.',
    });
  }
  return out;
}

/** 두 지역 이상 비교표용 */
export function compareRows(scored, names) {
  return names.map((n) => scored.results.find((r) => r.name === n)).filter(Boolean);
}
