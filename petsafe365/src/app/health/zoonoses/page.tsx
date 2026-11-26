"use client";
import { Badge, Card, EmptyState, ErrorState, LinkButton, Loading, Notice, PageHeader, SourceMeta } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import { isContentPublic } from "@/lib/rules";
import type { ContentCard, ContentVersion } from "@/lib/types";

// 검토 중인 글에 붙이는 공식 원문 (버전을 읽지 못했을 때의 기본값)
const OFFICIAL = [
  { org: "질병관리청 감염병포털", url: "https://dportal.kdca.go.kr/pot/ii/sttyInftnsds/sttyInftnsds.do" },
  { org: "농림축산검역본부", url: "https://www.qia.go.kr" },
];
const SPECIES: Record<ContentCard["species"], string> = { all: "개·고양이", dog: "개", cat: "고양이" };

type Item = { card: ContentCard; version: ContentVersion | null };

async function load(): Promise<Item[]> {
  const repo = getRepo();
  const cards = await repo.list("content_cards", { eq: { content_type: "zoonosis" }, order: { column: "created_at" } });
  return Promise.all(
    cards.map(async (card) => ({
      card,
      // 버전을 읽지 못하면 (비공개 등) 검토 중으로 다룬다.
      version: card.current_version_id ? await repo.get("content_versions", card.current_version_id).catch(() => null) : null,
    })),
  );
}

export default function ZoonosesPage() {
  const state = useAsync(load, []);
  const exampleMode = getRepo().mode === "example";
  const now = new Date();

  return (
    <>
      <PageHeader title="사람과 동물 모두의 건강" description="동물과 사람 사이에 옮을 수 있는 감염병을 알아봐요. 진단이 아니라 예방과 행동 안내예요." />
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorState onRetry={state.reload} />
      ) : !state.data || state.data.length === 0 ? (
        <EmptyState title="아직 공개된 글이 없어요" description="검수자가 승인한 글부터 차례로 올라와요." action={<LinkButton href="/health" variant="ghost">건강·예방으로</LinkButton>} />
      ) : (
        <>
          {exampleMode && state.data.some((i) => !isContentPublic(i.card, i.version, now)) ? (
            <Notice tone="warn">검수 전 초안이 섞여 있어요. 예시 모드에서만 보여요. 실제 서비스에서는 검수자가 승인한 글만 공개돼요.</Notice>
          ) : null}
          <ul className="grid gap-4 md:grid-cols-2">
            {state.data.map(({ card, version }) => {
              const isPublic = isContentPublic(card, version, now);
              const title = version?.body_json.title ?? "제목 준비 중";
              const sources = version?.source_json?.length ? version.source_json : OFFICIAL;
              if (!isPublic && !exampleMode) {
                return (
                  <Card as="li" key={card.id} className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>검토 중</Badge>
                      <Badge tone="brand">{SPECIES[card.species]}</Badge>
                    </div>
                    <h2 className="text-lg font-bold">{title}</h2>
                    <p className="text-muted">검수자가 확인하고 있어요. 그동안은 공식 기관의 안내를 봐 주세요.</p>
                    <SourceMeta sources={sources} reviewedAt={null} statusLabel="검토 중" />
                  </Card>
                );
              }
              return (
                <Card as="li" key={card.id} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {isPublic ? <Badge tone="safe">검수 완료</Badge> : <Badge tone="warn">검수 전 초안</Badge>}
                    <Badge tone="brand">{SPECIES[card.species]}</Badge>
                  </div>
                  <h2 className="text-lg font-bold">{title}</h2>
                  {version ? <p className="text-muted">{version.body_json.summary}</p> : null}
                  <LinkButton href={`/health/zoonoses/${card.slug}`} variant="ghost">
                    자세히 보기
                  </LinkButton>
                  <SourceMeta sources={sources} reviewedAt={version?.reviewed_at} statusLabel={isPublic ? "검수 완료" : "검수 전 초안"} />
                </Card>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
