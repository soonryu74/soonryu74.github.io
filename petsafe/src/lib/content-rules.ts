import type { ContentCard, ContentVersion, ContentStatus } from "@/lib/types";
import { kstDate } from "@/lib/dates";

/** 의료 콘텐츠 공개 규칙: 카드 published + 현재 버전 approved/published + 검수자·검토일 + 만료 전 */
export function isVersionPublic(card: Pick<ContentCard, "status" | "current_version_id">, v: ContentVersion | null | undefined, today = kstDate()): boolean {
  if (!v || card.status !== "published" || card.current_version_id !== v.id) return false;
  if (v.status !== "approved" && v.status !== "published") return false;
  if (!v.reviewer_name || !v.reviewed_at) return false;
  if (v.expires_at && v.expires_at < today) return false;
  return true;
}

// CMS 상태 전이: 초안 → 검수 → 승인 → 게시 → 만료/보관
export const CONTENT_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["in_review", "archived"],
  in_review: ["approved", "draft", "archived"],
  approved: ["published", "draft", "archived"],
  published: ["expired", "archived"],
  expired: ["draft", "archived"],
  archived: [],
};

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return CONTENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "초안",
  in_review: "검수 중",
  approved: "승인됨",
  published: "게시 중",
  expired: "만료",
  archived: "보관",
};
