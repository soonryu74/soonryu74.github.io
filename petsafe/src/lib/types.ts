// 도메인 타입. DB 행과 같은 snake_case 형태를 그대로 쓴다(매핑 코드 최소화).
export type Species = "dog" | "cat";
export type Sex = "male" | "female" | "unknown";
export type RegistrationStatus = "registered" | "not_registered" | "unknown" | "not_applicable";
export type InsuranceStatus = "insured" | "not_insured" | "unknown";
export type TaskStatus = "pending" | "done" | "snoozed" | "skipped";
export type TaskPriority = "legal" | "safety" | "health" | "general" | "lifestyle";
export type UserRole = "guardian" | "reviewer" | "partner" | "admin";
export type ContentStatus = "draft" | "in_review" | "approved" | "published" | "expired" | "archived";

export type SessionUser = { id: string; email: string; role: UserRole };

export type Profile = {
  user_id: string;
  display_name: string | null;
  role: UserRole;
  marketing_consent_at: string | null;
  deletion_requested_at: string | null;
  created_at: string;
};

export type Pet = {
  id: string;
  owner_id: string;
  species: Species;
  name: string;
  birth_date: string | null;
  estimated_birth: boolean;
  sex: Sex;
  neutered: boolean | null;
  weight_kg: number | null;
  indoor: boolean | null;
  multi_pet: boolean | null;
  registration_status: RegistrationStatus;
  insurance_status: InsuranceStatus;
  primary_vet_name: string | null;
  primary_vet_phone: string | null;
  created_at: string;
  updated_at: string;
};

export type PetCondition = {
  id: string;
  pet_id: string;
  type: "disease" | "allergy" | "medication" | "other";
  name: string;
  note: string | null;
  active: boolean;
  created_at: string;
};

export type CareTask = {
  id: string;
  pet_id: string;
  template_id: string | null;
  template_key?: string | null;
  title: string;
  description: string | null;
  due_at: string;
  repeat_rule: "daily" | "weekly" | "monthly" | null;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  snoozed_until: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type HealthEventType =
  | "weight" | "medication_note" | "exam" | "visit" | "cost" | "observation" | "task_done" | "emergency_note" | "document";

export type HealthEvent = {
  id: string;
  pet_id: string;
  event_type: HealthEventType;
  occurred_at: string;
  value_json: Record<string, unknown>;
  note: string | null;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  pet_id: string;
  owner_id: string;
  document_type: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size: number;
  scan_status: string;
  created_at: string;
};

export type InsurancePolicy = {
  id: string;
  pet_id: string;
  insurer: string;
  product_name: string;
  terms_version: string | null;
  joined_at: string | null;
  renewal_at: string | null;
  coverage_json: { annual_limit?: number | null; per_visit_limit?: number | null; coverage_rate?: number | null };
  deductible_json: { per_visit?: number | null };
  customer_center: string | null;
  user_confirmed_at: string | null;
  created_at: string;
};

export type ClauseClassification = "covered" | "excluded" | "conditional" | "unknown";
export type InsuranceTerm = {
  id: string;
  policy_id: string;
  category: string;
  clause_text: string;
  clause_reference: string | null;
  classification: ClauseClassification;
  created_at: string;
};

export type InsuranceResult = "likely_covered" | "check_terms" | "generally_excluded";
export type InsuranceCheck = {
  id: string;
  policy_id: string;
  input_json: { category: string; note?: string };
  result: InsuranceResult;
  evidence_json: { evidence_type: "user_clause" | "general_guidance"; evidence_text: string; clause_reference?: string | null; terms_version: string | null };
  checked_at: string;
};

export type IncidentDraft = {
  id: string;
  user_id: string;
  incident_type: string;
  occurred_at: string | null;
  location_precision: "none" | "coarse";
  location_text: string | null;
  details_json: { features?: string; evidence?: string[]; memo?: string };
  retention_until: string;
  created_at: string;
};

export type OfficialContactRow = {
  id: string;
  key: string;
  category: string;
  organization: string;
  phone: string | null;
  url: string | null;
  coverage_area: string;
  available_hours: string | null;
  description: string | null;
  verified_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  source_url: string | null;
  status: string;
  sort_order: number;
};

export type LegalDocumentRow = {
  id: string;
  document_type: string;
  version: string;
  title: string;
  effective_at: string;
  body: string;
  required: boolean;
  status: ContentStatus;
};

export type ConsentRow = {
  id: string;
  user_id: string;
  document_type: string;
  document_version: string;
  consented_at: string;
  withdrawn_at: string | null;
};

export type ContentCard = {
  id: string;
  slug: string;
  content_type: string;
  species: string[];
  current_version_id: string | null;
  status: ContentStatus;
  updated_at: string;
};

export type ContentVersion = {
  id: string;
  content_id: string;
  version: number;
  title: string;
  summary: string;
  body_json: Record<string, string[]>;
  source_json: { organization: string; url: string; checkedAt?: string }[];
  author_name: string | null;
  reviewer_name: string | null;
  reviewer_credential: string | null;
  reviewed_at: string | null;
  next_review_at: string | null;
  expires_at: string | null;
  status: ContentStatus;
  change_reason: string | null;
  created_at: string;
};

export type FacilityType =
  | "animal_hospital" | "animal_pharmacy" | "shelter" | "grooming" | "boarding" | "funeral" | "transport"
  | "pet_cafe" | "park" | "playground" | "lodging" | "restaurant" | "shopping";
export type VerificationState = "verified" | "unverified" | "disputed";

export type Facility = {
  id: string;
  facility_type: FacilityType;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  business_status: "open" | "closed" | "suspended" | "unknown";
  source_system: string;
  source_id: string;
  source_updated_at: string | null;
  last_synced_at: string | null;
  license: string | null;
  is_example: boolean;
  details: {
    hours_json: Record<string, string>;
    pet_access_json: Record<string, string | boolean | null>;
    emergency_status: VerificationState;
    specialty_status: VerificationState;
    hours_status: VerificationState;
  } | null;
};

export type FacilityReport = {
  id: string;
  facility_id: string;
  reporter_id: string | null;
  report_type: string;
  details: string | null;
  status: "open" | "resolved" | "rejected";
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type FeatureFlagRow = { key: string; enabled: boolean; reason: string | null; approved_at: string | null };

export type RescueWatch = {
  id: string;
  user_id: string;
  label: string;
  sido_code: string | null;
  sido_name: string | null;
  sigungu_code: string | null;
  sigungu_name: string | null;
  species: "dog" | "cat" | "other" | null;
  keyword: string | null;
  last_seen_at: string;
  created_at: string;
};
