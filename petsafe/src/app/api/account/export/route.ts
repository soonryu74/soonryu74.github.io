import { NextResponse } from "next/server";
import { getStore } from "@/lib/session";

// 내 데이터 내려받기 (JSON). 문서 파일 자체는 각 문서 링크로 받는다.
export async function GET() {
  const store = await getStore();
  if (!store.user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const data = await store.exportMyData();
  await store.audit("account.exported", "user", store.user.id);
  const name = `petsafe365-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}
