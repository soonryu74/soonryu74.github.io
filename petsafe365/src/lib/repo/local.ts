// 예시 모드 저장소. Supabase 키가 없을 때만 쓰이며 이 기기 브라우저(localStorage)에만 저장한다.
// 운영 데이터와 섞이지 않도록 키 접두사를 분리하고, 화면에는 항상 "예시 모드" 배너를 띄운다.
import type { ID, Insert, PetDocument, Row, SessionUser, TableName } from "../types";
import { PUBLIC_TABLES, RepoError, validateFile, type ListOptions, type Repo } from "./repo";
import { seedTables } from "../seed";

const PREFIX = "ps365:example:";
const SESSION_KEY = PREFIX + "session";
export const DEMO_ADMIN_EMAIL = "admin@example.com";

type Stored = Record<string, unknown> & { id: ID; _owner?: ID };

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryKV(): KV {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createLocalRepo(kvInput?: KV): Repo {
  let kv: KV;
  try {
    kv = kvInput ?? (typeof window !== "undefined" ? window.localStorage : memoryKV());
    kv.getItem(PREFIX + "probe");
  } catch {
    kv = memoryKV();
  }
  const listeners = new Set<() => void>();
  const fileBlobs = new Map<string, string>();

  const read = (table: string): Stored[] => {
    const raw = kv.getItem(PREFIX + table);
    if (raw) {
      try {
        return JSON.parse(raw) as Stored[];
      } catch {
        return [];
      }
    }
    const seeded = (seedTables as unknown as Record<string, Stored[] | undefined>)[table];
    return seeded ? structuredClone(seeded) : [];
  };
  const write = (table: string, rows: Stored[]) => kv.setItem(PREFIX + table, JSON.stringify(rows));

  const currentUser = (): SessionUser | null => {
    const raw = kv.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  };
  const requireUser = (): SessionUser => {
    const user = currentUser();
    if (!user) throw new RepoError("로그인이 필요해요.", "forbidden");
    return user;
  };
  const isPublic = (table: TableName) => PUBLIC_TABLES.includes(table);
  const canSee = (table: TableName, row: Stored, user: SessionUser | null) => {
    if (isPublic(table)) return true;
    if (!user) return false;
    if (user.role === "admin" && ["audit_logs", "partner_inquiries", "facility_reports", "profiles", "waitlist"].includes(table)) return true;
    if (table === "audit_logs" || table === "waitlist") return false;
    return row._owner === user.id;
  };
  const strip = <T>(row: Stored): T => {
    const copy: Record<string, unknown> = { ...row };
    delete copy._owner;
    return copy as T;
  };
  const assertWrite = (table: TableName, user: SessionUser | null) => {
    if (table === "waitlist") return; // 출시 알림은 로그인 없이 남길 수 있다
    if (isPublic(table)) {
      if (user?.role !== "admin" && !(user?.role === "reviewer" && table === "content_versions")) {
        throw new RepoError("관리자만 변경할 수 있어요.", "forbidden");
      }
    } else if (!user) {
      throw new RepoError("로그인이 필요해요.", "forbidden");
    }
  };

  const repo: Repo = {
    mode: "example",
    async list<T extends TableName>(table: T, options?: ListOptions<T>) {
      const user = currentUser();
      let rows = read(table).filter((r) => canSee(table, r, user));
      if (options?.eq) {
        const entries = Object.entries(options.eq);
        rows = rows.filter((r) => entries.every(([k, v]) => r[k] === v));
      }
      if (options?.order) {
        const { column, ascending = true } = options.order;
        rows = [...rows].sort((a, b) => {
          const av = String(a[column] ?? "");
          const bv = String(b[column] ?? "");
          return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      if (options?.limit) rows = rows.slice(0, options.limit);
      return rows.map((r) => strip<Row<T>>(r));
    },
    async get<T extends TableName>(table: T, id: ID) {
      const row = read(table).find((r) => r.id === id);
      if (!row || !canSee(table, row, currentUser())) return null;
      return strip<Row<T>>(row);
    },
    async insert<T extends TableName>(table: T, values: Insert<T>) {
      const user = currentUser();
      assertWrite(table, user);
      const now = new Date().toISOString();
      const row: Stored = { ...(values as Record<string, unknown>), id: values.id ?? uuid(), created_at: now, updated_at: now };
      if (!isPublic(table) && user) row._owner = user.id;
      const rows = read(table);
      rows.push(row);
      write(table, rows);
      return strip<Row<T>>(row);
    },
    async update<T extends TableName>(table: T, id: ID, patch: Partial<Row<T>>) {
      const user = currentUser();
      assertWrite(table, user);
      const rows = read(table);
      const index = rows.findIndex((r) => r.id === id);
      if (index < 0 || !canSee(table, rows[index], user)) throw new RepoError("찾을 수 없어요.", "not_found");
      if (!isPublic(table) && rows[index]._owner !== user?.id && user?.role !== "admin") {
        throw new RepoError("권한이 없어요.", "forbidden");
      }
      rows[index] = { ...rows[index], ...(patch as Record<string, unknown>), id, updated_at: new Date().toISOString() };
      write(table, rows);
      return strip<Row<T>>(rows[index]);
    },
    async remove<T extends TableName>(table: T, id: ID) {
      const user = currentUser();
      assertWrite(table, user);
      const rows = read(table);
      const row = rows.find((r) => r.id === id);
      if (!row || !canSee(table, row, user)) throw new RepoError("찾을 수 없어요.", "not_found");
      if (!isPublic(table) && row._owner !== user?.id) throw new RepoError("권한이 없어요.", "forbidden");
      write(table, rows.filter((r) => r.id !== id));
    },
    auth: {
      async getUser() {
        return currentUser();
      },
      async signIn(email: string) {
        const normalized = email.trim().toLowerCase();
        const users = read("_users");
        let found = users.find((u) => u.email === normalized);
        if (!found) {
          found = { id: uuid(), email: normalized };
          users.push(found);
          write("_users", users);
        }
        const user: SessionUser = {
          id: found.id,
          email: normalized,
          role: normalized === DEMO_ADMIN_EMAIL ? "admin" : "guardian",
        };
        kv.setItem(SESSION_KEY, JSON.stringify(user));
        listeners.forEach((l) => l());
        return { sent: false };
      },
      async signOut() {
        kv.removeItem(SESSION_KEY);
        listeners.forEach((l) => l());
      },
      async deleteAccount() {
        const user = requireUser();
        const privateTables: TableName[] = [
          "profiles", "pets", "pet_conditions", "care_tasks", "health_events", "documents",
          "insurance_policies", "insurance_terms", "insurance_checks", "incident_drafts",
          "user_consents", "orders", "facility_reports", "partner_inquiries",
        ];
        for (const table of privateTables) write(table, read(table).filter((r) => r._owner !== user.id));
        write("_users", read("_users").filter((u) => u.id !== user.id));
        kv.removeItem(SESSION_KEY);
        listeners.forEach((l) => l());
      },
      onChange(callback) {
        listeners.add(callback);
        return () => listeners.delete(callback);
      },
    },
    files: {
      async upload(petId: ID, type: PetDocument["document_type"], file: File) {
        const user = requireUser();
        const problem = validateFile(file);
        if (problem) throw new RepoError(problem, "invalid");
        const pet = await repo.get("pets", petId);
        if (!pet) throw new RepoError("찾을 수 없어요.", "not_found");
        const path = `${user.id}/${petId}/${uuid()}`;
        // 예시 모드는 파일 본문을 보관하지 않고 이 탭에서만 임시로 연다.
        if (typeof URL !== "undefined" && "createObjectURL" in URL) fileBlobs.set(path, URL.createObjectURL(file));
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
        const url = fileBlobs.get(doc.storage_path);
        if (!url) throw new RepoError("예시 모드에서는 새로고침하면 파일 본문이 사라져요. 실제 서비스에서는 비공개 저장소에 보관됩니다.", "unavailable");
        return url;
      },
      async remove(doc: PetDocument) {
        fileBlobs.delete(doc.storage_path);
        await repo.remove("documents", doc.id);
      },
    },
  };
  return repo;
}
