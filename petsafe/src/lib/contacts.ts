import type { OfficialContactRow } from "@/lib/types";
import { kstDate } from "@/lib/dates";

/** 유효기간·상태 기준으로 화면에 보일 연락처인지 */
export function isContactVisible(c: Pick<OfficialContactRow, "status" | "valid_from" | "valid_to">, today = kstDate()): boolean {
  if (c.status === "retired") return false;
  if (c.valid_from && c.valid_from > today) return false;
  if (c.valid_to && c.valid_to < today) return false;
  return true;
}

/** 연락처 확인일이 오래됐는지 (기본 180일) */
export function isContactStale(c: Pick<OfficialContactRow, "verified_at">, now = new Date(), days = 180): boolean {
  if (!c.verified_at) return true;
  const v = new Date(`${c.verified_at}T00:00:00+09:00`);
  return now.getTime() - v.getTime() > days * 86400 * 1000;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}
