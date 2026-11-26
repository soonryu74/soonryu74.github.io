// 로그인 화면과 /auth/callback 이 함께 쓰는 동의 기록 도우미.
import { recordConsents } from "@/lib/domain";
import { getRepo } from "@/lib/repo";
import type { LegalDocument, SessionUser } from "@/lib/types";

export const PENDING_CONSENT_KEY = "ps365:pending-consent";

/** 매직링크로 돌아왔을 때 기록할 선택 동의를 이 탭에만 잠시 맡겨 둔다. */
export function savePendingConsent(marketing: boolean) {
  try {
    window.sessionStorage.setItem(PENDING_CONSENT_KEY, JSON.stringify({ marketing }));
  } catch {
    /* 저장소를 못 쓰면 선택 동의는 기록하지 않는다 */
  }
}

export function takePendingConsent(): { marketing: boolean } {
  try {
    const raw = window.sessionStorage.getItem(PENDING_CONSENT_KEY);
    window.sessionStorage.removeItem(PENDING_CONSENT_KEY);
    if (!raw) return { marketing: false };
    const parsed = JSON.parse(raw) as { marketing?: unknown };
    return { marketing: parsed.marketing === true };
  } catch {
    return { marketing: false };
  }
}

/** 게시 중인 약관·개인정보 문서 가운데 시행일이 가장 최근인 것. */
export async function requiredLegalDocs(): Promise<LegalDocument[]> {
  const published = (await getRepo().list("legal_documents")).filter((d) => d.status === "published");
  const latest = (type: LegalDocument["document_type"]) =>
    published.filter((d) => d.document_type === type).sort((a, b) => b.effective_at.localeCompare(a.effective_at))[0];
  return [latest("terms"), latest("privacy")].filter((d): d is LegalDocument => Boolean(d));
}

/** 아직 기록되지 않은 동의만 남긴다. 다시 로그인해도 같은 버전을 중복 기록하지 않는다. */
export async function recordMissingConsents(user: SessionUser, marketing: boolean): Promise<void> {
  const repo = getRepo();
  const existing = await repo.list("user_consents", { eq: { user_id: user.id } });
  const docs = (await requiredLegalDocs()).filter(
    (d) => !existing.some((c) => c.document_type === d.document_type && c.document_version === d.version),
  );
  const wantsMarketing = marketing && !existing.some((c) => c.document_type === "marketing");
  if (docs.length === 0 && !wantsMarketing) return;
  await recordConsents(user, docs, wantsMarketing);
}

export async function homeAfterLogin(): Promise<"/today" | "/onboarding"> {
  const pets = await getRepo().list("pets");
  return pets.some((p) => !p.deleted_at) ? "/today" : "/onboarding";
}
