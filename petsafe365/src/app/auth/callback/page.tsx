"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorState, LinkButton, Loading } from "@/components/ui";
import { useSession } from "@/lib/hooks";
import type { SessionUser } from "@/lib/types";
import { homeAfterLogin, recordMissingConsents, takePendingConsent } from "../../login/consents";

export default function AuthCallbackPage() {
  const { user, refresh } = useSession();
  const [timedOut, setTimedOut] = useState(false);

  // 세션이 잡힐 때까지 최대 5초 동안 다시 확인한다.
  useEffect(() => {
    if (user) return;
    const interval = window.setInterval(refresh, 500);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setTimedOut(true);
    }, 5000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [user, refresh]);

  if (user) return <Finish user={user} />;
  if (timedOut) {
    return (
      <>
        <ErrorState message="로그인을 확인하지 못했어요. 링크가 만료되었을 수 있어요." />
        <LinkButton href="/login">로그인 다시 하기</LinkButton>
      </>
    );
  }
  return <Loading label="로그인을 확인하고 있어요" />;
}

// 한 번의 방문에서 동의 기록이 두 번 실행되지 않도록 진행 중인 작업을 사용자별로 기억한다.
const inFlight = new Map<string, Promise<"/today" | "/onboarding">>();

function finish(user: SessionUser) {
  let job = inFlight.get(user.id);
  if (!job) {
    job = (async () => {
      await recordMissingConsents(user, takePendingConsent().marketing);
      return homeAfterLogin();
    })();
    inFlight.set(user.id, job);
    void job.catch(() => undefined).finally(() => inFlight.delete(user.id));
  }
  return job;
}

function Finish({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    finish(user)
      .then((next) => alive && router.replace(next))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [user, router, attempt]);

  if (failed) {
    return (
      <>
        <ErrorState
          message="로그인은 되었지만 마무리하지 못했어요. 다시 시도해 주세요."
          onRetry={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        />
        <LinkButton href="/login" variant="ghost">
          로그인 화면으로
        </LinkButton>
      </>
    );
  }
  return <Loading label="로그인했어요. 이동하고 있어요" />;
}
