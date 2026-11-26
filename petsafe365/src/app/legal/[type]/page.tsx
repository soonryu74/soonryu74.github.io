"use client";
import { useParams } from "next/navigation";
import { Card, EmptyState, ErrorState, LinkButton, Loading, Notice, PageHeader, formatDate } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { LegalDocument } from "@/lib/types";

const TYPE_LABEL: Record<LegalDocument["document_type"], string> = {
  terms: "이용약관", privacy: "개인정보 처리방침", location: "위치정보 이용 안내", copyright: "저작권·콘텐츠 정책", refund: "환불·청약철회 정책", ads: "광고·제휴 표시 정책",
};
const isType = (v: string): v is LegalDocument["document_type"] => v in TYPE_LABEL;

const BackLink = () => (
  <LinkButton href="/legal" variant="ghost">
    법무·신뢰센터로
  </LinkButton>
);

export default function LegalDocumentPage() {
  const { type } = useParams<{ type: string }>();
  const state = useAsync(async () => {
    if (!isType(type)) return null;
    const docs = await getRepo().list("legal_documents", { eq: { document_type: type, status: "published" }, order: { column: "effective_at", ascending: false } });
    return docs[0] ?? null;
  }, [type]);

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorState onRetry={state.reload} />;
  const doc = state.data;
  if (!doc) {
    return <EmptyState title="문서를 찾지 못했어요" description="주소가 바뀌었거나 아직 게시되지 않은 문서예요." action={<BackLink />} />;
  }

  return (
    <>
      <PageHeader title={TYPE_LABEL[doc.document_type] ?? doc.document_type} description={`버전 ${doc.version} · 시행일 ${formatDate(doc.effective_at)}`} />
      {doc.version.includes("draft") ? <Notice tone="warn">이 문서는 운영 초안이에요. 사업자 정보와 법률 검토를 마친 뒤 확정본으로 바꿔요.</Notice> : null}
      <Card as="article">
        <p className="whitespace-pre-line break-words">{doc.body}</p>
      </Card>
      <BackLink />
    </>
  );
}
