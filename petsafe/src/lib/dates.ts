// 날짜 유틸. 서비스 기준 시간대는 한국(Asia/Seoul).
export const TZ = "Asia/Seoul";

/** YYYY-MM-DD (한국 시각 기준) */
export function kstDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** 한국 시각 기준 해당 날짜의 시작·끝 (UTC Date) */
export function kstDayRange(d: Date = new Date()): { start: Date; end: Date } {
  const day = kstDate(d);
  const start = new Date(`${day}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { start, end };
}

export function kstMonth(d: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "numeric" }).format(d));
}

export function formatKst(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: TZ, year: "numeric", month: "long", day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function ageInMonths(birth: string | null, now: Date = new Date()): number | null {
  if (!birth) return null;
  const b = new Date(`${birth}T00:00:00+09:00`);
  if (Number.isNaN(b.getTime())) return null;
  const months = (now.getUTCFullYear() - b.getUTCFullYear()) * 12 + (now.getUTCMonth() - b.getUTCMonth());
  return Math.max(0, months);
}

export function ageLabel(birth: string | null, estimated: boolean): string {
  const m = ageInMonths(birth);
  if (m === null) return "나이 미입력";
  const text = m < 12 ? `${m}개월` : `${Math.floor(m / 12)}살`;
  return estimated ? `약 ${text} (추정)` : text;
}

/** 오늘(KST)로부터 n일 뒤의 YYYY-MM-DD */
export function kstDateAfterDays(days: number, from: Date = new Date()): string {
  return kstDate(new Date(from.getTime() + days * 86400 * 1000));
}
