// DB 행 타입. 컬럼명은 supabase/migrations 와 동일한 snake_case 를 쓴다.
export type ID = string;
type Base = { id: ID; created_at: string; updated_at: string };

export type Species = "dog" | "cat";
export type Role = "guardian" | "partner" | "reviewer" | "admin";

export type Profile = Base & {
  user_id: ID;
  display_name: string | null;
  locale: string;
  role: Role;
  marketing_consent_at: string | null;
};

export type Pet = Base & {
  owner_id: ID;
  species: Species;
  name: string;
  birth_date: string | null;
  estimated_birth: boolean;
  sex: "male" | "female" | "unknown";
  neutered: boolean | null;
  weight_kg: number | null;
  registration_status: "registered" | "unregistered" | "unknown";
  insurance_status: "insured" | "uninsured" | "unknown";
  indoor: boolean | null;
  /** 보호자가 직접 적은 다니는 동물병원 전화번호. 긴급 화면에서 한 번에 전화하는 데 쓴다. */
  vet_phone: string | null;
  deleted_at: string | null;
};

export type PetCondition = Base & {
  pet_id: ID;
  type: "condition" | "allergy";
  name: string;
  note: string | null;
  active: boolean;
  source: "guardian" | "vet";
};

export type PriorityClass = "guardian" | "legal" | "safety" | "lifecycle" | "life";

export type CareTaskTemplate = Base & {
  species: Species | "all";
  life_stage: "all" | "young" | "adult" | "senior";
  category: string;
  title: string;
  priority_class: PriorityClass;
  rule_json: {
    registration_status?: Pet["registration_status"][];
    insurance_status?: Pet["insurance_status"][];
    indoor?: boolean;
    neutered?: boolean;
  };
  repeat_rule: "none" | "daily" | "weekly" | "monthly";
  version: number;
  source_name: string | null;
  source_url: string | null;
  reviewed_at: string | null;
  status: "draft" | "approved";
};

export type CareTask = Base & {
  pet_id: ID;
  template_id: ID | null;
  title: string;
  due_at: string;
  repeat_rule: "none" | "daily" | "weekly" | "monthly";
  priority: number;
  status: "open" | "done" | "snoozed";
  completed_at: string | null;
  note: string | null;
  created_by: ID;
};

export type HealthEvent = Base & {
  pet_id: ID;
  event_type: "task_done" | "weight" | "medication_note" | "test" | "visit" | "cost" | "note";
  occurred_at: string;
  value_json: Record<string, unknown>;
  note: string | null;
  visibility: "private";
};

export type PetDocument = Base & {
  pet_id: ID;
  owner_id: ID;
  document_type: "medical" | "insurance" | "receipt" | "other";
  storage_path: string;
  original_name: string;
  mime_type: string;
  size: number;
  retention_until: string | null;
};

export type InsurancePolicy = Base & {
  pet_id: ID;
  insurer: string;
  product_name: string;
  terms_version: string | null;
  joined_at: string | null;
  renewal_at: string | null;
  coverage_json: { annual_limit?: string };
  deductible_json: { text?: string };
  user_confirmed_at: string | null;
};

export type InsuranceClassification = "covered" | "check" | "excluded";

export type InsuranceTerm = Base & {
  policy_id: ID;
  category: string;
  clause_text: string;
  clause_reference: string | null;
  classification: InsuranceClassification;
  source_document_id: ID | null;
};

export type InsuranceResult = "likely_covered" | "check_terms" | "generally_excluded";

export type InsuranceCheck = Base & {
  policy_id: ID;
  input_json: { category: string };
  result: InsuranceResult;
  evidence_json: { type: "user_clause" | "general_guide"; text: string; reference?: string | null; terms_version?: string | null };
  checked_at: string;
};

export type Facility = Base & {
  facility_type: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  business_status: "open" | "closed" | "suspended" | "unknown";
  hours_status: "verified" | "unverified";
  emergency_status: "verified" | "unverified";
  pet_access_json: Record<string, string>;
  source_system: string;
  source_id: string;
  source_updated_at: string | null;
  is_example: boolean;
};

export type FacilityReport = Base & {
  facility_id: ID;
  reporter_id: ID;
  report_type: "closed" | "wrong_phone" | "wrong_hours" | "other";
  details: string;
  status: "open" | "resolved";
  resolved_at: string | null;
};

export type PartnerInquiry = Base & {
  user_id: ID;
  business_name: string;
  category: string;
  contact: string;
  message: string;
  status: "new" | "contacted" | "closed";
  consent_at: string;
};

export type ContentStatus = "draft" | "in_review" | "approved" | "published" | "expired" | "archived";

export type ContentCard = Base & {
  slug: string;
  content_type: "zoonosis" | "health";
  species: Species | "all";
  current_version_id: ID | null;
  status: ContentStatus;
};

export type ContentBody = {
  title: string;
  summary: string;
  animal_signs: string[];
  human_signs: string[];
  transmission: string[];
  prevention: string[];
  human_see_doctor: string[];
  animal_see_vet: string[];
  do_not: string[];
};

export type ContentVersion = Base & {
  content_id: ID;
  version: number;
  body_json: ContentBody;
  source_json: { org: string; url: string }[];
  author_id: ID | null;
  reviewer_id: ID | null;
  reviewer_credential: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  change_reason: string | null;
  status: ContentStatus;
};

export type OfficialContact = Base & {
  category: "lost_found" | "lost_mine" | "abuse" | "illegal_practice" | "consumer";
  organization: string;
  phone: string | null;
  url: string | null;
  coverage_area: string;
  available_hours: string | null;
  verified_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  source_url: string | null;
  status: "active" | "pending" | "retired";
};

export type IncidentDraft = Base & {
  user_id: ID;
  incident_type: OfficialContact["category"];
  occurred_at: string | null;
  location_precision: "none" | "district";
  details_json: { place?: string; features?: string; checklist?: string[] };
  retention_until: string | null;
};

export type LegalDocument = Base & {
  document_type: "terms" | "privacy" | "location" | "copyright" | "refund" | "ads";
  version: string;
  effective_at: string;
  body: string;
  status: "draft" | "published";
};

export type UserConsent = Base & {
  user_id: ID;
  document_type: LegalDocument["document_type"] | "marketing";
  document_version: string;
  consented_at: string;
  ip_hash: string | null;
};

export type AuditLog = Base & {
  actor_id: ID;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata_json: Record<string, unknown>;
};

export type FeatureFlagKey =
  | "paymentsEnabled"
  | "partnerSubscriptionsEnabled"
  | "insuranceReferralEnabled"
  | "preciseLocationStorageEnabled"
  | "publicReviewsEnabled"
  | "adsEnabled";

export type FeatureFlag = Base & {
  key: FeatureFlagKey;
  enabled: boolean;
  approved_by: ID | null;
  approved_at: string | null;
};

export type Product = Base & {
  slug: string;
  name: string;
  material: "leather" | "wool_felt" | "set";
  summary: string;
  description: string;
  price_krw: number;
  shipping_included: boolean;
  size_cm: string | null;
  min_mouth: "small" | "medium" | "large";
  not_for: string[];
  origin_country: string;
  importer: string | null;
  external_url: string | null;
  status: "draft" | "on_sale" | "sold_out";
  is_example: boolean;
};

export type ProductLot = Base & {
  product_id: ID;
  lot_code: string;
  tested_at: string | null;
  lab_name: string | null;
  results_json: { item: string; result: string }[];
  report_document_url: string | null;
  status: "pending" | "passed" | "failed";
};

export type Order = Base & {
  user_id: ID | null;
  status: "pending" | "paid" | "cancelled" | "refunded";
  total_krw: number;
  items_json: { product_id: ID; name: string; qty: number; price_krw: number }[];
  payment_provider: string | null;
  payment_ref: string | null;
};

/** 출시 알림 신청. 누구나 남길 수 있고 운영자만 읽는다. */
export type WaitlistEntry = Base & {
  email: string;
  dog_size: "small" | "medium" | "large" | "unknown";
  consent_at: string;
};

export type Tables = {
  profiles: Profile;
  pets: Pet;
  pet_conditions: PetCondition;
  care_task_templates: CareTaskTemplate;
  care_tasks: CareTask;
  health_events: HealthEvent;
  documents: PetDocument;
  insurance_policies: InsurancePolicy;
  insurance_terms: InsuranceTerm;
  insurance_checks: InsuranceCheck;
  facilities: Facility;
  facility_reports: FacilityReport;
  partner_inquiries: PartnerInquiry;
  content_cards: ContentCard;
  content_versions: ContentVersion;
  official_contacts: OfficialContact;
  incident_drafts: IncidentDraft;
  legal_documents: LegalDocument;
  user_consents: UserConsent;
  audit_logs: AuditLog;
  feature_flags: FeatureFlag;
  products: Product;
  product_lots: ProductLot;
  orders: Order;
  waitlist: WaitlistEntry;
};
export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T];
export type Insert<T extends TableName> = Omit<Row<T>, "id" | "created_at" | "updated_at"> & { id?: ID };

export type SessionUser = { id: ID; email: string; role: Role };
