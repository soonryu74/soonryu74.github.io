// 구조동물 API 서버 호출. 키는 서버에만 있고, 결과는 30분 캐시해 트래픽 한도(개발계정 일 10,000건)를 아낀다.
import "server-only";
import { serverEnv } from "@/lib/env";
import { kstDate, kstDateAfterDays } from "@/lib/dates";
import { rescueFixture } from "@/content/rescue-fixture";
import { extractItems, matchesFilter, normalizeRescue, UPKIND, type RescueAnimal, type RescueFilter, type RescueSpecies } from "./normalize";

const BASE = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2";
const REVALIDATE = 1800;

export type RescueQuery = RescueFilter & { sido?: string; sigungu?: string; days?: number; state?: "notice" | "protect" | "" };
export type RescueResult = { mode: "live" | "example"; animals: RescueAnimal[]; total: number; fetchedAt: string; error: string | null; truncated: boolean };
export type Region = { code: string; name: string };

export function rescueApiConfigured(): boolean {
  return !!serverEnv().publicDataKey;
}

async function call(path: string, params: Record<string, string | undefined>, revalidate = REVALIDATE): Promise<unknown> {
  const qs = new URLSearchParams({ _type: "json" });
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  // serviceKey는 포털에서 받은 '인코딩 전(Decoding)' 키를 넣는다. URLSearchParams가 한 번만 인코딩한다.
  qs.set("serviceKey", serverEnv().publicDataKey);
  const res = await fetch(`${BASE}/${path}?${qs.toString()}`, { next: { revalidate } });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // 인증 오류는 XML로 올 때가 있다
    const m = text.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>|<errMsg>([^<]+)<\/errMsg>/);
    throw new Error(m ? (m[1] ?? m[2]) : `HTTP ${res.status}`);
  }
}

export async function searchRescue(q: RescueQuery): Promise<RescueResult> {
  const today = kstDate();
  const days = Math.min(Math.max(q.days ?? 14, 1), 60);
  const fetchedAt = new Date().toISOString();
  const filter: RescueFilter = { species: q.species, keyword: q.keyword, sex: q.sex, region: q.region };

  if (!rescueApiConfigured()) {
    const animals = rescueFixture(today)
      .map((r) => normalizeRescue(r, true))
      .filter((a): a is RescueAnimal => !!a)
      .filter((a) => !a.foundDate || a.foundDate >= kstDateAfterDays(-days))
      .filter((a) => matchesFilter(a, filter))
      .filter((a) => !q.sido || a.orgName.startsWith(q.sido));
    return { mode: "example", animals, total: animals.length, fetchedAt, error: null, truncated: false };
  }

  try {
    const json = await call("abandonmentPublic_v2", {
      bgnde: kstDateAfterDays(-days).replace(/-/g, ""),
      endde: today.replace(/-/g, ""),
      upkind: q.species ? UPKIND[q.species as RescueSpecies] : undefined,
      upr_cd: q.sido,
      org_cd: q.sigungu,
      state: q.state || undefined,
      pageNo: "1",
      numOfRows: "500",
    });
    const { items, total, error } = extractItems(json);
    if (error) return { mode: "live", animals: [], total: 0, fetchedAt, error, truncated: false };
    const animals = items.map((r) => normalizeRescue(r)).filter((a): a is RescueAnimal => !!a).filter((a) => matchesFilter(a, filter));
    animals.sort((a, b) => (b.noticeStart ?? "").localeCompare(a.noticeStart ?? ""));
    return { mode: "live", animals, total, fetchedAt, error: null, truncated: total > items.length };
  } catch (e) {
    return { mode: "live", animals: [], total: 0, fetchedAt, error: (e as Error).message, truncated: false };
  }
}

export async function listSido(): Promise<Region[]> {
  if (!rescueApiConfigured()) return [{ code: "서울특별시", name: "서울특별시 (예시)" }, { code: "경기도", name: "경기도 (예시)" }];
  try {
    const { items } = extractItems(await call("sido_v2", { numOfRows: "50", pageNo: "1" }, 86400));
    return items.map((r) => ({ code: String(r.orgCd ?? ""), name: String(r.orgdownNm ?? "") })).filter((r) => r.code && r.name);
  } catch {
    return [];
  }
}

export async function listSigungu(sido: string): Promise<Region[]> {
  if (!sido || !rescueApiConfigured()) return [];
  try {
    const { items } = extractItems(await call("sigungu_v2", { upr_cd: sido }, 86400));
    return items.map((r) => ({ code: String(r.orgCd ?? ""), name: String(r.orgdownNm ?? "") })).filter((r) => r.code && r.name);
  } catch {
    return [];
  }
}
