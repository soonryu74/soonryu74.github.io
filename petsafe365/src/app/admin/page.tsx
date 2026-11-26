"use client";
import Link from "next/link";
import { Card, ErrorState, Loading, PageHeader } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { ContentStatus } from "@/lib/types";

const STATUS_LABEL: Record<ContentStatus, string> = { draft: "초안", in_review: "검수 중", approved: "승인", published: "게시", expired: "만료", archived: "보관" };
const STATUS_ORDER: ContentStatus[] = ["draft", "in_review", "approved", "published", "expired", "archived"];

/** 권한이 없어 읽지 못하는 표는 null 로 두고 "볼 수 없음"으로 표시한다. */
async function countOrNull<T>(load: () => Promise<T[]>, keep: (row: T) => boolean): Promise<number | null> {
  try {
    return (await load()).filter(keep).length;
  } catch {
    return null;
  }
}

export default function AdminDashboardPage() {
  const state = useAsync(async () => {
    const repo = getRepo();
    const cards = await repo.list("content_cards");
    const byStatus = STATUS_ORDER.map((s) => ({ status: s, count: cards.filter((c) => c.status === s).length }));
    const [reports, inquiries, contacts] = await Promise.all([
      countOrNull(() => repo.list("facility_reports"), (r) => r.status === "open"),
      countOrNull(() => repo.list("partner_inquiries"), (r) => r.status === "new"),
      countOrNull(() => repo.list("official_contacts"), (c) => !c.verified_at),
    ]);
    return { byStatus, total: cards.length, reports, inquiries, contacts };
  }, []);

  const num = (n: number | null) => (n === null ? "볼 수 없음" : `${n}건`);

  return (
    <>
      <PageHeader title="운영 대시보드" description="검수와 확인이 필요한 일을 한눈에 봐요." />
      {state.loading ? (
        <Loading />
      ) : state.error || !state.data ? (
        <ErrorState onRetry={state.reload} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card as="section" className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">
              <Link href="/admin/content" className="underline">콘텐츠</Link> <span className="text-sm font-normal text-muted">전체 {state.data.total}건</span>
            </h2>
            <dl className="grid grid-cols-3 gap-2">
              {state.data.byStatus.map((s) => (
                <div key={s.status} className="rounded-[12px] bg-tint px-3 py-2">
                  <dt className="text-sm text-muted">{STATUS_LABEL[s.status]}</dt>
                  <dd className="text-xl font-bold">{s.count}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card as="section" className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">
              <Link href="/admin/facilities" className="underline">시설 오류 신고</Link>
            </h2>
            <p>처리 전 <strong>{num(state.data.reports)}</strong></p>
          </Card>
          <Card as="section" className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">파트너 문의</h2>
            <p>새 문의 <strong>{num(state.data.inquiries)}</strong></p>
            <p className="text-sm text-muted">문의 응대 화면은 준비 중이에요.</p>
          </Card>
          <Card as="section" className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">
              <Link href="/admin/contacts" className="underline">공식 연락처</Link>
            </h2>
            <p>확인 전 <strong>{num(state.data.contacts)}</strong></p>
          </Card>
          <Card as="section" className="flex flex-col gap-2 md:col-span-2">
            <h2 className="text-lg font-bold">데이터 동기화 현황</h2>
            <p className="text-muted">공공데이터 수집기 준비 중</p>
          </Card>
        </div>
      )}
    </>
  );
}
