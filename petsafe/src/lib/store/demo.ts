// 예시 모드 저장소: Supabase 키가 없을 때 로컬 JSON 파일에 저장한다.
// 운영 데이터와 분리되며 화면 전체에 '예시 모드'가 표시된다. 소유자 격리는 코드에서 강제한다.
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import path from "node:path";
import { serverEnv } from "@/lib/env";
import { seedContacts, seedContent, seedFacilities, seedLegalDocuments } from "@/lib/seed";
import { isVersionPublic, canTransition } from "@/lib/content-rules";
import { isContactVisible } from "@/lib/contacts";
import type {
  AuditLog, CareTask, ConsentRow, ContentCard, ContentVersion, DocumentRow, Facility, FacilityReport, FeatureFlagRow,
  HealthEvent, IncidentDraft, InsuranceCheck, InsurancePolicy, InsuranceTerm, LegalDocumentRow, OfficialContactRow,
  Pet, PetCondition, Profile, SessionUser,
} from "@/lib/types";
import { AuthRequiredError, ForbiddenError, NotFoundError, type Store } from "./types";

type DemoUser = { id: string; email: string; created_at: string };
type DB = {
  version: 1;
  users: DemoUser[];
  profiles: Profile[];
  consents: ConsentRow[];
  pets: Pet[];
  conditions: PetCondition[];
  tasks: CareTask[];
  events: HealthEvent[];
  documents: DocumentRow[];
  policies: InsurancePolicy[];
  terms: InsuranceTerm[];
  checks: InsuranceCheck[];
  incidents: IncidentDraft[];
  contacts: OfficialContactRow[];
  legal: LegalDocumentRow[];
  cards: ContentCard[];
  versions: ContentVersion[];
  facilities: Facility[];
  facilityReports: FacilityReport[];
  audit: AuditLog[];
  flags: FeatureFlagRow[];
};

function dir() { return path.resolve(/*turbopackIgnore: true*/ process.cwd(), serverEnv().demoDir); }
function dbPath() { return path.join(dir(), "db.json"); }
function filesDir() { return path.join(dir(), "files"); }

function freshDb(): DB {
  const { cards, versions } = seedContent();
  return {
    version: 1, users: [], profiles: [], consents: [], pets: [], conditions: [], tasks: [], events: [], documents: [],
    policies: [], terms: [], checks: [], incidents: [],
    contacts: seedContacts(), legal: seedLegalDocuments(), cards, versions, facilities: seedFacilities(),
    facilityReports: [], audit: [],
    flags: ["paymentsEnabled", "partnerSubscriptionsEnabled", "insuranceReferralEnabled", "preciseLocationStorageEnabled", "publicReviewsEnabled"]
      .map((key) => ({ key, enabled: false, reason: null, approved_at: null })),
  };
}

// 단일 프로세스 직렬화: 읽기-수정-쓰기를 큐로 묶는다.
let queue: Promise<unknown> = Promise.resolve();
function load(): DB {
  mkdirSync(dir(), { recursive: true });
  if (!existsSync(dbPath())) { const db = freshDb(); save(db); return db; }
  return JSON.parse(readFileSync(dbPath(), "utf8")) as DB;
}
function save(db: DB) {
  const tmp = `${dbPath()}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db));
  renameSync(tmp, dbPath());
}
function read<T>(fn: (db: DB) => T): Promise<T> {
  const p = queue.then(() => fn(load()));
  queue = p.catch(() => undefined);
  return p;
}
function write<T>(fn: (db: DB) => T): Promise<T> {
  const p = queue.then(() => { const db = load(); const r = fn(db); save(db); return r; });
  queue = p.catch(() => undefined);
  return p;
}

const now = () => new Date().toISOString();

/** 예시 모드 로그인: 이메일 → 사용자 생성/조회 */
export async function demoUpsertUser(email: string, adminEmail: string): Promise<SessionUser> {
  return write((db) => {
    let u = db.users.find((x) => x.email === email);
    if (!u) {
      u = { id: randomUUID(), email, created_at: now() };
      db.users.push(u);
      db.profiles.push({ user_id: u.id, display_name: email.split("@")[0], role: "guardian", marketing_consent_at: null, deletion_requested_at: null, created_at: now() });
    }
    const p = db.profiles.find((x) => x.user_id === u!.id)!;
    if (adminEmail && email === adminEmail && p.role !== "admin") p.role = "admin";
    return { id: u.id, email: u.email, role: p.role };
  });
}

export async function demoGetUser(id: string): Promise<SessionUser | null> {
  return read((db) => {
    const u = db.users.find((x) => x.id === id);
    const p = db.profiles.find((x) => x.user_id === id);
    return u && p ? { id: u.id, email: u.email, role: p.role } : null;
  });
}

export function createDemoStore(user: SessionUser | null): Store {
  const uid = () => { if (!user) throw new AuthRequiredError(); return user.id; };
  const isAdmin = () => user?.role === "admin";
  const isReviewer = () => user?.role === "admin" || user?.role === "reviewer";
  const requireAdmin = () => { if (!isAdmin()) throw new ForbiddenError(); };
  const requireReviewer = () => { if (!isReviewer()) throw new ForbiddenError(); };
  const ownPet = (db: DB, petId: string) => {
    const p = db.pets.find((x) => x.id === petId && x.owner_id === uid());
    if (!p) throw new NotFoundError("반려동물을 찾을 수 없어요.");
    return p;
  };
  const ownPolicy = (db: DB, policyId: string) => {
    const pol = db.policies.find((x) => x.id === policyId);
    if (!pol) throw new NotFoundError();
    ownPet(db, pol.pet_id);
    return pol;
  };
  const withDetails = (f: Facility) => f;

  const store: Store = {
    mode: "demo",
    user,

    getProfile: () => read((db) => db.profiles.find((p) => p.user_id === uid()) ?? null),
    listConsents: () => read((db) => db.consents.filter((c) => c.user_id === uid())),
    recordConsents: (items, ipHash, marketing) => write((db) => {
      const id = uid();
      for (const it of items) db.consents.push({ id: randomUUID(), user_id: id, ...it, consented_at: now(), withdrawn_at: null });
      const p = db.profiles.find((x) => x.user_id === id);
      if (p) p.marketing_consent_at = marketing ? now() : null;
      void ipHash;
    }),
    exportMyData: () => read((db) => {
      const id = uid();
      const pets = db.pets.filter((p) => p.owner_id === id);
      const petIds = new Set(pets.map((p) => p.id));
      const policies = db.policies.filter((p) => petIds.has(p.pet_id));
      const polIds = new Set(policies.map((p) => p.id));
      return {
        exported_at: now(), mode: "demo",
        profile: db.profiles.find((p) => p.user_id === id),
        consents: db.consents.filter((c) => c.user_id === id),
        pets, conditions: db.conditions.filter((c) => petIds.has(c.pet_id)),
        tasks: db.tasks.filter((t) => petIds.has(t.pet_id)),
        health_events: db.events.filter((e) => petIds.has(e.pet_id)),
        documents: db.documents.filter((d) => petIds.has(d.pet_id)).map(({ storage_path: _s, ...d }) => { void _s; return d; }),
        insurance_policies: policies,
        insurance_terms: db.terms.filter((t) => polIds.has(t.policy_id)),
        insurance_checks: db.checks.filter((c) => polIds.has(c.policy_id)),
        incident_drafts: db.incidents.filter((i) => i.user_id === id),
      };
    }),
    deleteMyAccount: () => write((db) => {
      const id = uid();
      const petIds = new Set(db.pets.filter((p) => p.owner_id === id).map((p) => p.id));
      for (const d of db.documents.filter((d) => petIds.has(d.pet_id))) {
        const f = path.join(filesDir(), d.storage_path.replace(/[\\/]/g, "_"));
        if (existsSync(f)) unlinkSync(f);
      }
      const polIds = new Set(db.policies.filter((p) => petIds.has(p.pet_id)).map((p) => p.id));
      db.checks = db.checks.filter((c) => !polIds.has(c.policy_id));
      db.terms = db.terms.filter((t) => !polIds.has(t.policy_id));
      db.policies = db.policies.filter((p) => !petIds.has(p.pet_id));
      db.documents = db.documents.filter((d) => !petIds.has(d.pet_id));
      db.events = db.events.filter((e) => !petIds.has(e.pet_id));
      db.tasks = db.tasks.filter((t) => !petIds.has(t.pet_id));
      db.conditions = db.conditions.filter((c) => !petIds.has(c.pet_id));
      db.pets = db.pets.filter((p) => p.owner_id !== id);
      db.incidents = db.incidents.filter((i) => i.user_id !== id);
      db.consents = db.consents.filter((c) => c.user_id !== id);
      db.profiles = db.profiles.filter((p) => p.user_id !== id);
      db.users = db.users.filter((u) => u.id !== id);
      for (const a of db.audit) if (a.actor_id === id) a.actor_id = null;
      db.audit.push({ id: randomUUID(), actor_id: null, actor_role: "system", action: "account.deleted", entity_type: "user", entity_id: null, metadata_json: {}, created_at: now() });
      return "deleted" as const;
    }),

    listPets: () => read((db) => db.pets.filter((p) => p.owner_id === uid()).sort((a, b) => a.created_at.localeCompare(b.created_at))),
    getPet: (id) => read((db) => db.pets.find((p) => p.id === id && p.owner_id === uid()) ?? null),
    createPet: (input, conditions) => write((db) => {
      const pet: Pet = {
        id: randomUUID(), owner_id: uid(), species: input.species, name: input.name,
        birth_date: input.birth_date ?? null, estimated_birth: input.estimated_birth ?? false, sex: input.sex,
        neutered: input.neutered ?? null, weight_kg: input.weight_kg ?? null, indoor: input.indoor ?? null,
        multi_pet: input.multi_pet ?? null, registration_status: input.registration_status, insurance_status: input.insurance_status,
        primary_vet_name: input.primary_vet_name ?? null, primary_vet_phone: input.primary_vet_phone ?? null,
        created_at: now(), updated_at: now(),
      };
      db.pets.push(pet);
      for (const c of conditions) db.conditions.push({ id: randomUUID(), pet_id: pet.id, type: c.type, name: c.name, note: c.note ?? null, active: true, created_at: now() });
      return pet;
    }),
    updatePet: (id, input) => write((db) => {
      const p = ownPet(db, id);
      Object.assign(p, {
        species: input.species, name: input.name, birth_date: input.birth_date ?? null, estimated_birth: input.estimated_birth ?? false,
        sex: input.sex, neutered: input.neutered ?? null, weight_kg: input.weight_kg ?? null, indoor: input.indoor ?? null,
        multi_pet: input.multi_pet ?? null, registration_status: input.registration_status, insurance_status: input.insurance_status,
        primary_vet_name: input.primary_vet_name ?? null, primary_vet_phone: input.primary_vet_phone ?? null, updated_at: now(),
      });
    }),
    deletePet: (id) => write((db) => {
      ownPet(db, id);
      for (const d of db.documents.filter((d) => d.pet_id === id)) {
        const f = path.join(filesDir(), d.storage_path.replace(/[\\/]/g, "_"));
        if (existsSync(f)) unlinkSync(f);
      }
      const polIds = new Set(db.policies.filter((p) => p.pet_id === id).map((p) => p.id));
      db.checks = db.checks.filter((c) => !polIds.has(c.policy_id));
      db.terms = db.terms.filter((t) => !polIds.has(t.policy_id));
      db.policies = db.policies.filter((p) => p.pet_id !== id);
      db.documents = db.documents.filter((d) => d.pet_id !== id);
      db.events = db.events.filter((e) => e.pet_id !== id);
      db.tasks = db.tasks.filter((t) => t.pet_id !== id);
      db.conditions = db.conditions.filter((c) => c.pet_id !== id);
      db.pets = db.pets.filter((p) => p.id !== id);
    }),
    listConditions: (petId) => read((db) => { ownPet(db, petId); return db.conditions.filter((c) => c.pet_id === petId); }),
    addCondition: (petId, c) => write((db) => {
      ownPet(db, petId);
      db.conditions.push({ id: randomUUID(), pet_id: petId, type: c.type, name: c.name, note: c.note ?? null, active: true, created_at: now() });
    }),
    removeCondition: (petId, id) => write((db) => { ownPet(db, petId); db.conditions = db.conditions.filter((c) => !(c.id === id && c.pet_id === petId)); }),

    listTasks: (petId, range) => read((db) => {
      ownPet(db, petId);
      return db.tasks.filter((t) => t.pet_id === petId && t.due_at < range.to && (t.status !== "done" || (t.completed_at ?? "") >= range.from || t.due_at >= range.from))
        .sort((a, b) => a.due_at.localeCompare(b.due_at));
    }),
    getTask: (id) => read((db) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t || !db.pets.some((p) => p.id === t.pet_id && p.owner_id === uid())) return null;
      return t;
    }),
    createTasks: (petId, tasks) => write((db) => {
      ownPet(db, petId);
      for (const t of tasks) {
        db.tasks.push({
          id: randomUUID(), pet_id: petId, template_id: null, template_key: t.template_key, title: t.title, description: t.description,
          due_at: t.due_at, repeat_rule: t.repeat_rule, priority: t.priority, status: "pending", completed_at: null,
          snoozed_until: null, note: null, created_by: uid(), created_at: now(), updated_at: now(),
        });
      }
    }),
    updateTask: (id, patch) => write((db) => {
      const t = db.tasks.find((x) => x.id === id);
      if (!t) throw new NotFoundError();
      ownPet(db, t.pet_id);
      Object.assign(t, patch, { updated_at: now() });
    }),

    listEvents: (petId, limit = 100) => read((db) => {
      ownPet(db, petId);
      return db.events.filter((e) => e.pet_id === petId).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, limit);
    }),
    createEvent: (petId, e) => write((db) => {
      ownPet(db, petId);
      db.events.push({ id: randomUUID(), pet_id: petId, ...e, created_at: now() });
    }),
    deleteEvent: (petId, id) => write((db) => { ownPet(db, petId); db.events = db.events.filter((e) => !(e.id === id && e.pet_id === petId)); }),

    listDocuments: (petId) => read((db) => { ownPet(db, petId); return db.documents.filter((d) => d.pet_id === petId).sort((a, b) => b.created_at.localeCompare(a.created_at)); }),
    uploadDocument: (petId, meta, bytes) => write((db) => {
      ownPet(db, petId);
      const id = randomUUID();
      const storage_path = `${uid()}/${petId}/${id}.${meta.ext}`;
      mkdirSync(filesDir(), { recursive: true });
      writeFileSync(path.join(filesDir(), storage_path.replace(/[\\/]/g, "_")), bytes);
      const row: DocumentRow = { id, pet_id: petId, owner_id: uid(), document_type: meta.document_type, storage_path, original_name: meta.original_name, mime_type: meta.mime_type, size: bytes.byteLength, scan_status: "not_scanned", created_at: now() };
      db.documents.push(row);
      return row;
    }),
    getDocumentDownload: (id) => read((db) => {
      const d = db.documents.find((x) => x.id === id);
      if (!d) throw new NotFoundError();
      ownPet(db, d.pet_id);
      const bytes = new Uint8Array(readFileSync(path.join(filesDir(), d.storage_path.replace(/[\\/]/g, "_"))));
      return { kind: "bytes" as const, bytes, mime: d.mime_type, name: d.original_name };
    }),
    deleteDocument: (id) => write((db) => {
      const d = db.documents.find((x) => x.id === id);
      if (!d) throw new NotFoundError();
      ownPet(db, d.pet_id);
      const f = path.join(filesDir(), d.storage_path.replace(/[\\/]/g, "_"));
      if (existsSync(f)) unlinkSync(f);
      db.documents = db.documents.filter((x) => x.id !== id);
    }),

    listPolicies: (petId) => read((db) => {
      const mine = new Set(db.pets.filter((p) => p.owner_id === uid()).map((p) => p.id));
      return db.policies.filter((p) => mine.has(p.pet_id) && (!petId || p.pet_id === petId));
    }),
    getPolicy: (id) => read((db) => {
      const p = db.policies.find((x) => x.id === id);
      if (!p || !db.pets.some((x) => x.id === p.pet_id && x.owner_id === uid())) return null;
      return p;
    }),
    createPolicy: (input) => write((db) => {
      ownPet(db, input.pet_id);
      const p: InsurancePolicy = { ...input, id: randomUUID(), user_confirmed_at: now(), created_at: now() };
      db.policies.push(p);
      return p;
    }),
    deletePolicy: (id) => write((db) => {
      ownPolicy(db, id);
      db.checks = db.checks.filter((c) => c.policy_id !== id);
      db.terms = db.terms.filter((t) => t.policy_id !== id);
      db.policies = db.policies.filter((p) => p.id !== id);
    }),
    listTerms: (policyId) => read((db) => { ownPolicy(db, policyId); return db.terms.filter((t) => t.policy_id === policyId); }),
    addTerm: (input) => write((db) => { ownPolicy(db, input.policy_id); db.terms.push({ ...input, id: randomUUID(), created_at: now() }); }),
    deleteTerm: (policyId, id) => write((db) => { ownPolicy(db, policyId); db.terms = db.terms.filter((t) => !(t.id === id && t.policy_id === policyId)); }),
    listChecks: (policyId) => read((db) => { ownPolicy(db, policyId); return db.checks.filter((c) => c.policy_id === policyId).sort((a, b) => b.checked_at.localeCompare(a.checked_at)); }),
    createCheck: (input) => write((db) => {
      ownPolicy(db, input.policy_id);
      const c: InsuranceCheck = { ...input, id: randomUUID(), checked_at: now() };
      db.checks.push(c);
      return c;
    }),

    listIncidentDrafts: () => read((db) => db.incidents.filter((i) => i.user_id === uid()).sort((a, b) => b.created_at.localeCompare(a.created_at))),
    createIncidentDraft: (input) => write((db) => {
      const retention = new Date(Date.now() + 90 * 86400 * 1000).toISOString().slice(0, 10);
      db.incidents.push({ ...input, id: randomUUID(), user_id: uid(), retention_until: retention, created_at: now() });
    }),
    deleteIncidentDraft: (id) => write((db) => { db.incidents = db.incidents.filter((i) => !(i.id === id && i.user_id === uid())); }),

    listContacts: () => read((db) => db.contacts.filter((c) => isContactVisible(c)).sort((a, b) => a.sort_order - b.sort_order)),
    listLegalDocuments: () => read((db) => db.legal.filter((d) => d.status === "published")),
    getFlags: () => read((db) => db.flags),
    listPublicContent: () => read((db) => db.cards.flatMap((card) => {
      const v = db.versions.find((x) => x.id === card.current_version_id);
      return v && isVersionPublic(card, v) ? [{ card, version: v }] : [];
    })),
    getPublicContent: (slug) => read((db) => {
      const card = db.cards.find((c) => c.slug === slug);
      if (!card) return null;
      const v = db.versions.find((x) => x.id === card.current_version_id);
      return v && isVersionPublic(card, v) ? { card, version: v } : null;
    }),
    listContentCards: () => read((db) => db.cards),
    listFacilities: (filter) => read((db) => db.facilities.filter((f) =>
      (!filter.types?.length || filter.types.includes(f.facility_type)) &&
      (filter.includeClosed || f.business_status !== "closed") &&
      (!filter.q || `${f.name} ${f.address ?? ""}`.includes(filter.q))).map(withDetails)),
    getFacility: (id) => read((db) => db.facilities.find((f) => f.id === id) ?? null),
    reportFacility: (facilityId, reportType, details) => write((db) => {
      if (!db.facilities.some((f) => f.id === facilityId)) throw new NotFoundError();
      db.facilityReports.push({ id: randomUUID(), facility_id: facilityId, reporter_id: uid(), report_type: reportType, details, status: "open", created_at: now() });
    }),

    audit: (action, entityType, entityId, meta = {}) => write((db) => {
      db.audit.push({ id: randomUUID(), actor_id: user?.id ?? null, actor_role: user?.role ?? "anon", action, entity_type: entityType, entity_id: entityId, metadata_json: meta, created_at: now() });
    }),

    admin: {
      counts: () => read((db) => { requireReviewer(); return {
        users: db.users.length, pets: db.pets.length, content_in_review: db.versions.filter((v) => v.status === "in_review").length,
        content_published: db.cards.filter((c) => c.status === "published").length, facilities: db.facilities.length,
        facility_reports_open: db.facilityReports.filter((r) => r.status === "open").length, contacts_pending: db.contacts.filter((c) => c.status === "pending_verification").length,
      }; }),
      listContentWithVersions: () => read((db) => { requireReviewer(); return db.cards.map((card) => ({ card, versions: db.versions.filter((v) => v.content_id === card.id).sort((a, b) => b.version - a.version) })); }),
      createVersion: (contentId, input) => write((db) => {
        requireReviewer();
        const card = db.cards.find((c) => c.id === contentId);
        if (!card) throw new NotFoundError();
        const next = Math.max(0, ...db.versions.filter((v) => v.content_id === contentId).map((v) => v.version)) + 1;
        db.versions.push({ id: randomUUID(), content_id: contentId, version: next, ...input, reviewer_name: null, reviewer_credential: null, reviewed_at: null, next_review_at: null, expires_at: null, status: "draft", created_at: now() });
      }),
      reviewVersion: (versionId, input) => write((db) => {
        requireReviewer();
        const v = db.versions.find((x) => x.id === versionId);
        if (!v) throw new NotFoundError();
        Object.assign(v, input);
      }),
      setVersionStatus: (versionId, to) => write((db) => {
        requireReviewer();
        const v = db.versions.find((x) => x.id === versionId);
        if (!v) throw new NotFoundError();
        if (!canTransition(v.status, to)) throw new ForbiddenError(`'${v.status}'에서 '${to}'로 바꿀 수 없어요.`);
        if ((to === "approved" || to === "published") && (!v.reviewer_name || !v.reviewed_at)) throw new ForbiddenError("검수자와 검토일을 먼저 기록해 주세요.");
        v.status = to;
        const card = db.cards.find((c) => c.id === v.content_id)!;
        if (to === "published") {
          for (const other of db.versions) if (other.content_id === v.content_id && other.id !== v.id && other.status === "published") other.status = "archived";
          card.current_version_id = v.id; card.status = "published";
        } else if (card.current_version_id === v.id) {
          card.status = to === "archived" || to === "expired" ? to : to === "approved" ? "approved" : to;
        }
        card.updated_at = now();
      }),
      listAudit: (limit = 200) => read((db) => { requireAdmin(); return [...db.audit].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit); }),
      listFacilityReports: () => read((db) => { requireAdmin(); return db.facilityReports.map((r) => ({ ...r, facility_name: db.facilities.find((f) => f.id === r.facility_id)?.name ?? "(삭제됨)" })).sort((a, b) => b.created_at.localeCompare(a.created_at)); }),
      resolveFacilityReport: (id, status) => write((db) => { requireAdmin(); const r = db.facilityReports.find((x) => x.id === id); if (!r) throw new NotFoundError(); r.status = status; }),
      listAllLegalDocuments: () => read((db) => { requireAdmin(); return db.legal; }),
      consentStats: () => read((db) => {
        requireAdmin();
        const m = new Map<string, number>();
        for (const c of db.consents) { const k = `${c.document_type}|${c.document_version}`; m.set(k, (m.get(k) ?? 0) + 1); }
        return [...m.entries()].map(([k, count]) => { const [document_type, document_version] = k.split("|"); return { document_type, document_version, count }; });
      }),
      listAllContacts: () => read((db) => { requireAdmin(); return [...db.contacts].sort((a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order); }),
      updateContact: (id, patch) => write((db) => { requireAdmin(); const c = db.contacts.find((x) => x.id === id); if (!c) throw new NotFoundError(); Object.assign(c, patch); }),
      listFacilitiesAll: () => read((db) => { requireAdmin(); return db.facilities; }),
    },
  };
  return store;
}
