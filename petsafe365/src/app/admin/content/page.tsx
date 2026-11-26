"use client";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Loading, Notice, PageHeader, SourceMeta, formatDate } from "@/components/ui";
import { audit } from "@/lib/domain";
import { useAsync, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { ContentCard, ContentStatus, ContentVersion } from "@/lib/types";

const STATUS_LABEL: Record<ContentStatus, string> = { draft: "초안", in_review: "검수 중", approved: "승인", published: "게시", expired: "만료", archived: "보관" };
const STATUS_TONE: Record<ContentStatus, "neutral" | "safe" | "warn" | "danger" | "brand"> = { draft: "neutral", in_review: "warn", approved: "brand", published: "safe", expired: "danger", archived: "neutral" };

type Mode = "approve" | "reject" | null;

function isoDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ContentItem({ card, version, onChanged }: { card: ContentCard; version: ContentVersion | null; onChanged: () => void }) {
  const { user } = useSession();
  const [mode, setMode] = useState<Mode>(null);
  const [credential, setCredential] = useState("");
  const [expires, setExpires] = useState("");
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<{ credential?: string; expires?: string; reason?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";
  const status = version?.status ?? card.status;

  /** 버전 상태를 바꾸고, 필요하면 카드 상태도 맞춘 뒤 감사로그를 남긴다. */
  const move = async (to: ContentStatus, patch: Partial<ContentVersion>, cardStatus: ContentStatus | null, doneText: string) => {
    if (!version) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const repo = getRepo();
      await repo.update("content_versions", version.id, { ...patch, status: to });
      if (cardStatus) await repo.update("content_cards", card.id, { status: cardStatus });
      await audit("content_status_change", "content_versions", version.id, { from: version.status, to, slug: card.slug });
      setSaved(doneText);
      setMode(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const approve = () => {
    const next: typeof fieldError = {};
    if (!credential.trim()) next.credential = "검수자 자격을 입력해 주세요.";
    const date = expires ? new Date(`${expires}T23:59:59`) : null;
    if (!date || Number.isNaN(date.getTime())) next.expires = "다음 검토 기한을 정해 주세요.";
    else if (date.getTime() <= Date.now()) next.expires = "검토 기한은 오늘보다 뒤여야 해요.";
    setFieldError(next);
    if (Object.keys(next).length > 0 || !date || !user) return;
    void move("approved", { reviewer_id: user.id, reviewer_credential: credential.trim(), reviewed_at: new Date().toISOString(), expires_at: date.toISOString() }, null, "승인했어요.");
  };
  const reject = () => {
    if (!reason.trim()) {
      setFieldError({ reason: "반려 사유를 입력해 주세요." });
      return;
    }
    setFieldError({});
    // 게시 중이던 카드가 아니면 카드 상태는 그대로 둔다(검수자는 카드를 바꿀 권한이 없다).
    void move("draft", { change_reason: reason.trim() }, null, "반려하고 초안으로 돌렸어요.");
  };

  return (
    <Card as="li" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 break-keep text-lg font-bold">{version?.body_json.title ?? card.slug}</h2>
        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
        {version ? <Badge>버전 {version.version}</Badge> : null}
      </div>
      {version ? (
        <>
          <p className="text-muted">{version.body_json.summary}</p>
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted">검수일</dt>
              <dd>{version.reviewed_at ? formatDate(version.reviewed_at) : "검수 전"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted">검토 기한</dt>
              <dd>{version.expires_at ? formatDate(version.expires_at) : "정해지지 않음"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted">검수자 자격</dt>
              <dd className="min-w-0 break-words">{version.reviewer_credential ?? "없음"}</dd>
            </div>
            {version.change_reason ? (
              <div className="flex gap-2">
                <dt className="shrink-0 text-muted">변경·반려 사유</dt>
                <dd className="min-w-0 break-words">{version.change_reason}</dd>
              </div>
            ) : null}
          </dl>
          <SourceMeta sources={version.source_json} reviewedAt={version.reviewed_at} statusLabel={`버전 ${STATUS_LABEL[version.status]} · 카드 ${STATUS_LABEL[card.status]}`} />

          <div className="flex flex-wrap gap-2">
            {version.status === "draft" ? (
              <Button disabled={busy} onClick={() => void move("in_review", {}, null, "검수를 요청했어요.")}>
                검수 요청
              </Button>
            ) : null}
            {version.status === "in_review" ? (
              <Button
                disabled={busy}
                onClick={() => {
                  setExpires((v) => v || isoDatePlusDays(180));
                  setFieldError({});
                  setMode("approve");
                }}
              >
                승인
              </Button>
            ) : null}
            {version.status === "approved" ? (
              <Button variant="safe" disabled={busy || !isAdmin} onClick={() => void move("published", {}, "published", "게시했어요.")}>
                게시
              </Button>
            ) : null}
            {version.status === "in_review" || version.status === "approved" ? (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setFieldError({});
                  setMode("reject");
                }}
              >
                반려
              </Button>
            ) : null}
            {version.status === "approved" || version.status === "published" ? (
              <Button variant="ghost" disabled={busy || !isAdmin} onClick={() => void move("expired", {}, "expired", "만료 처리했어요. 공개 화면에서 내려가요.")}>
                만료 처리
              </Button>
            ) : null}
            <Button variant="ghost" disabled>
              본문 편집기는 준비 중
            </Button>
          </div>
          {!isAdmin && (version.status === "approved" || version.status === "published") ? <p className="text-sm text-muted">게시와 만료 처리는 관리자만 할 수 있어요.</p> : null}

          {mode === "approve" ? (
            <form
              className="flex flex-col gap-3 rounded-[12px] bg-tint p-3"
              onSubmit={(e) => {
                e.preventDefault();
                approve();
              }}
            >
              <Field id={`cred-${card.id}`} label="검수자 자격" hint="예: 수의사, 감염내과 전문의" value={credential} onChange={(e) => setCredential(e.target.value)} error={fieldError.credential} maxLength={80} />
              <Field id={`exp-${card.id}`} label="다음 검토 기한" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} error={fieldError.expires} hint="기한이 지나면 공개 화면에서 자동으로 내려가요." />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "저장하는 중이에요" : "승인 확정"}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => setMode(null)}>
                  취소
                </Button>
              </div>
            </form>
          ) : null}
          {mode === "reject" ? (
            <form
              className="flex flex-col gap-3 rounded-[12px] bg-tint p-3"
              onSubmit={(e) => {
                e.preventDefault();
                reject();
              }}
            >
              <Field id={`reason-${card.id}`} label="반려 사유" value={reason} onChange={(e) => setReason(e.target.value)} error={fieldError.reason} maxLength={300} />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="danger" disabled={busy}>
                  {busy ? "저장하는 중이에요" : "반려 확정"}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => setMode(null)}>
                  취소
                </Button>
              </div>
            </form>
          ) : null}
        </>
      ) : (
        <p className="text-muted">연결된 버전이 없어요. 본문 편집기가 준비되면 초안을 만들 수 있어요.</p>
      )}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {saved ? <p role="status" className="text-sm text-safe">{saved}</p> : null}
    </Card>
  );
}

export default function AdminContentPage() {
  const state = useAsync(async () => {
    const repo = getRepo();
    const [cards, versions] = await Promise.all([repo.list("content_cards", { order: { column: "slug" } }), repo.list("content_versions")]);
    const byId = new Map(versions.map((v) => [v.id, v]));
    return cards.map((card) => ({ card, version: card.current_version_id ? (byId.get(card.current_version_id) ?? null) : null }));
  }, []);

  return (
    <>
      <PageHeader title="콘텐츠 검수" description="초안 → 검수 → 승인 → 게시 → 만료 순서로 관리해요." />
      <Notice>승인되고 검토 기한이 남은 버전만 보호자에게 보여요. 검수자는 승인·반려를, 관리자는 게시·만료 처리까지 할 수 있어요.</Notice>
      {state.loading && !state.data ? (
        <Loading />
      ) : state.error ? (
        <ErrorState onRetry={state.reload} />
      ) : !state.data || state.data.length === 0 ? (
        <EmptyState title="등록된 콘텐츠가 없어요" />
      ) : (
        <ul className="flex flex-col gap-4">
          {state.data.map(({ card, version }) => (
            <ContentItem key={card.id} card={card} version={version} onChanged={state.reload} />
          ))}
        </ul>
      )}
    </>
  );
}
