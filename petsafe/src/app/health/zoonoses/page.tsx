import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/lib/session";
import { ZOONOSES } from "@/content/zoonoses";
import { PageHeader, ErrorNote } from "@/components/ui";
import { formatKst } from "@/lib/dates";

export const metadata: Metadata = { title: "사람과 동물 모두의 건강" };

export default async function ZoonosesPage() {
  const store = await getStore();
  let published: Awaited<ReturnType<typeof store.listPublicContent>> = [];
  let failed = false;
  try { published = await store.listPublicContent(); } catch { failed = true; }
  return (
    <div className="space-y-4">
      <PageHeader title="사람과 동물 모두의 건강" lead="사람과 동물 사이에 옮을 수 있는 병(인수공통감염병)을 예방하는 방법. 동물의 신호와 사람의 신호를 나눠 보여줘요." />
      {failed && <ErrorNote message="콘텐츠를 불러오지 못했어요. 아래 공식 출처에서 직접 확인하세요." />}
      <ul className="grid sm:grid-cols-2 gap-3">
        {ZOONOSES.map((z) => {
          const pub = published.find((p) => p.card.slug === z.slug);
          return (
            <li key={z.slug} className="card">
              <h2 className="h2">{pub?.version.title ?? z.title}</h2>
              {pub ? (
                <>
                  <p className="mt-1">{pub.version.summary}</p>
                  <p className="text-xs text-muted mt-2">검수 {pub.version.reviewer_name} · {formatKst(pub.version.reviewed_at)}</p>
                  <Link href={`/health/zoonoses/${z.slug}`} className="btn btn-primary btn-sm mt-3">자세히 보기</Link>
                </>
              ) : (
                <>
                  <p className="mt-1"><span className="badge badge-warn">전문가 검수 중</span></p>
                  <p className="text-sm text-muted mt-1">검수가 끝나기 전에는 내용을 공개하지 않아요. 지금은 공식 기관 자료를 확인해 주세요.</p>
                  <ul className="mt-2 text-sm">{z.sources.map((s) => <li key={s.url}><a className="link" href={s.url} target="_blank" rel="noopener noreferrer">{s.organization}<span className="sr-only"> (새 창)</span></a></li>)}</ul>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
