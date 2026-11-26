import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "danger" | "ghost" | "safe";
const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-white hover:opacity-90",
  accent: "bg-accent text-ink hover:opacity-90",
  danger: "bg-danger text-white hover:opacity-90",
  safe: "bg-safe text-white hover:opacity-90",
  ghost: "bg-card text-ink border border-line hover:bg-tint",
};
const BTN = "inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" {...props} className={`${BTN} ${VARIANT[variant]} ${className}`} />;
}

export function LinkButton({ href, variant = "primary", className = "", children, external }: { href: string; variant?: Variant; className?: string; children: ReactNode; external?: boolean }) {
  const cls = `${BTN} ${VARIANT[variant]} ${className}`;
  if (external || /^(https?:|tel:)/.test(href)) {
    const web = href.startsWith("http");
    return (
      <a href={href} className={cls} {...(web ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "li" }) {
  return <Tag className={`rounded-[16px] border border-line bg-card p-4 ${className}`}>{children}</Tag>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-muted">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

type Tone = "neutral" | "safe" | "warn" | "danger" | "brand";
const TONE: Record<Tone, string> = {
  neutral: "border-line text-muted",
  safe: "border-safe text-safe",
  warn: "border-warn text-warn",
  danger: "border-danger text-danger",
  brand: "border-brand text-brand",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[tone]}`}>{children}</span>;
}

export function ExampleBadge() {
  return <Badge tone="warn">예시 데이터</Badge>;
}

const INPUT = "min-h-12 w-full rounded-[12px] border border-line bg-card px-3 text-base text-ink placeholder:text-muted";

export function Field({ id, label, error, hint, optional, ...props }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string | null; hint?: string; optional?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label} {optional ? <span className="text-sm font-normal text-muted">(선택)</span> : null}
      </label>
      <input id={id} {...props} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className={INPUT} />
      {hint && !error ? <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function SelectField({ id, label, children, optional, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; optional?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label} {optional ? <span className="text-sm font-normal text-muted">(선택)</span> : null}
      </label>
      <select id={id} {...props} className={INPUT}>
        {children}
      </select>
    </div>
  );
}

export function TextareaField({ id, label, optional, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string; optional?: boolean; error?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label} {optional ? <span className="text-sm font-normal text-muted">(선택)</span> : null}
      </label>
      <textarea id={id} rows={3} {...props} aria-invalid={error ? true : undefined} className={`${INPUT} py-2`} />
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function Loading({ label = "불러오는 중이에요" }: { label?: string }) {
  return (
    <p role="status" aria-live="polite" className="py-8 text-center text-muted">
      {label}
    </p>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-line px-4 py-8 text-center">
      <p className="font-semibold">{title}</p>
      {description ? <p className="text-muted">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-[16px] border border-danger px-4 py-6 text-center">
      <p className="font-semibold text-danger">{message ?? "불러오지 못했어요. 잠시 뒤 다시 시도해 주세요."}</p>
      {onRetry ? <Button variant="ghost" onClick={onRetry}>다시 시도</Button> : null}
    </div>
  );
}

export function LoginRequired({ what = "이 화면" }: { what?: string }) {
  return (
    <EmptyState
      title="로그인이 필요해요"
      description={`${what}은 내 정보를 다루기 때문에 로그인한 뒤에 볼 수 있어요.`}
      action={<LinkButton href="/login">로그인하기</LinkButton>}
    />
  );
}

export function Forbidden() {
  return <EmptyState title="볼 수 있는 권한이 없어요" description="주소가 맞는지 확인해 주세요. 다른 보호자의 정보는 열 수 없어요." action={<LinkButton href="/" variant="ghost">홈으로</LinkButton>} />;
}

/** 출처·검토일·검수 상태를 숨기지 않고 보여 준다. */
export function SourceMeta({ sources, reviewedAt, statusLabel }: { sources?: { org: string; url?: string | null }[]; reviewedAt?: string | null; statusLabel?: string }) {
  return (
    <dl className="flex flex-col gap-1 border-t border-line pt-3 text-sm text-muted">
      <div className="flex gap-2">
        <dt className="shrink-0 font-medium">출처</dt>
        <dd className="min-w-0">
          {sources && sources.length > 0
            ? sources.map((s, i) => (
                <span key={s.org}>
                  {i > 0 ? ", " : ""}
                  {s.url ? <a className="underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.org}</a> : s.org}
                </span>
              ))
            : "출처 확인 전"}
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="shrink-0 font-medium">최근 검토</dt>
        <dd>{reviewedAt ? formatDate(reviewedAt) : "검토 전"}</dd>
      </div>
      {statusLabel ? (
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium">상태</dt>
          <dd>{statusLabel}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: "neutral" | "warn" | "danger"; children: ReactNode }) {
  const cls = tone === "danger" ? "border-danger" : tone === "warn" ? "border-warn" : "border-line";
  return <div className={`rounded-[14px] border-l-4 ${cls} bg-card px-4 py-3 text-sm`}>{children}</div>;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function formatWon(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}
