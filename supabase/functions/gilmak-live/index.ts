// 오늘 서울 길막 — 실시간 돌발(사고·고장·공사·집회) 프록시
//
// 서울 열린데이터광장 "서울시 실시간 돌발 정보"(서비스명 AccInfo, TOPIS 제공)를 대신 호출해
// 인증키를 숨기고, 결과를 화면용 JSON으로 바꿔 1분 캐시로 돌려준다.
//   GET  https://<project>.supabase.co/functions/v1/gilmak-live
//   GET  ...?debug=1   → 원본 첫 행도 같이 보여 준다(필드명 확인용)
//
// 필요한 비밀값(Supabase 대시보드 → Edge Functions → Secrets):
//   SEOUL_OPEN_KEY  서울 열린데이터광장 인증키 (data.seoul.go.kr 무료 발급)
//
// 좌표: 원본은 GRS80 TM(중부원점, X 동쪽/Y 북쪽, m). 위경도로 바꿔서 내려준다.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOW = ["https://soonryu74.github.io", "https://galmae-budongsan.com", "http://localhost:8765", "http://127.0.0.1:8765"];
const CACHE_SEC = 60;
let cache: { at: number; body: string } | null = null;

// ---- GRS80 TM(중부원점) → WGS84 역변환 (Snyder, Transverse Mercator) ----
const A = 6378137, F = 1 / 298.257222101, E2 = 2 * F - F * F, EP2 = E2 / (1 - E2);
const LON0 = 127 * Math.PI / 180, LAT0 = 38 * Math.PI / 180, K0 = 1, FE = 200000;
function meridianArc(phi: number) {
  const e4 = E2 * E2, e6 = e4 * E2;
  return A * ((1 - E2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi
    - (3 * E2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * phi)
    + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * phi)
    - (35 * e6 / 3072) * Math.sin(6 * phi));
}
const M0 = meridianArc(LAT0);
function tmToWgs84(x: number, y: number): { lat: number; lng: number } | null {
  if (!isFinite(x) || !isFinite(y) || x < 100000 || x > 300000) return null;
  // 가북거리(FN)가 500000(EPSG:5181)인지 600000(EPSG:5186)인지 값의 범위로 판별 — 서울은 위도 37.4~37.7
  const FN = y > 520000 ? 600000 : 500000;
  const M = M0 + (y - FN) / K0;
  const mu = M / (A * (1 - E2 / 4 - 3 * E2 * E2 / 64 - 5 * E2 * E2 * E2 / 256));
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const phi1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const sin1 = Math.sin(phi1), cos1 = Math.cos(phi1), tan1 = Math.tan(phi1);
  const C1 = EP2 * cos1 * cos1, T1 = tan1 * tan1;
  const N1 = A / Math.sqrt(1 - E2 * sin1 * sin1), R1 = A * (1 - E2) / Math.pow(1 - E2 * sin1 * sin1, 1.5);
  const D = (x - FE) / (N1 * K0);
  const lat = phi1 - (N1 * tan1 / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * D ** 6 / 720);
  const lng = LON0 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * D ** 5 / 120) / cos1;
  const out = { lat: lat * 180 / Math.PI, lng: lng * 180 / Math.PI };
  if (out.lat < 37.2 || out.lat > 37.9 || out.lng < 126.5 || out.lng > 127.4) return null;
  return { lat: Math.round(out.lat * 1e5) / 1e5, lng: Math.round(out.lng * 1e5) / 1e5 };
}

// ---- 원본 행 → 화면용 항목 ----
function pick(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toUpperCase()] ?? row[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}
function hhmm(t: string) { return t.length >= 4 ? `${t.slice(0, 2)}:${t.slice(2, 4)}` : ""; }
function classify(info: string, type: string, dtype: string) {
  const tag = (info.match(/^\[([^\]]+)\]/)?.[1] ?? "").trim();
  const s = tag || dtype || type;
  if (/사고|추돌|충돌|전복|화재/.test(s)) return { kind: "incident", sub: "crash", label: "사고" };
  if (/고장/.test(s)) return { kind: "incident", sub: "breakdown", label: "고장차량" };
  if (/공사|작업|통제|점검|제설/.test(s)) return { kind: "work", sub: "work", label: tag || "공사·통제" };
  if (/집회|시위|행진/.test(s)) return { kind: "crowd", sub: "rally", label: "집회" };
  if (/행사|마라톤|축제/.test(s)) return { kind: "crowd", sub: "event", label: tag || "행사" };
  if (/기상|결빙|침수|강풍|재난/.test(s)) return { kind: "incident", sub: "weather", label: tag || "기상" };
  return { kind: "incident", sub: "other", label: tag || "돌발" };
}
function toItem(row: Record<string, unknown>) {
  const info = pick(row, "acc_info", "ACC_INFO", "info");
  const type = pick(row, "acc_type", "ACC_TYPE"), dtype = pick(row, "acc_dtype", "ACC_DTYPE");
  const c = classify(info, type, dtype);
  const title = info.replace(/^\[[^\]]+\]\s*/, "") || c.label;
  const x = parseFloat(pick(row, "grs80tm_x", "GRS80TM_X", "tm_x")), y = parseFloat(pick(row, "grs80tm_y", "GRS80TM_Y", "tm_y"));
  const at = tmToWgs84(x, y);
  const od = pick(row, "occr_date"), ot = pick(row, "occr_time"), cd = pick(row, "exp_clr_date"), ct = pick(row, "exp_clr_time");
  const road = (title.match(/^([가-힣A-Za-z0-9·]+?(?:대로|고속도로|간선로|순환로|터널|대교|로|길|교))(?=\s|$)/)?.[1]) ?? "";
  return {
    id: "live-" + (pick(row, "acc_id", "ACC_ID") || `${od}${ot}${Math.round(x)}`),
    kind: c.kind, sub: c.sub, label: c.label, title, road,
    date: od ? `${od.slice(0, 4)}-${od.slice(4, 6)}-${od.slice(6, 8)}` : "",
    start: hhmm(ot), end: cd && cd !== od ? `${+cd.slice(4, 6)}/${+cd.slice(6, 8)} ${hhmm(ct)}` : hhmm(ct),
    at, type, dtype,
  };
}

async function fetchSeoul(key: string) {
  const url = `http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/AccInfo/1/1000/`;
  const r = await fetch(url, { headers: { "User-Agent": "soonryu74.github.io gilmak" } });
  const text = await r.text();
  let j: Record<string, unknown>;
  try { j = JSON.parse(text); } catch { throw new Error("원본이 JSON이 아님: " + text.slice(0, 200)); }
  // 정상: { AccInfo: { list_total_count, RESULT:{CODE:'INFO-000'}, row:[...] } }  오류: { RESULT:{CODE:'ERROR-xxx', MESSAGE} }
  const svc = (j["AccInfo"] ?? j["accInfo"]) as Record<string, unknown> | undefined;
  const result = ((svc?.["RESULT"] ?? j["RESULT"]) ?? {}) as Record<string, string>;
  const code = result["CODE"] ?? "";
  if (!svc || !code.startsWith("INFO-000")) {
    if (code === "INFO-200") return { rows: [] as Record<string, unknown>[], result }; // 해당하는 데이터 없음
    throw new Error(`서울시 API 응답 오류 ${code} ${result["MESSAGE"] ?? ""}`.trim());
  }
  const rows = (Array.isArray(svc["row"]) ? svc["row"] : []) as Record<string, unknown>[];
  return { rows, result };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ALLOW.includes(origin) ? origin : ALLOW[0],
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Vary": "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return new Response("GET only", { status: 405, headers: cors });
  const debug = new URL(req.url).searchParams.get("debug") === "1";
  const key = Deno.env.get("SEOUL_OPEN_KEY") ?? "";
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${CACHE_SEC}` },
  });
  if (!key) return json({ ok: false, error: "SEOUL_OPEN_KEY 비밀값이 없습니다. Supabase → Edge Functions → Secrets 에 등록하세요." }, 503);
  if (!debug && cache && Date.now() - cache.at < CACHE_SEC * 1000) return new Response(cache.body, { headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${CACHE_SEC}`, "X-Cache": "hit" } });
  try {
    const { rows, result } = await fetchSeoul(key);
    const items = rows.map(toItem);
    const body: Record<string, unknown> = {
      ok: true, fetchedAt: new Date().toISOString(), source: "서울 열린데이터광장 · 서울시 실시간 돌발 정보(AccInfo, TOPIS)",
      total: rows.length, located: items.filter((i) => i.at).length, items,
    };
    if (debug) { body.rawFirst = rows[0] ?? null; body.result = result; }
    const text = JSON.stringify(body);
    if (!debug) cache = { at: Date.now(), body: text };
    return new Response(text, { headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${CACHE_SEC}`, "X-Cache": "miss" } });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e) }, 502);
  }
});
