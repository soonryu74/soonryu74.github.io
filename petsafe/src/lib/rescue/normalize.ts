// 국가동물보호정보시스템 구조동물 조회 API(abandonmentPublicService_v2) 응답 정규화·필터.
// 명세: data.go.kr 15098931 (2026-09-25 확인). v1 필드명(kindCd "[개] 믹스견", popfile)도 함께 받는다.
export type RescueSpecies = "dog" | "cat" | "other";

export type RescueAnimal = {
  id: string;                 // desertionNo (유기번호)
  species: RescueSpecies;
  speciesLabel: string;
  breed: string;
  color: string;
  age: string;
  weight: string;
  sex: "M" | "F" | "Q";
  neuter: "Y" | "N" | "U";
  foundDate: string | null;   // YYYY-MM-DD
  foundPlace: string;
  noticeNo: string;
  noticeStart: string | null; // YYYY-MM-DD
  noticeEnd: string | null;   // YYYY-MM-DD
  state: string;              // processState (보호중, 종료(반환) 등)
  feature: string;            // specialMark
  shelterName: string;
  shelterTel: string | null;
  shelterAddr: string;
  orgName: string;
  photo: string | null;
  isExample: boolean;
};

export const UPKIND: Record<RescueSpecies, string> = { dog: "417000", cat: "422400", other: "429900" };

type Raw = Record<string, unknown>;
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

export function ymd(v: unknown): string | null {
  const m = str(v).match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function speciesOf(r: Raw): { species: RescueSpecies; label: string; breed: string } {
  const up = str(r.upKindCd);
  const kindCd = str(r.kindCd);
  const v1 = kindCd.match(/^\[(.+?)\]\s*(.*)$/); // v1: "[개] 믹스견"
  const label = str(r.upKindNm) || (v1 ? v1[1] : "");
  const breed = str(r.kindNm) || str(r.kindFullNm) || (v1 ? v1[2] : "");
  const species: RescueSpecies = up === UPKIND.dog || label === "개" ? "dog" : up === UPKIND.cat || label === "고양이" ? "cat" : "other";
  return { species, label: label || (species === "dog" ? "개" : species === "cat" ? "고양이" : "기타"), breed: breed || "품종 미상" };
}

function photoOf(r: Raw): string | null {
  const url = str(r.popfile1) || str(r.popfile) || str(r.filename);
  if (!/^https?:\/\//.test(url)) return null;
  return url.replace(/^http:\/\//, "https://"); // 혼합 콘텐츠 방지
}

export function normalizeRescue(r: Raw, isExample = false): RescueAnimal | null {
  const id = str(r.desertionNo);
  if (!id) return null;
  const s = speciesOf(r);
  const sex = str(r.sexCd).toUpperCase();
  const neuter = str(r.neuterYn).toUpperCase();
  const tel = str(r.careTel);
  return {
    id,
    species: s.species,
    speciesLabel: s.label,
    breed: s.breed,
    color: str(r.colorCd),
    age: str(r.age),
    weight: str(r.weight),
    sex: sex === "M" || sex === "F" ? sex : "Q",
    neuter: neuter === "Y" || neuter === "N" ? neuter : "U",
    foundDate: ymd(r.happenDt),
    foundPlace: str(r.happenPlace),
    noticeNo: str(r.noticeNo),
    noticeStart: ymd(r.noticeSdt),
    noticeEnd: ymd(r.noticeEdt),
    state: str(r.processState) || "상태 미상",
    feature: str(r.specialMark),
    shelterName: str(r.careNm) || "보호소 미상",
    shelterTel: /^[0-9-]{7,20}$/.test(tel) ? tel : null,
    shelterAddr: str(r.careAddr),
    orgName: str(r.orgNm),
    photo: photoOf(r),
    isExample,
  };
}

/** API 응답(JSON)에서 item 배열 꺼내기. 단건이면 객체로 오는 경우도 처리. */
export function extractItems(json: unknown): { items: Raw[]; total: number; error: string | null } {
  const j = json as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const err = j?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg;
  if (err) return { items: [], total: 0, error: String(err) };
  const header = j?.response?.header;
  if (header && header.resultCode && header.resultCode !== "00") return { items: [], total: 0, error: String(header.resultMsg ?? header.resultCode) };
  const raw = j?.response?.body?.items?.item ?? j?.response?.body?.items ?? [];
  const items = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Object.keys(raw).length ? [raw] : [];
  return { items: items as Raw[], total: Number(j?.response?.body?.totalCount ?? items.length) || 0, error: null };
}

export type RescueFilter = { species?: RescueSpecies | ""; keyword?: string; sex?: "M" | "F" | ""; region?: string };

/** 키워드는 품종·색·특징·발견장소에서, 공백으로 나눈 모든 단어가 들어 있어야 일치 */
export function matchesFilter(a: RescueAnimal, f: RescueFilter): boolean {
  if (f.species && a.species !== f.species) return false;
  if (f.sex && a.sex !== f.sex) return false;
  if (f.region && !`${a.orgName} ${a.shelterAddr} ${a.foundPlace}`.includes(f.region)) return false;
  const words = (f.keyword ?? "").split(/\s+/).map((w) => w.trim()).filter(Boolean);
  if (words.length) {
    const hay = `${a.breed} ${a.color} ${a.feature} ${a.foundPlace} ${a.age} ${a.weight}`.replace(/\s+/g, "");
    if (!words.every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** 공고 종료까지 남은 일수 (KST 날짜 기준). 종료일 당일 = 0, 지남 = 음수 */
export function daysLeft(noticeEnd: string | null, today: string): number | null {
  if (!noticeEnd) return null;
  const a = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  const b = Date.UTC(+noticeEnd.slice(0, 4), +noticeEnd.slice(5, 7) - 1, +noticeEnd.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

/** 기준일 이후에 새로 공고된 것 */
export function isNewSince(a: RescueAnimal, sinceDate: string | null): boolean {
  if (!sinceDate) return false;
  const d = a.noticeStart ?? a.foundDate;
  return !!d && d > sinceDate;
}

export const SEX_LABEL = { M: "수컷", F: "암컷", Q: "성별 미상" } as const;
export const NEUTER_LABEL = { Y: "중성화", N: "중성화 안 함", U: "중성화 미상" } as const;

export function detailUrl(a: RescueAnimal): string {
  return `https://www.animal.go.kr/front/awtis/protection/protectionDtl.do?desertionNo=${encodeURIComponent(a.id)}`;
}
