"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, Field, LinkButton, Loading, Notice, PageHeader } from "@/components/ui";
import { useSession } from "@/lib/hooks";
import { getRepo, isExampleMode } from "@/lib/repo";
import { DEMO_ADMIN_EMAIL } from "@/lib/repo/local";
import { errorText } from "../pets/pet-shared";
import { homeAfterLogin, recordMissingConsents, savePendingConsent } from "./consents";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { user, loading } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function signIn(target: string) {
    setFormError(null);
    setConsentError(terms && privacy ? null : "필수 항목 두 가지에 동의해 주세요.");
    if (!terms || !privacy) return;
    setBusy(true);
    try {
      const repo = getRepo();
      if (repo.mode === "supabase") savePendingConsent(marketing);
      const result = await repo.auth.signIn(target);
      if (result.sent) {
        setSentTo(target);
        return;
      }
      // 예시 모드: 바로 로그인된다. 동의를 기록한 뒤 다음 화면으로 보낸다.
      setMoving(true);
      const me = await repo.auth.getUser();
      if (!me) throw new Error("no session");
      await recordMissingConsents(me, marketing);
      router.replace(await homeAfterLogin());
    } catch (e) {
      setMoving(false);
      setFormError(errorText(e, "로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요."));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    const problem = !value ? "이메일을 적어 주세요." : !EMAIL.test(value) ? "이메일 주소를 다시 확인해 주세요." : null;
    setEmailError(problem);
    if (problem) return;
    void signIn(value);
  }

  async function signOut() {
    setBusy(true);
    setFormError(null);
    try {
      await getRepo().auth.signOut();
    } catch (e) {
      setFormError(errorText(e, "로그아웃하지 못했어요. 잠시 뒤 다시 시도해 주세요."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (moving) return <Loading label="로그인했어요. 이동하고 있어요" />;

  if (user) {
    return (
      <>
        <PageHeader title="로그인" />
        <Card className="flex flex-col gap-3">
          <p>
            <span className="break-all font-semibold">{user.email}</span> 계정으로 로그인되어 있어요.
          </p>
          {formError ? (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}
          <LinkButton href="/today">오늘 할 일 보기</LinkButton>
          <LinkButton href="/more" variant="ghost">
            더보기로 가기
          </LinkButton>
          <Button variant="ghost" onClick={signOut} disabled={busy}>
            {busy ? "로그아웃하는 중이에요" : "로그아웃"}
          </Button>
        </Card>
      </>
    );
  }

  if (sentTo) {
    return (
      <>
        <PageHeader title="메일을 확인해 주세요" />
        <Card className="flex flex-col gap-3">
          <p role="status" className="font-semibold">
            메일을 보냈어요. 메일의 링크를 누르면 로그인돼요.
          </p>
          <p className="break-all text-muted">{sentTo}</p>
          <p className="text-sm text-muted">메일이 보이지 않으면 스팸함을 확인하거나 주소를 다시 적어 주세요.</p>
          <Button variant="ghost" onClick={() => setSentTo(null)}>
            다른 주소로 다시 보내기
          </Button>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="로그인" description="이메일만 있으면 돼요. 비밀번호는 만들지 않아요." />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <Field
            id="login-email"
            label="이메일 (필수)"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            required
          />
          <fieldset className="flex flex-col gap-1" aria-describedby={consentError ? "consent-error" : undefined}>
            <legend className="font-medium">이용 동의</legend>
            <ConsentRow id="consent-terms" checked={terms} onChange={setTerms} label="서비스 이용약관에 동의해요 (필수)" href="/legal/terms" linkLabel="이용약관 보기" />
            <ConsentRow id="consent-privacy" checked={privacy} onChange={setPrivacy} label="개인정보 처리에 동의해요 (필수)" href="/legal/privacy" linkLabel="개인정보 처리방침 보기" />
            {consentError ? (
              <p id="consent-error" role="alert" className="text-sm text-danger">
                {consentError}
              </p>
            ) : null}
          </fieldset>
          <fieldset className="flex flex-col gap-1 border-t border-line pt-3">
            <legend className="sr-only">선택 동의</legend>
            <ConsentRow id="consent-marketing" checked={marketing} onChange={setMarketing} label="소식·혜택 안내를 받을게요 (선택)" />
            <p className="text-sm text-muted">동의하지 않아도 모든 기능을 쓸 수 있어요.</p>
          </fieldset>
        </Card>
        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "확인하는 중이에요" : isExampleMode ? "체험 시작하기" : "로그인 메일 받기"}
        </Button>
        {isExampleMode ? (
          <>
            <Notice>예시 모드에서는 메일을 보내지 않고 바로 로그인돼요. 입력한 내용은 이 기기에만 저장돼요.</Notice>
            <Button variant="ghost" disabled={busy} onClick={() => void signIn(DEMO_ADMIN_EMAIL)}>
              체험용 관리자로 보기
            </Button>
          </>
        ) : null}
      </form>
    </>
  );
}

function ConsentRow({ id, checked, onChange, label, href, linkLabel }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <label htmlFor={id} className="flex min-h-12 min-w-0 items-center gap-3">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-brand" />
        <span>{label}</span>
      </label>
      {href ? (
        <Link href={href} className="inline-flex min-h-11 items-center text-sm text-brand underline">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
