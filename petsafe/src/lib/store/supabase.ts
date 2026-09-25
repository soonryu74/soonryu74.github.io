// 운영 저장소: Supabase. 권한은 DB RLS가 강제한다(앱 계층 확인은 보조).
import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseService } from "@/lib/supabase/server";
import { stableUuid } from "@/lib/seed";
import { isVersionPublic, canTransition } from "@/lib/content-rules";
import { isContactVisible } from "@/lib/contacts";
import type { ContentCard, ContentVersion, Facility, FacilityReport, SessionUser } from "@/lib/types";
import { AuthRequiredError, ForbiddenError, NotFoundError, type Store } from "./types";

const BUCKET = "pet-documents";
const SIGNED_URL_SECONDS = 60;

// 스키마 타입 생성 전(supabase gen types)이라 행 타입은 도메인 타입으로 단언한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function must<T = any>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

type FacilityRow = Omit<Facility, "details"> & { facility_details: Facility["details"] | Facility["details"][] | null };
function toFacility(r: FacilityRow): Facility {
  const d = Array.isArray(r.facility_details) ? r.facility_details[0] ?? null : r.facility_details;
  const { facility_details: _fd, ...rest } = r;
  void _fd;
  return { ...rest, details: d };
}

export function createSupabaseStore(sb: SupabaseClient, user: SessionUser | null): Store {
  const uid = () => { if (!user) throw new AuthRequiredError(); return user.id; };
  const requireReviewer = () => { if (user?.role !== "admin" && user?.role !== "reviewer") throw new ForbiddenError(); };
  const requireAdmin = () => { if (user?.role !== "admin") throw new ForbiddenError(); };

  const store: Store = {
    mode: "supabase",
    user,

    async getProfile() {
      if (!user) return null;
      return must(await sb.from("profiles").select("*").eq("user_id", uid()).maybeSingle());
    },
    async listConsents() {
      return must(await sb.from("user_consents").select("*").eq("user_id", uid()).order("consented_at", { ascending: false })) ?? [];
    },
    async recordConsents(items, ipHash, marketing) {
      const id = uid();
      must(await sb.from("user_consents").insert(items.map((i) => ({ ...i, user_id: id, ip_hash: ipHash }))));
      must(await sb.from("profiles").update({ marketing_consent_at: marketing ? new Date().toISOString() : null }).eq("user_id", id));
    },
    async exportMyData() {
      const id = uid();
      const pets = must(await sb.from("pets").select("*").eq("owner_id", id)) ?? [];
      const petIds = pets.map((p: { id: string }) => p.id);
      const inPets = <T,>(table: string) => petIds.length ? sb.from(table).select("*").in("pet_id", petIds).then((r) => must(r) as T) : Promise.resolve([] as T);
      const policies = await inPets<{ id: string }[]>("insurance_policies");
      const polIds = policies.map((p) => p.id);
      const inPol = (table: string) => polIds.length ? sb.from(table).select("*").in("policy_id", polIds).then(must) : Promise.resolve([]);
      return {
        exported_at: new Date().toISOString(),
        profile: must(await sb.from("profiles").select("*").eq("user_id", id).maybeSingle()),
        consents: must(await sb.from("user_consents").select("*").eq("user_id", id)),
        pets,
        conditions: await inPets("pet_conditions"),
        tasks: await inPets("care_tasks"),
        health_events: await inPets("health_events"),
        documents: petIds.length ? must(await sb.from("documents").select("id, pet_id, document_type, original_name, mime_type, size, created_at").in("pet_id", petIds)) : [],
        insurance_policies: policies,
        insurance_terms: await inPol("insurance_terms"),
        insurance_checks: await inPol("insurance_checks"),
        incident_drafts: must(await sb.from("incident_drafts").select("*").eq("user_id", id)),
      };
    },
    async deleteMyAccount() {
      const id = uid();
      const service = supabaseService();
      await store.audit("account.delete_requested", "user", id);
      if (!service) {
        // 서비스 키 없이는 auth 사용자를 삭제할 수 없으므로 삭제 요청으로 기록하고 개인 데이터는 즉시 지운다.
        const own = must(await sb.from("documents").select("storage_path").eq("owner_id", id)) ?? [];
        if (own.length) await sb.storage.from(BUCKET).remove(own.map((d: { storage_path: string }) => d.storage_path));
        must(await sb.from("pets").delete().eq("owner_id", id));
        must(await sb.from("incident_drafts").delete().eq("user_id", id));
        must(await sb.from("profiles").update({ deletion_requested_at: new Date().toISOString() }).eq("user_id", id));
        return "requested";
      }
      // 비공개 문서 파일 삭제 후 사용자 삭제(연관 행은 on delete cascade)
      const { data: docs } = await service.from("documents").select("storage_path").eq("owner_id", id);
      const paths = (docs ?? []).map((d: { storage_path: string }) => d.storage_path);
      if (paths.length) await service.storage.from(BUCKET).remove(paths);
      const { error } = await service.auth.admin.deleteUser(id);
      if (error) throw new Error(error.message);
      return "deleted";
    },

    async listPets() {
      return must(await sb.from("pets").select("*").eq("owner_id", uid()).is("deleted_at", null).order("created_at")) ?? [];
    },
    async getPet(id) {
      uid();
      return must(await sb.from("pets").select("*").eq("id", id).maybeSingle());
    },
    async createPet(input, conditions) {
      const pet = must(await sb.from("pets").insert({ ...input, estimated_birth: input.estimated_birth ?? false, owner_id: uid() }).select("*").single());
      if (conditions.length) must(await sb.from("pet_conditions").insert(conditions.map((c) => ({ ...c, pet_id: pet.id }))));
      return pet;
    },
    async updatePet(id, input) {
      const rows = must(await sb.from("pets").update({ ...input, estimated_birth: input.estimated_birth ?? false }).eq("id", id).select("id"));
      if (!rows?.length) throw new NotFoundError("반려동물을 찾을 수 없어요.");
    },
    async deletePet(id) {
      const pet = await store.getPet(id);
      if (!pet || pet.owner_id !== uid()) throw new NotFoundError("반려동물을 찾을 수 없어요.");
      const docs = must(await sb.from("documents").select("storage_path").eq("pet_id", id)) ?? [];
      if (docs.length) await sb.storage.from(BUCKET).remove(docs.map((d: { storage_path: string }) => d.storage_path));
      must(await sb.from("pets").delete().eq("id", id));
    },
    async listConditions(petId) {
      return must(await sb.from("pet_conditions").select("*").eq("pet_id", petId).order("created_at")) ?? [];
    },
    async addCondition(petId, c) { must(await sb.from("pet_conditions").insert({ ...c, pet_id: petId })); },
    async removeCondition(petId, id) { must(await sb.from("pet_conditions").delete().eq("id", id).eq("pet_id", petId)); },

    async listTasks(petId, range) {
      uid();
      const rows = must(await sb.from("care_tasks").select("*").eq("pet_id", petId).lt("due_at", range.to)
        .or(`status.neq.done,completed_at.gte.${range.from},due_at.gte.${range.from}`).order("due_at")) ?? [];
      return rows;
    },
    async getTask(id) { uid(); return must(await sb.from("care_tasks").select("*").eq("id", id).maybeSingle()); },
    async createTasks(petId, tasks) {
      if (!tasks.length) return;
      must(await sb.from("care_tasks").insert(tasks.map((t) => ({
        pet_id: petId,
        template_id: t.template_id ?? (t.template_key ? stableUuid(`template:${t.template_key}`) : null),
        title: t.title, description: t.description, due_at: t.due_at, repeat_rule: t.repeat_rule, priority: t.priority, created_by: uid(),
      }))));
    },
    async updateTask(id, patch) {
      const rows = must(await sb.from("care_tasks").update(patch).eq("id", id).select("id"));
      if (!rows?.length) throw new NotFoundError();
    },

    async listEvents(petId, limit = 100) {
      uid();
      return must(await sb.from("health_events").select("*").eq("pet_id", petId).order("occurred_at", { ascending: false }).limit(limit)) ?? [];
    },
    async createEvent(petId, e) { must(await sb.from("health_events").insert({ ...e, pet_id: petId, created_by: uid() })); },
    async deleteEvent(petId, id) { must(await sb.from("health_events").delete().eq("id", id).eq("pet_id", petId)); },

    async listDocuments(petId) {
      uid();
      return must(await sb.from("documents").select("*").eq("pet_id", petId).is("deleted_at", null).order("created_at", { ascending: false })) ?? [];
    },
    async uploadDocument(petId, meta, bytes) {
      const pet = await store.getPet(petId);
      if (!pet) throw new NotFoundError("반려동물을 찾을 수 없어요.");
      const id = randomUUID();
      const storage_path = `${uid()}/${petId}/${id}.${meta.ext}`;
      const up = await sb.storage.from(BUCKET).upload(storage_path, bytes, { contentType: meta.mime_type, upsert: false });
      if (up.error) throw new Error(up.error.message);
      const row = await sb.from("documents").insert({
        id, pet_id: petId, owner_id: uid(), document_type: meta.document_type, storage_path,
        original_name: meta.original_name, mime_type: meta.mime_type, size: bytes.byteLength,
      }).select("*").single();
      if (row.error) { await sb.storage.from(BUCKET).remove([storage_path]); throw new Error(row.error.message); }
      return row.data;
    },
    async getDocumentDownload(id) {
      uid();
      const d = must(await sb.from("documents").select("*").eq("id", id).maybeSingle());
      if (!d) throw new NotFoundError();
      const signed = await sb.storage.from(BUCKET).createSignedUrl(d.storage_path, SIGNED_URL_SECONDS, { download: d.original_name });
      if (signed.error) throw new Error(signed.error.message);
      return { kind: "url", url: signed.data.signedUrl };
    },
    async deleteDocument(id) {
      const d = must(await sb.from("documents").select("*").eq("id", id).eq("owner_id", uid()).maybeSingle());
      if (!d) throw new NotFoundError();
      await sb.storage.from(BUCKET).remove([d.storage_path]);
      must(await sb.from("documents").delete().eq("id", id));
    },

    async listPolicies(petId) {
      uid();
      let q = sb.from("insurance_policies").select("*").order("created_at");
      if (petId) q = q.eq("pet_id", petId);
      return must(await q) ?? [];
    },
    async getPolicy(id) { uid(); return must(await sb.from("insurance_policies").select("*").eq("id", id).maybeSingle()); },
    async createPolicy(input) {
      uid();
      return must(await sb.from("insurance_policies").insert({ ...input, user_confirmed_at: new Date().toISOString() }).select("*").single());
    },
    async deletePolicy(id) { uid(); must(await sb.from("insurance_policies").delete().eq("id", id)); },
    async listTerms(policyId) { uid(); return must(await sb.from("insurance_terms").select("*").eq("policy_id", policyId).order("created_at")) ?? []; },
    async addTerm(input) { uid(); must(await sb.from("insurance_terms").insert(input)); },
    async deleteTerm(policyId, id) { uid(); must(await sb.from("insurance_terms").delete().eq("id", id).eq("policy_id", policyId)); },
    async listChecks(policyId) { uid(); return must(await sb.from("insurance_checks").select("*").eq("policy_id", policyId).order("checked_at", { ascending: false }).limit(20)) ?? []; },
    async createCheck(input) { uid(); return must(await sb.from("insurance_checks").insert(input).select("*").single()); },

    async listIncidentDrafts() { return must(await sb.from("incident_drafts").select("*").eq("user_id", uid()).order("created_at", { ascending: false })) ?? []; },
    async createIncidentDraft(input) { must(await sb.from("incident_drafts").insert({ ...input, user_id: uid() })); },
    async deleteIncidentDraft(id) { must(await sb.from("incident_drafts").delete().eq("id", id).eq("user_id", uid())); },

    async listContacts() {
      const rows = must(await sb.from("official_contacts").select("*").order("sort_order")) ?? [];
      return rows.filter((c: Parameters<typeof isContactVisible>[0]) => isContactVisible(c));
    },
    async listLegalDocuments() { return must(await sb.from("legal_documents").select("*").eq("status", "published").order("effective_at", { ascending: false })) ?? []; },
    async getFlags() { return must(await sb.from("feature_flags").select("key, enabled, reason, approved_at")) ?? []; },
    async listPublicContent() {
      const rows = must(await sb.from("content_cards").select("*, current:content_versions!content_cards_current_fk(*)").eq("status", "published")) ?? [];
      return rows.flatMap((r: ContentCard & { current: ContentVersion | null }) => {
        const { current, ...card } = r;
        return current && isVersionPublic(card, current) ? [{ card, version: current }] : [];
      });
    },
    async getPublicContent(slug) {
      const r = must(await sb.from("content_cards").select("*, current:content_versions!content_cards_current_fk(*)").eq("slug", slug).maybeSingle()) as (ContentCard & { current: ContentVersion | null }) | null;
      if (!r) return null;
      const { current, ...card } = r;
      return current && isVersionPublic(card, current) ? { card, version: current } : null;
    },
    async listContentCards() { return must(await sb.from("content_cards").select("*")) ?? []; },
    async listFacilities(filter) {
      let q = sb.from("facilities").select("*, facility_details(*)").is("merged_into", null).limit(300);
      if (filter.types?.length) q = q.in("facility_type", filter.types);
      if (!filter.includeClosed) q = q.neq("business_status", "closed");
      if (filter.q) {
        const safe = filter.q.replace(/[%,()"\\*]/g, " ").trim();
        if (safe) q = q.or(`name.ilike.%${safe}%,address.ilike.%${safe}%,road_address.ilike.%${safe}%`);
      }
      return (must(await q) ?? []).map(toFacility);
    },
    async getFacility(id) {
      const r = must(await sb.from("facilities").select("*, facility_details(*)").eq("id", id).maybeSingle());
      return r ? toFacility(r) : null;
    },
    async reportFacility(facilityId, reportType, details) {
      must(await sb.from("facility_reports").insert({ facility_id: facilityId, reporter_id: uid(), report_type: reportType, details }));
    },

    async audit(action, entityType, entityId, meta = {}) {
      if (!user) return; // 비회원 행위는 기록 대상 아님(RLS상 actor_id 필요)
      const { error } = await sb.from("audit_logs").insert({ actor_id: user.id, actor_role: user.role, action, entity_type: entityType, entity_id: entityId, metadata_json: meta });
      if (error) console.error("audit log failed", error.message);
    },

    admin: {
      async counts() {
        requireReviewer();
        const count = async (table: string, eq?: [string, string]) => {
          let q = sb.from(table).select("*", { count: "exact", head: true });
          if (eq) q = q.eq(eq[0], eq[1]);
          const { count: n } = await q;
          return n ?? 0;
        };
        return {
          content_in_review: await count("content_versions", ["status", "in_review"]),
          content_published: await count("content_cards", ["status", "published"]),
          facilities: await count("facilities"),
          facility_reports_open: await count("facility_reports", ["status", "open"]),
          contacts_pending: await count("official_contacts", ["status", "pending_verification"]),
        };
      },
      async listContentWithVersions() {
        requireReviewer();
        const cards = must(await sb.from("content_cards").select("*").order("slug")) ?? [];
        const versions = must(await sb.from("content_versions").select("*").order("version", { ascending: false })) ?? [];
        return cards.map((card: ContentCard) => ({ card, versions: versions.filter((v: ContentVersion) => v.content_id === card.id) }));
      },
      async createVersion(contentId, input) {
        requireReviewer();
        const existing = must(await sb.from("content_versions").select("version").eq("content_id", contentId).order("version", { ascending: false }).limit(1)) ?? [];
        const next = (existing[0]?.version ?? 0) + 1;
        must(await sb.from("content_versions").insert({ content_id: contentId, version: next, ...input, author_id: uid(), status: "draft" }));
      },
      async reviewVersion(versionId, input) {
        requireReviewer();
        must(await sb.from("content_versions").update({ ...input, reviewer_id: uid() }).eq("id", versionId));
      },
      async setVersionStatus(versionId, to) {
        requireReviewer();
        const v = must(await sb.from("content_versions").select("*").eq("id", versionId).single()) as ContentVersion;
        if (!canTransition(v.status, to)) throw new ForbiddenError(`'${v.status}'에서 '${to}'로 바꿀 수 없어요.`);
        if ((to === "approved" || to === "published") && (!v.reviewer_name || !v.reviewed_at)) throw new ForbiddenError("검수자와 검토일을 먼저 기록해 주세요.");
        if (to === "published") {
          must(await sb.from("content_versions").update({ status: "archived" }).eq("content_id", v.content_id).eq("status", "published").neq("id", v.id));
        }
        must(await sb.from("content_versions").update({ status: to }).eq("id", versionId));
        const card = must(await sb.from("content_cards").select("*").eq("id", v.content_id).single()) as ContentCard;
        if (to === "published") must(await sb.from("content_cards").update({ status: "published", current_version_id: v.id }).eq("id", v.content_id));
        else if (card.current_version_id === v.id) must(await sb.from("content_cards").update({ status: to }).eq("id", v.content_id));
      },
      async listAudit(limit = 200) { requireAdmin(); return must(await sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit)) ?? []; },
      async listFacilityReports() {
        requireAdmin();
        const rows = must(await sb.from("facility_reports").select("*, facilities(name)").order("created_at", { ascending: false })) ?? [];
        return rows.map((r: FacilityReport & { facilities: { name: string } | null }) => { const { facilities, ...rest } = r; return { ...rest, facility_name: facilities?.name ?? "(삭제됨)" }; });
      },
      async resolveFacilityReport(id, status) { requireAdmin(); must(await sb.from("facility_reports").update({ status, resolved_at: new Date().toISOString() }).eq("id", id)); },
      async listAllLegalDocuments() { requireAdmin(); return must(await sb.from("legal_documents").select("*").order("effective_at", { ascending: false })) ?? []; },
      async consentStats() {
        requireAdmin();
        const rows = must(await sb.from("user_consents").select("document_type, document_version")) ?? [];
        const m = new Map<string, number>();
        for (const r of rows as { document_type: string; document_version: string }[]) { const k = `${r.document_type}|${r.document_version}`; m.set(k, (m.get(k) ?? 0) + 1); }
        return [...m.entries()].map(([k, count]) => { const [document_type, document_version] = k.split("|"); return { document_type, document_version, count }; });
      },
      async listAllContacts() { requireAdmin(); return must(await sb.from("official_contacts").select("*").order("category").order("sort_order")) ?? []; },
      async updateContact(id, patch) { requireAdmin(); must(await sb.from("official_contacts").update(patch).eq("id", id)); },
      async listFacilitiesAll() { requireAdmin(); return (must(await sb.from("facilities").select("*, facility_details(*)").limit(500)) ?? []).map(toFacility); },
    },
  };
  return store;
}
