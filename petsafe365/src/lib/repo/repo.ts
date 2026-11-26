import type { ID, Insert, Row, SessionUser, TableName, PetDocument } from "../types";

export type ListOptions<T extends TableName> = {
  eq?: Partial<Row<T>>;
  order?: { column: keyof Row<T> & string; ascending?: boolean };
  limit?: number;
};

export class RepoError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "forbidden" | "invalid" | "unavailable" | "unknown" = "unknown",
  ) {
    super(message);
  }
}

export interface Repo {
  /** supabase: 실제 DB. example: 이 기기 브라우저에만 저장되는 예시 모드. */
  mode: "supabase" | "example";
  list<T extends TableName>(table: T, options?: ListOptions<T>): Promise<Row<T>[]>;
  get<T extends TableName>(table: T, id: ID): Promise<Row<T> | null>;
  insert<T extends TableName>(table: T, values: Insert<T>): Promise<Row<T>>;
  update<T extends TableName>(table: T, id: ID, patch: Partial<Row<T>>): Promise<Row<T>>;
  remove<T extends TableName>(table: T, id: ID): Promise<void>;
  auth: {
    getUser(): Promise<SessionUser | null>;
    /** supabase: 매직링크 메일 발송. example: 즉시 체험 로그인. */
    signIn(email: string): Promise<{ sent: boolean }>;
    signOut(): Promise<void>;
    deleteAccount(): Promise<void>;
    onChange(callback: () => void): () => void;
  };
  files: {
    upload(petId: ID, type: PetDocument["document_type"], file: File): Promise<PetDocument>;
    /** 짧은 만료시간의 열람 URL */
    openUrl(doc: PetDocument): Promise<string>;
    remove(doc: PetDocument): Promise<void>;
  };
}

export const PUBLIC_TABLES: TableName[] = [
  "care_task_templates",
  "content_cards",
  "content_versions",
  "official_contacts",
  "legal_documents",
  "feature_flags",
  "products",
  "product_lots",
  "facilities",
];

export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "webp"];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function validateFile(file: { name: string; type: string; size: number }): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext) || !ALLOWED_MIME.includes(file.type)) {
    return "PDF, JPG, PNG, WEBP 파일만 올릴 수 있어요.";
  }
  if (file.size > MAX_FILE_BYTES) return "파일은 10MB 이하만 올릴 수 있어요.";
  if (file.size === 0) return "빈 파일은 올릴 수 없어요.";
  return null;
}
