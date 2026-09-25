import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

// 주소 → 좌표 (카카오 Local REST API 서버 프록시). REST 키는 서버에만 있다. 결과를 저장하지 않는다.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80);
  const key = serverEnv().kakaoRestKey;
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  if (!key) return NextResponse.json({ error: "geocoding not configured" }, { status: 503 });
  try {
    const headers = { Authorization: `KakaoAK ${key}` };
    const addr = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=1`, { headers, cache: "no-store" }).then((r) => r.json());
    let doc = addr?.documents?.[0];
    if (!doc) {
      const kw = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=1`, { headers, cache: "no-store" }).then((r) => r.json());
      doc = kw?.documents?.[0];
    }
    if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ lat: Number(doc.y), lng: Number(doc.x), label: doc.address_name ?? doc.place_name ?? q }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "geocoding failed" }, { status: 502 });
  }
}
