"use client";
import Link from "next/link";
import { PetSwitcher } from "@/components/PetSwitcher";
import { Card, ErrorState, LinkButton, Loading } from "@/components/ui";
import { tasksForToday } from "@/lib/domain";
import { useAsync, usePets, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { Pet } from "@/lib/types";

const SECTIONS = [
  { href: "/map", title: "가까운 병원·약국·동반 장소", description: "동물병원, 약국, 함께 갈 수 있는 곳을 찾아봐요." },
  { href: "/insurance", title: "보험·비용", description: "내 보험 약관과 청구 서류를 정리해 둬요." },
  { href: "/reports", title: "분실·발견·학대 신고", description: "상황에 맞는 공식 신고 창구로 이어 드려요." },
  { href: "/health/zoonoses", title: "건강·인수공통감염병", description: "사람과 동물이 함께 조심할 감염병을 알아봐요." },
];

export default function HomePage() {
  const { user, loading } = useSession();
  return (
    <>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">오늘 할 일부터, 위급한 순간까지</h1>
        <p className="mt-1 text-muted">반려견·반려묘와 함께하는 하루를 곁에서 챙겨 드려요.</p>
      </header>

      {loading ? <Loading /> : user ? <MyPets /> : <EmergencyLink />}

      {!loading && !user ? (
        <Card as="section" className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">오늘의 할 일</h2>
          <p className="text-muted">아이를 등록하면 오늘 챙길 일 세 가지를 알려 드려요. 완료한 일은 기록으로 남아요.</p>
          <LinkButton href="/login">시작하기</LinkButton>
        </Card>
      ) : null}

      <nav aria-label="바로 가기">
        <ul className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="flex min-h-20 flex-col justify-center gap-1 rounded-[16px] border border-line bg-card p-4 hover:bg-tint">
                <span className="text-lg font-bold">{s.title}</span>
                <span className="text-sm text-muted">{s.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function EmergencyLink() {
  return (
    <Link href="/emergency" className="flex min-h-16 items-center gap-3 rounded-[16px] bg-danger px-4 py-3 text-white hover:opacity-90">
      <span aria-hidden="true" className="text-2xl">
        ✚
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-lg font-bold">긴급 도움</span>
        <span className="text-sm">숨쉬기 힘들어하거나 위험한 것을 먹었다면 바로 눌러 주세요.</span>
      </span>
    </Link>
  );
}

/** 로그인한 뒤에만 그린다. 아이 전환 → 긴급 도움 → 오늘의 할 일 순서. */
function MyPets() {
  const petsState = usePets();
  const { pets, current, loading, error, reload } = petsState;
  return (
    <>
      {pets.length > 0 ? <PetSwitcher {...petsState} /> : null}
      <EmergencyLink />
      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{current ? `${current.name}의 오늘 할 일` : "오늘의 할 일"}</h2>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : current ? (
          <TodayPreview key={current.id} pet={current} />
        ) : (
          <>
            <p className="text-muted">아직 등록한 아이가 없어요. 등록하면 오늘 챙길 일을 알려 드려요.</p>
            <LinkButton href="/onboarding">우리 아이 등록하기</LinkButton>
          </>
        )}
      </Card>
    </>
  );
}

function TodayPreview({ pet }: { pet: Pet }) {
  const tasks = useAsync(async () => tasksForToday(await getRepo().list("care_tasks", { eq: { pet_id: pet.id } }), new Date()), [pet.id]);
  if (tasks.loading) return <Loading />;
  if (tasks.error) return <ErrorState onRetry={tasks.reload} />;
  const list = tasks.data ?? [];
  const top = list.slice(0, 3);
  return (
    <>
      {top.length === 0 ? (
        <p className="text-muted">오늘 챙길 일이 없어요. 필요한 일을 직접 더할 수 있어요.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {top.map((t) => (
            <li key={t.id} className="flex items-start gap-2">
              <span aria-hidden="true" className={t.status === "done" ? "text-safe" : "text-muted"}>
                {t.status === "done" ? "✓" : "○"}
              </span>
              <span className={`min-w-0 break-words ${t.status === "done" ? "text-muted line-through" : ""}`}>
                {t.title}
                <span className="sr-only">{t.status === "done" ? " (완료)" : " (아직 안 했어요)"}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {list.length > top.length ? <p className="text-sm text-muted">외 {list.length - top.length}개가 더 있어요.</p> : null}
      <LinkButton href="/today" variant="ghost">
        오늘 할 일 모두 보기
      </LinkButton>
    </>
  );
}
