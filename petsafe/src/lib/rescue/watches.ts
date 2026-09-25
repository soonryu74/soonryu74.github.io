import "server-only";
import type { Store } from "@/lib/store/types";
import type { RescueWatch } from "@/lib/types";
import { kstDate } from "@/lib/dates";
import { searchRescue } from "./client";
import { isNewSince } from "./normalize";

export function watchQuery(w: RescueWatch): string {
  const qs = new URLSearchParams();
  if (w.sido_code) qs.set("sido", w.sido_code);
  if (w.sigungu_code) qs.set("sigungu", w.sigungu_code);
  if (w.species) qs.set("species", w.species);
  if (w.keyword) qs.set("q", w.keyword);
  qs.set("watch", w.id);
  return qs.toString();
}

/** 관심 조건별 '마지막으로 본 뒤 새로 올라온 공고' 수. API 결과는 30분 캐시된다. */
export async function newCountsForWatches(store: Store): Promise<{ watch: RescueWatch; newCount: number; error: boolean }[]> {
  const watches = await store.listRescueWatches().catch(() => []);
  return Promise.all(watches.map(async (w) => {
    const r = await searchRescue({ sido: w.sido_code ?? undefined, sigungu: w.sigungu_code ?? undefined, species: w.species ?? undefined, keyword: w.keyword ?? undefined, days: 14 });
    const since = kstDate(new Date(w.last_seen_at));
    return { watch: w, newCount: r.animals.filter((a) => isNewSince(a, since)).length, error: !!r.error };
  }));
}
