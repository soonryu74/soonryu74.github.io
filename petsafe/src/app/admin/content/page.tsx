import type { Metadata } from "next";
import { requireStaff } from "@/lib/guard";
import { AuthRequired, Forbidden, PageHeader } from "@/components/ui";
import { CONTENT_TRANSITIONS, STATUS_LABELS, isVersionPublic } from "@/lib/content-rules";
import { formatKst, kstDate, kstDateAfterDays } from "@/lib/dates";
import { AdminNav } from "../admin-nav";
import { ReviewForm, StatusButtons, NewVersionForm } from "./content-forms";

export const metadata: Metadata = { title: "콘텐츠 CMS" };

export default async function AdminContentPage() {
  const r = await requireStaff("reviewer");
  if (r === "anon") return <AuthRequired what="운영 화면" next="/admin/content" />;
  if (r === "forbidden") return <Forbidden />;
  const items = await r.store.admin.listContentWithVersions();
  const today = kstDate();
  const nextYear = kstDateAfterDays(365);
  return (
    <div>
      <PageHeader title="콘텐츠 CMS" lead="초안 → 검수 → 승인 → 게시 → 만료. 검수자·자격·검토일이 없는 버전은 승인·게시할 수 없어요." />
      <AdminNav current="/admin/content" />
      <ul className="space-y-4">
        {items.map(({ card, versions }) => {
          const current = versions.find((v) => v.id === card.current_version_id);
          const pub = isVersionPublic(card, current);
          return (
            <li key={card.id} className="card">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="h2">{current?.title ?? card.slug}</h2>
                <span className={`badge ${pub ? "badge-ok" : "badge-warn"}`}>{pub ? "공개 중" : "비공개"}</span>
                <span className="badge badge-muted">/{card.slug}</span>
              </div>
              <ul className="mt-3 space-y-3">
                {versions.map((v) => (
                  <li key={v.id} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">v{v.version}</span>
                      <span className="badge badge-info">{STATUS_LABELS[v.status]}</span>
                      {v.id === card.current_version_id && <span className="badge badge-muted">현재 버전</span>}
                      <span className="text-xs text-muted">변경 사유: {v.change_reason ?? "-"}</span>
                    </div>
                    <p className="text-sm mt-1">작성 {v.author_name ?? "-"} · 검수 {v.reviewer_name ? `${v.reviewer_name} (${v.reviewer_credential ?? "자격 미기록"}) · ${formatKst(v.reviewed_at)}` : "미기록"}{v.next_review_at ? ` · 다음 검토 ${formatKst(v.next_review_at)}` : ""}</p>
                    <details className="mt-1"><summary className="cursor-pointer link text-sm">본문 보기</summary>
                      <p className="text-sm mt-1">{v.summary}</p>
                      {Object.entries(v.body_json).map(([k, arr]) => <p key={k} className="text-xs mt-1"><b>{k}</b>: {arr.join(" / ")}</p>)}
                      <p className="text-xs mt-1"><b>출처</b>: {v.source_json.map((s) => `${s.organization} ${s.url}`).join(", ")}</p>
                    </details>
                    {(v.status === "in_review" || v.status === "draft") && <ReviewForm versionId={v.id} today={today} nextYear={nextYear} />}
                    <StatusButtons versionId={v.id} next={CONTENT_TRANSITIONS[v.status]} />
                  </li>
                ))}
              </ul>
              {current && (
                <details className="mt-3"><summary className="cursor-pointer link">새 버전 작성 (현재 버전 복사)</summary>
                  <NewVersionForm contentId={card.id} current={{ title: current.title, summary: current.summary, body: current.body_json, sources: current.source_json.map((s) => `${s.organization}|${s.url}`).join("\n") }} />
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
