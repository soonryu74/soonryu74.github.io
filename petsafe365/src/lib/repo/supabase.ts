// 실제 저장소. 권한은 화면이 아니라 DB의 Row Level Security 가 강제한다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ID, Insert, PetDocument, Role, Row, SessionUser, TableName } from "../types";
import { RepoError, validateFile, type ListOptions, type Repo } from "./repo";

const BUCKET = "pet-documents";

function fail(error: { message: string; code?: string }): never {
  if (error.code === "PGRST116") throw new RepoError("찾을 수 없어요.", "not_found");
  if (error.code === "42501") throw new RepoError("권한이 없어요.", "forbidden");
  throw new RepoError("저장소 요청에 실패했어요. 잠시 뒤 다시 시도해 주세요.", "unavailable");
}

export function createSupabaseRepo(url: string, anonKey: string): Repo {
  const client: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" },
  });

  const getUser = async (): Promise<SessionUser | null> => {
    const { data } = await client.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const { data: profile } = await client.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
    return { id: user.id, email: user.email ?? "", role: ((profile?.role as Role) ?? "guardian") };
  };

  const repo: Repo = {
    mode: "supabase",
    async list<T extends TableName>(table: T, options?: ListOptions<T>) {
      let query = client.from(table).select("*");
      for (const [key, value] of Object.entries(options?.eq ?? {})) query = query.eq(key, value as never);
      if (options?.order) query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
      if (options?.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) fail(error);
      return (data ?? []) as Row<T>[];
    },
    async get<T extends TableName>(table: T, id: ID) {
      const { data, error } = await client.from(table).select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return (data as Row<T> | null) ?? null;
    },
    async insert<T extends TableName>(table: T, values: Insert<T>) {
      if (table === "waitlist") {
        // 비로그인 사용자는 넣기만 하고 읽을 수 없으므로 결과 행을 돌려받지 않는다. 이미 신청한 이메일(23505)은 성공으로 본다.
        const { error: e } = await client.from(table).insert(values as never);
        if (e && e.code !== "23505") fail(e);
        const now = new Date().toISOString();
        return { ...(values as object), id: values.id ?? "", created_at: now, updated_at: now } as Row<T>;
      }
      const { data, error } = await client.from(table).insert(values as never).select("*").single();
      if (error) fail(error);
      return data as Row<T>;
    },
    async update<T extends TableName>(table: T, id: ID, patch: Partial<Row<T>>) {
      const { data, error } = await client.from(table).update(patch as never).eq("id", id).select("*").single();
      if (error) fail(error);
      return data as Row<T>;
    },
    async remove<T extends TableName>(table: T, id: ID) {
      const { error } = await client.from(table).delete().eq("id", id);
      if (error) fail(error);
    },
    auth: {
      getUser,
      async signIn(email: string) {
        const { error } = await client.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw new RepoError("로그인 메일을 보내지 못했어요. 주소를 확인하고 다시 시도해 주세요.", "unavailable");
        return { sent: true };
      },
      async signOut() {
        await client.auth.signOut();
      },
      async deleteAccount() {
        const { data } = await client.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new RepoError("로그인이 필요해요.", "forbidden");
        const response = await fetch("/api/account/delete", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new RepoError("탈퇴를 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.", "unavailable");
        await client.auth.signOut();
      },
      onChange(callback) {
        const { data } = client.auth.onAuthStateChange(() => callback());
        return () => data.subscription.unsubscribe();
      },
    },
    files: {
      async upload(petId: ID, type: PetDocument["document_type"], file: File) {
        const problem = validateFile(file);
        if (problem) throw new RepoError(problem, "invalid");
        const user = await getUser();
        if (!user) throw new RepoError("로그인이 필요해요.", "forbidden");
        const ext = file.name.split(".").pop()?.toLowerCase();
        const path = `${user.id}/${petId}/${crypto.randomUUID()}.${ext}`;
        // 버킷 정책이 MIME·크기·경로 소유자를 서버에서 다시 검증한다. 악성파일 검사는 docs/legal-readiness.md 의 연결 지점 참고.
        const { error } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new RepoError("파일을 올리지 못했어요.", "unavailable");
        return repo.insert("documents", {
          pet_id: petId,
          owner_id: user.id,
          document_type: type,
          storage_path: path,
          original_name: file.name,
          mime_type: file.type,
          size: file.size,
          retention_until: null,
        });
      },
      async openUrl(doc: PetDocument) {
        const { data, error } = await client.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60);
        if (error || !data) throw new RepoError("파일을 열지 못했어요.", "unavailable");
        return data.signedUrl;
      },
      async remove(doc: PetDocument) {
        await client.storage.from(BUCKET).remove([doc.storage_path]);
        await repo.remove("documents", doc.id);
      },
    },
  };
  return repo;
}
