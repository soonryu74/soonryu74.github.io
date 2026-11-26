"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, LinkButton, Loading, Notice, PageHeader } from "@/components/ui";
import { useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { SessionUser } from "@/lib/types";

const LINKS = [
  { href: "/records", label: "건강 기록", desc: "체중, 진료, 비용을 모아 봐요" },
  { href: "/health", label: "건강·예방", desc: "사람과 동물이 함께 조심할 것" },
  { href: "/insurance", label: "보험·비용", desc: "약관 이해와 청구 준비" },
  { href: "/reports", label: "분실·발견·신고", desc: "공식 연락처와 준비할 것" },
  { href: "/legal", label: "법무·신뢰센터", desc: "약관, 개인정보, 환불, 광고 원칙" },
  { href: "/partner", label: "파트너 안내", desc: "업체 프로필과 입점 문의" },
];

async function buildExport(user: SessionUser): Promise<string> {
  const repo = getRepo();
  const pets = (await repo.list("pets")).filter((p) => p.owner_id === user.id);
  const petIds = new Set(pets.map((p) => p.id));
  const [careTasks, healthEvents, policies, drafts, consents] = await Promise.all([
    repo.list("care_tasks"),
    repo.list("health_events"),
    repo.list("insurance_policies"),
    repo.list("incident_drafts"),
    repo.list("user_consents"),
  ]);
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      account: { email: user.email },
      pets,
      care_tasks: careTasks.filter((r) => petIds.has(r.pet_id)),
      health_events: healthEvents.filter((r) => petIds.has(r.pet_id)),
      insurance_policies: policies.filter((r) => petIds.has(r.pet_id)),
      incident_drafts: drafts.filter((r) => r.user_id === user.id),
      user_consents: consents.filter((r) => r.user_id === user.id),
    },
    null,
    2,
  );
}

function DataExport({ user }: { user: SessionUser }) {
  const [json, setJson] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);

  const build = async () => {
    setBusy(true);
    setError(null);
    setCopied(null);
    try {
      setJson(await buildExport(user));
    } catch {
      setError("데이터를 모으지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <Card as="section" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">내 데이터 내려받기</h2>
      <p className="text-muted">반려동물, 할 일, 건강 기록, 보험 메모, 신고 준비 메모, 동의 이력을 한 번에 모아 드려요. 올린 문서 파일은 각 기록 화면에서 열 수 있어요.</p>
      <Button variant="ghost" disabled={busy} onClick={build}>
        {busy ? "모으는 중이에요" : json ? "다시 모으기" : "내 데이터 모으기"}
      </Button>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {json ? (
        <>
          <label htmlFor="export-json" className="font-medium">
            내 데이터 (JSON)
          </label>
          <textarea id="export-json" readOnly rows={10} value={json} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-[12px] border border-line bg-card p-3 font-mono text-sm" />
          <Button variant="ghost" onClick={copy}>
            복사
          </Button>
          <p role="status" aria-live="polite" className="text-sm text-muted">
            {copied === "done" ? "복사했어요. 메모장 같은 곳에 붙여 넣어 보관해 주세요." : copied === "failed" ? "복사하지 못했어요. 위 칸을 눌러 전체 선택한 뒤 직접 복사해 주세요." : "파일 저장이 막힌 환경이 있어서 복사 방식으로 드려요."}
          </p>
        </>
      ) : null}
    </Card>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const { refresh } = useSession();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await getRepo().auth.deleteAccount();
      refresh();
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "탈퇴를 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  return (
    <Card as="section" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">탈퇴</h2>
      <p className="text-muted">탈퇴하면 계정과 반려동물 정보, 할 일, 건강 기록, 올린 문서, 보험 메모, 신고 준비 메모가 모두 지워져요. 되돌릴 수 없어요.</p>
      {!open ? (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          탈퇴 진행하기
        </Button>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim() === "탈퇴" && !busy) void remove();
          }}
        >
          <Notice tone="danger">필요한 기록은 먼저 &apos;내 데이터 내려받기&apos;로 보관해 주세요. 탈퇴한 뒤에는 복구해 드릴 수 없어요.</Notice>
          <Field id="delete-confirm" label="확인을 위해 '탈퇴'라고 입력해 주세요" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" error={error} />
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" type="submit" disabled={busy || typed.trim() !== "탈퇴"}>
              {busy ? "지우는 중이에요" : "모두 지우고 탈퇴"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
            >
              취소
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function MorePage() {
  const { user, loading, refresh } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await getRepo().auth.signOut();
      refresh();
    } catch {
      setError("로그아웃하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <PageHeader title="더보기" description="기록, 안내, 계정 관리를 여기서 찾을 수 있어요." />

      <nav aria-label="더보기 메뉴">
        <ul className="grid gap-3 sm:grid-cols-2">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex min-h-16 flex-col justify-center rounded-[16px] border border-line bg-card px-4 py-3 hover:bg-tint">
                <span className="font-semibold">{l.label}</span>
                <span className="text-sm text-muted">{l.desc}</span>
              </Link>
            </li>
          ))}
          {user && (user.role === "admin" || user.role === "reviewer") ? (
            <li>
              <Link href="/admin" className="flex min-h-16 flex-col justify-center rounded-[16px] border border-brand bg-card px-4 py-3 hover:bg-tint">
                <span className="font-semibold text-brand">운영 관리</span>
                <span className="text-sm text-muted">콘텐츠 검수와 운영 설정</span>
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>

      {loading ? (
        <Loading />
      ) : !user ? (
        <Card as="section" className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">계정</h2>
          <p className="text-muted">로그인하면 우리 아이 기록을 저장하고 다시 볼 수 있어요.</p>
          <LinkButton href="/login">로그인</LinkButton>
        </Card>
      ) : (
        <>
          <Card as="section" className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">내 계정</h2>
            <p className="break-all">{user.email}</p>
            <Button variant="ghost" disabled={signingOut} onClick={signOut}>
              {signingOut ? "로그아웃하는 중이에요" : "로그아웃"}
            </Button>
            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          </Card>
          <DataExport user={user} />
          <DeleteAccount />
        </>
      )}
    </>
  );
}
