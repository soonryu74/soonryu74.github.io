import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/lib/session";
import { AuthRequired, PageHeader } from "@/components/ui";
import { formatKst } from "@/lib/dates";
import { logout } from "@/app/actions/auth";
import { DeleteAccountForm } from "./delete-account-form";

export const metadata: Metadata = { title: "내 계정" };

const DOC_NAMES: Record<string, string> = { terms: "이용약관", privacy: "개인정보 처리방침", location: "위치정보 안내", copyright: "저작권 정책" };

export default async function AccountPage() {
  const store = await getStore();
  if (!store.user) return <AuthRequired what="내 계정" next="/account" />;
  const [profile, consents] = await Promise.all([store.getProfile(), store.listConsents()]);
  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title="내 계정" lead={store.user.email} />
      <section className="card" aria-labelledby="c-h">
        <h2 id="c-h" className="h2 mb-2">동의 기록</h2>
        {consents.length === 0 ? <p className="text-muted">기록이 없어요. <Link className="link" href="/consent">동의하러 가기</Link></p> : (
          <ul className="divide-y divide-line text-sm">
            {consents.map((c) => <li key={c.id} className="py-1.5 flex flex-wrap gap-x-3"><span className="font-bold">{DOC_NAMES[c.document_type] ?? c.document_type}</span><span>버전 {c.document_version}</span><span className="text-muted">{formatKst(c.consented_at, true)}</span></li>)}
          </ul>
        )}
        <p className="text-sm mt-2">선택 동의(소식 이메일): {profile?.marketing_consent_at ? `동의 (${formatKst(profile.marketing_consent_at)})` : "동의 안 함"}</p>
      </section>
      <section className="card" aria-labelledby="dl-h">
        <h2 id="dl-h" className="h2 mb-1">내 데이터 내려받기</h2>
        <p className="text-muted text-sm">반려동물·할 일·기록·보험 메모·신고 메모를 JSON 파일로 받아요.</p>
        <a href="/api/account/export" className="btn btn-outline mt-2" download>내려받기</a>
      </section>
      <section className="card" aria-labelledby="lo-h">
        <h2 id="lo-h" className="h2 mb-2">로그아웃</h2>
        <form action={logout}><button type="submit" className="btn btn-outline">로그아웃</button></form>
      </section>
      <section className="card border-[#FCA5A5]" aria-labelledby="del-h">
        <h2 id="del-h" className="h2 mb-1 text-danger">탈퇴</h2>
        <p className="text-sm text-muted">탈퇴하면 계정과 반려동물·할 일·기록·문서 파일·보험 메모·신고 메모가 모두 삭제되고 되돌릴 수 없어요. 법령상 보관이 필요한 기록(감사로그의 작업 내역)은 개인을 식별할 수 없게 남아요.</p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
