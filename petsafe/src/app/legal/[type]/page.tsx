import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/session";
import { formatKst } from "@/lib/dates";

export const metadata: Metadata = { title: "법무 문서" };

export default async function LegalDocPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const store = await getStore();
  const docs = await store.listLegalDocuments();
  const doc = docs.filter((d) => d.document_type === type).sort((a, b) => b.effective_at.localeCompare(a.effective_at))[0];
  if (!doc) notFound();
  return (
    <article className="max-w-3xl space-y-3">
      <Link href="/legal" className="link text-sm">← 법무·신뢰센터</Link>
      <h1 className="h1">{doc.title}</h1>
      <p className="text-sm text-muted">버전 {doc.version} · 시행 {formatKst(doc.effective_at)}</p>
      <div className="card space-y-3">
        {doc.body.split(/\n\s*\n/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}
      </div>
    </article>
  );
}
