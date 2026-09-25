import Link from "next/link";
import { formatKst } from "@/lib/dates";

export function PageHeader({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="h1">{title}</h1>
        {lead && <p className="text-muted mt-1">{lead}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card text-center py-8">
      <p className="h3">{title}</p>
      {body && <p className="text-muted mt-1">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function AuthRequired({ what, next }: { what: string; next: string }) {
  return (
    <div className="card py-8 text-center" role="status">
      <p className="h3">로그인이 필요해요</p>
      <p className="text-muted mt-1">{what}은(는) 보호자 본인만 볼 수 있도록 로그인 후 이용할 수 있어요.</p>
      <div className="mt-4 flex justify-center gap-2 flex-wrap">
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary">이메일로 로그인</Link>
        <Link href="/emergency" className="btn btn-outline">긴급 도움은 로그인 없이</Link>
      </div>
    </div>
  );
}

export function Forbidden() {
  return (
    <div className="card py-8 text-center" role="alert">
      <p className="h3">접근 권한이 없어요</p>
      <p className="text-muted mt-1">이 화면은 운영자·검수자 계정만 이용할 수 있어요.</p>
      <div className="mt-4"><Link href="/" className="btn btn-outline">홈으로</Link></div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="card border-[#FCA5A5] bg-[#FEF2F2] text-[#7F1D1D]">{message}</p>;
}

export function SourceLine({ organization, url, reviewedAt, label = "출처" }: { organization: string; url?: string | null; reviewedAt?: string | null; label?: string }) {
  return (
    <p className="text-xs text-muted mt-2">
      {label}: {url ? <a className="link" href={url} target="_blank" rel="noopener noreferrer">{organization}<span className="sr-only"> (새 창)</span></a> : organization}
      {reviewedAt ? <> · 최근 검토 {formatKst(reviewedAt)}</> : <> · 검토일 미기록</>}
    </p>
  );
}

export function ExampleBadge() {
  return <span className="badge badge-warn">예시 데이터</span>;
}

export function StatusBadge({ state, labels }: { state: "verified" | "unverified" | "disputed"; labels: [string, string, string] }) {
  if (state === "verified") return <span className="badge badge-ok">✓ {labels[0]}</span>;
  if (state === "disputed") return <span className="badge badge-danger">! {labels[2]}</span>;
  return <span className="badge badge-muted">? {labels[1]}</span>;
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-[#FCD34D] bg-[#FFFBEB] text-[#78350F] text-sm p-3">{children}</p>;
}
