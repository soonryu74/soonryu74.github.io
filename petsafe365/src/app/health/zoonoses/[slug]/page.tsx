"use client";
import { useParams } from "next/navigation";
import { Badge, Card, EmptyState, ErrorState, LinkButton, Loading, Notice, PageHeader, SourceMeta, formatDate } from "@/components/ui";
import { getContent } from "@/lib/domain";
import { useAsync } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import { isContentPublic } from "@/lib/rules";
import type { ContentBody, ContentCard, ContentStatus } from "@/lib/types";

const OFFICIAL = [
  { org: "질병관리청 감염병포털", url: "https://dportal.kdca.go.kr/pot/ii/sttyInftnsds/sttyInftnsds.do" },
  { org: "농림축산검역본부", url: "https://www.qia.go.kr" },
];
const STATUS: Record<ContentStatus, string> = { draft: "초안", in_review: "검수 중", approved: "검수 완료", published: "검수 완료·게시", expired: "검토 기한 지남", archived: "보관됨" };
const SPECIES: Record<ContentCard["species"], string> = { all: "개·고양이", dog: "개", cat: "고양이" };

const SECTIONS: { key: Exclude<keyof ContentBody, "title" | "summary">; title: string; tone?: "danger" }[] = [
  { key: "animal_signs", title: "동물에게서 볼 수 있는 신호" },
  { key: "human_signs", title: "사람에게서 볼 수 있는 신호" },
  { key: "transmission", title: "전파 경로" },
  { key: "prevention", title: "예방" },
  { key: "human_see_doctor", title: "사람이 의료기관에 갈 때" },
  { key: "animal_see_vet", title: "반려동물이 동물병원에 갈 때" },
  { key: "do_not", title: "하지 말아야 할 것", tone: "danger" },
];

const BackLink = () => (
  <LinkButton href="/health/zoonoses" variant="ghost">
    목록으로
  </LinkButton>
);

export default function ZoonosisPage() {
  const { slug } = useParams<{ slug: string }>();
  const state = useAsync(() => getContent(slug), [slug]);

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorState onRetry={state.reload} />;
  const content = state.data;
  if (!content || content.card.content_type !== "zoonosis") {
    return <EmptyState title="글을 찾지 못했어요" description="주소가 바뀌었거나 없는 글이에요." action={<BackLink />} />;
  }

  const { card, version } = content;
  const exampleMode = getRepo().mode === "example";
  const isPublic = isContentPublic(card, version, new Date());
  const sources = version?.source_json?.length ? version.source_json : OFFICIAL;

  if (!isPublic && (!exampleMode || !version)) {
    return (
      <>
        <PageHeader title="검토 중인 글이에요" description="검수자가 내용을 확인하고 있어요. 승인된 뒤에 공개돼요." />
        <Card className="flex flex-col gap-3">
          <p>그동안은 공식 기관의 안내를 확인해 주세요.</p>
          <ul className="flex flex-col gap-2">
            {sources.map((s) => (
              <li key={s.org}>
                <LinkButton href={s.url} variant="ghost" className="w-full">
                  {s.org} 열기
                </LinkButton>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">사람이 아프면 의료기관에, 반려동물이 아프면 동물병원에 연락해 주세요.</p>
        </Card>
        <BackLink />
      </>
    );
  }
  if (!version) return null;

  const body = version.body_json;
  return (
    <>
      <PageHeader title={body.title} />
      <div className="flex flex-wrap gap-2">
        {isPublic ? <Badge tone="safe">검수 완료</Badge> : <Badge tone="warn">검수 전 초안</Badge>}
        <Badge tone="brand">대상: {SPECIES[card.species]}</Badge>
      </div>
      {!isPublic ? (
        <Notice tone="danger">
          <strong>검수 전 초안입니다. 예시 모드에서만 보여요. 실제 서비스에서는 검수자가 승인한 글만 공개돼요.</strong>
        </Notice>
      ) : null}

      <Card as="section">
        <h2 className="text-lg font-bold">요약</h2>
        <p className="mt-2">{body.summary}</p>
      </Card>

      {SECTIONS.map((s) => (
        <Card as="section" key={s.key} className={s.tone === "danger" ? "border-danger" : ""}>
          <h2 className={`text-lg font-bold ${s.tone === "danger" ? "text-danger" : ""}`}>{s.title}</h2>
          {body[s.key]?.length ? (
            <ul className="mt-2 list-disc pl-5">
              {body[s.key].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">준비 중이에요.</p>
          )}
        </Card>
      ))}

      <Notice>이 글은 진단이나 치료 안내가 아니에요. 사람은 의료기관, 반려동물은 동물병원에서 확인해 주세요.</Notice>

      <div className="flex flex-col gap-1">
        <SourceMeta sources={sources} reviewedAt={version.reviewed_at} statusLabel={isPublic ? STATUS[version.status] : `검수 전 초안 (${STATUS[version.status]})`} />
        <dl className="flex flex-col gap-1 text-sm text-muted">
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium">검수자 자격</dt>
            <dd>{version.reviewer_credential ?? "검수자 지정 전"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium">다음 검토 예정</dt>
            <dd>{version.expires_at ? formatDate(version.expires_at) : "정해지지 않음"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium">버전</dt>
            <dd>
              {version.version}
              {version.change_reason ? ` · ${version.change_reason}` : ""}
            </dd>
          </div>
        </dl>
      </div>
      <BackLink />
    </>
  );
}
