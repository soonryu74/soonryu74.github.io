// 계정 삭제(탈퇴). 서버에서만 실행된다.
// - 서비스 역할 키는 서버 환경변수(SUPABASE_SERVICE_ROLE_KEY)에서만 읽고 응답·로그에 내보내지 않는다.
// - 삭제 대상은 반드시 Authorization 토큰으로 확인한 본인이다. 요청 본문의 사용자 ID 는 읽지 않는다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "pet-documents";
const NO_STORE = { "Cache-Control": "no-store" };

/** `${userId}/${petId}/파일` 구조의 파일을 모아 지운다. 실패해도 계정 삭제는 계속한다. */
async function removeUserFiles(admin: SupabaseClient, userId: string): Promise<void> {
  const bucket = admin.storage.from(BUCKET);
  const paths: string[] = [];
  const walk = async (prefix: string, depth: number): Promise<void> => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket.list(prefix, { limit: 1000, offset });
      if (error || !data || data.length === 0) return;
      for (const entry of data) {
        const path = `${prefix}/${entry.name}`;
        // 폴더는 id 가 없다. 예상 구조보다 깊게는 내려가지 않는다.
        if (entry.id === null) {
          if (depth < 3) await walk(path, depth + 1);
        } else paths.push(path);
      }
      if (data.length < 1000) return;
    }
  };
  await walk(userId, 0);
  for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100));
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return Response.json({ error: "not_configured" }, { status: 503, headers: NO_STORE });

  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1]?.trim();
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });

  try {
    await removeUserFiles(admin, user.id);
  } catch {
    // 파일 정리는 최선 노력. 남은 파일은 운영 점검(보관기한 정리 작업)에서 지운다.
  }

  // DB 행은 auth.users 외래키의 on delete cascade 로 함께 지워진다.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return Response.json({ error: "delete_failed" }, { status: 500, headers: NO_STORE });

  return Response.json({ ok: true }, { headers: NO_STORE });
}
