import { NextResponse } from "next/server";
import { getStore } from "@/lib/session";
import { NotFoundError } from "@/lib/store/types";

// 비공개 문서 열람: 소유자 확인 후 60초 서명 URL로 이동(운영) 또는 직접 전송(예시 모드)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  if (!store.user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  try {
    const dl = await store.getDocumentDownload(id);
    await store.audit("document.accessed", "document", id);
    if (dl.kind === "url") return NextResponse.redirect(dl.url, { headers: { "Cache-Control": "no-store" } });
    return new NextResponse(Buffer.from(dl.bytes), {
      headers: {
        "Content-Type": dl.mime,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(dl.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: "찾을 수 없어요." }, { status: 404 });
    return NextResponse.json({ error: "문서를 열 수 없어요." }, { status: 404 });
  }
}
