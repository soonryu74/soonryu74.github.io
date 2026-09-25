// 데이터 계층 인터페이스. Supabase(운영)와 예시 모드(로컬 파일) 두 구현이 같은 계약을 따른다.
// 권한: Supabase 구현은 DB RLS가, 예시 구현은 코드의 소유자 필터가 강제한다.
import type {
  AuditLog, CareTask, ConsentRow, ContentCard, ContentStatus, ContentVersion, DocumentRow, Facility, FacilityReport,
  FacilityType, FeatureFlagRow, HealthEvent, IncidentDraft, InsuranceCheck, InsurancePolicy, InsuranceTerm,
  LegalDocumentRow, OfficialContactRow, Pet, PetCondition, Profile, SessionUser,
} from "@/lib/types";
import type { ConditionInput, PetInput } from "@/lib/validation";
import type { NewTask } from "@/lib/rules";

export class AuthRequiredError extends Error { constructor() { super("로그인이 필요해요."); } }
export class ForbiddenError extends Error { constructor(msg = "권한이 없어요.") { super(msg); } }
export class NotFoundError extends Error { constructor(msg = "찾을 수 없어요.") { super(msg); } }

export type TaskPatch = Partial<Pick<CareTask, "status" | "completed_at" | "snoozed_until" | "note">>;
export type EventInput = Pick<HealthEvent, "event_type" | "occurred_at" | "value_json" | "note">;
export type PolicyInput = Omit<InsurancePolicy, "id" | "created_at" | "user_confirmed_at">;
export type TermInput = Omit<InsuranceTerm, "id" | "created_at">;
export type CheckInput = Omit<InsuranceCheck, "id" | "checked_at">;
export type IncidentInput = Omit<IncidentDraft, "id" | "user_id" | "created_at" | "retention_until">;
export type FacilityFilter = { types?: FacilityType[]; q?: string; includeClosed?: boolean };
export type DocumentDownload = { kind: "url"; url: string } | { kind: "bytes"; bytes: Uint8Array; mime: string; name: string };
export type VersionInput = Pick<ContentVersion, "title" | "summary" | "body_json" | "source_json" | "change_reason"> & { author_name: string };
export type ReviewInput = { reviewer_name: string; reviewer_credential: string; reviewed_at: string; next_review_at: string | null; expires_at: string | null };

export interface Store {
  readonly mode: "supabase" | "demo";
  readonly user: SessionUser | null;

  // 계정·동의
  getProfile(): Promise<Profile | null>;
  listConsents(): Promise<ConsentRow[]>;
  recordConsents(items: { document_type: string; document_version: string }[], ipHash: string | null, marketing: boolean): Promise<void>;
  exportMyData(): Promise<Record<string, unknown>>;
  deleteMyAccount(): Promise<"deleted" | "requested">;

  // 반려동물
  listPets(): Promise<Pet[]>;
  getPet(id: string): Promise<Pet | null>;
  createPet(input: PetInput, conditions: ConditionInput[]): Promise<Pet>;
  updatePet(id: string, input: PetInput): Promise<void>;
  deletePet(id: string): Promise<void>;
  listConditions(petId: string): Promise<PetCondition[]>;
  addCondition(petId: string, c: ConditionInput): Promise<void>;
  removeCondition(petId: string, id: string): Promise<void>;

  // 할 일
  listTasks(petId: string, range: { from: string; to: string }): Promise<CareTask[]>;
  getTask(id: string): Promise<CareTask | null>;
  createTasks(petId: string, tasks: NewTask[]): Promise<void>;
  updateTask(id: string, patch: TaskPatch): Promise<void>;

  // 기록
  listEvents(petId: string, limit?: number): Promise<HealthEvent[]>;
  createEvent(petId: string, e: EventInput): Promise<void>;
  deleteEvent(petId: string, id: string): Promise<void>;

  // 문서 (비공개)
  listDocuments(petId: string): Promise<DocumentRow[]>;
  uploadDocument(petId: string, meta: { document_type: string; original_name: string; mime_type: string; ext: string }, bytes: Uint8Array): Promise<DocumentRow>;
  getDocumentDownload(id: string): Promise<DocumentDownload>;
  deleteDocument(id: string): Promise<void>;

  // 보험
  listPolicies(petId?: string): Promise<InsurancePolicy[]>;
  getPolicy(id: string): Promise<InsurancePolicy | null>;
  createPolicy(input: PolicyInput): Promise<InsurancePolicy>;
  deletePolicy(id: string): Promise<void>;
  listTerms(policyId: string): Promise<InsuranceTerm[]>;
  addTerm(input: TermInput): Promise<void>;
  deleteTerm(policyId: string, id: string): Promise<void>;
  listChecks(policyId: string): Promise<InsuranceCheck[]>;
  createCheck(input: CheckInput): Promise<InsuranceCheck>;

  // 신고 준비
  listIncidentDrafts(): Promise<IncidentDraft[]>;
  createIncidentDraft(input: IncidentInput): Promise<void>;
  deleteIncidentDraft(id: string): Promise<void>;

  // 공개 데이터
  listContacts(): Promise<OfficialContactRow[]>;
  listLegalDocuments(): Promise<LegalDocumentRow[]>;
  getFlags(): Promise<FeatureFlagRow[]>;
  listPublicContent(): Promise<{ card: ContentCard; version: ContentVersion }[]>;
  getPublicContent(slug: string): Promise<{ card: ContentCard; version: ContentVersion } | null>;
  listContentCards(): Promise<ContentCard[]>;
  listFacilities(filter: FacilityFilter): Promise<Facility[]>;
  getFacility(id: string): Promise<Facility | null>;
  reportFacility(facilityId: string, reportType: string, details: string | null): Promise<void>;

  // 감사로그 (모든 사용자: 본인 행위 추가만 가능)
  audit(action: string, entityType: string, entityId: string | null, meta?: Record<string, unknown>): Promise<void>;

  // 관리자·검수자 (앱 계층 역할 확인 + DB RLS)
  admin: {
    counts(): Promise<Record<string, number>>;
    listContentWithVersions(): Promise<{ card: ContentCard; versions: ContentVersion[] }[]>;
    createVersion(contentId: string, input: VersionInput): Promise<void>;
    reviewVersion(versionId: string, input: ReviewInput): Promise<void>;
    setVersionStatus(versionId: string, to: ContentStatus): Promise<void>;
    listAudit(limit?: number): Promise<AuditLog[]>;
    listFacilityReports(): Promise<(FacilityReport & { facility_name: string })[]>;
    resolveFacilityReport(id: string, status: "resolved" | "rejected"): Promise<void>;
    listAllLegalDocuments(): Promise<LegalDocumentRow[]>;
    consentStats(): Promise<{ document_type: string; document_version: string; count: number }[]>;
    listAllContacts(): Promise<OfficialContactRow[]>;
    updateContact(id: string, patch: Partial<Pick<OfficialContactRow, "phone" | "url" | "verified_at" | "status" | "source_url">>): Promise<void>;
    listFacilitiesAll(): Promise<Facility[]>;
  };
}
