import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/session";
import { missingConsents, safeNext } from "@/lib/guard";
import { AuthRequired } from "@/components/ui";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = { title: "약관 동의" };

export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const store = await getStore();
  if (!store.user) return <AuthRequired what="약관 동의" next="/consent" />;
  const missing = await missingConsents(store);
  if (missing.length === 0) {
    const pets = await store.listPets();
    redirect(pets.length === 0 ? "/onboarding" : next);
  }
  const docs = await store.listLegalDocuments();
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="h1">시작 전에 확인해 주세요</h1>
      <p className="text-muted mt-1">동의한 문서의 버전과 시각이 계정에 기록돼요. 언제든 <Link className="link" href="/legal">법무·신뢰센터</Link>에서 다시 볼 수 있어요.</p>
      <ConsentForm next={next} docs={docs.map((d) => ({ type: d.document_type, title: d.title, version: d.version }))} />
    </div>
  );
}
