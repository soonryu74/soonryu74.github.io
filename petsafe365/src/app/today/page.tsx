"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PetSwitcher } from "@/components/PetSwitcher";
import { Badge, Button, Card, EmptyState, ErrorState, Field, LinkButton, Loading, LoginRequired, Notice, PageHeader, SelectField, formatDate } from "@/components/ui";
import { completeTask, snoozeTask, tasksForToday } from "@/lib/domain";
import { useAsync, usePets, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import { commerceAllowedOn } from "@/lib/rules";
import type { CareTask, Pet, SessionUser } from "@/lib/types";
import { errorText, formatTime, toDateInput } from "../pets/pet-shared";

export default function TodayPage() {
  const { user, loading } = useSession();
  return (
    <>
      <PageHeader title="오늘 할 일" description="오늘 챙길 일을 하나씩 끝내 보세요." />
      {loading ? <Loading /> : user ? <Today user={user} /> : <LoginRequired what="오늘 할 일" />}
    </>
  );
}

function Today({ user }: { user: SessionUser }) {
  const petsState = usePets();
  const { pets, current, loading, error, reload } = petsState;
  if (loading) return <Loading />;
  if (error) return <ErrorState onRetry={reload} />;
  if (!current) {
    return <EmptyState title="아직 등록한 아이가 없어요" description="아이를 등록하면 오늘 챙길 일을 알려 드려요." action={<LinkButton href="/onboarding">우리 아이 등록하기</LinkButton>} />;
  }
  return (
    <>
      {pets.length > 0 ? <PetSwitcher {...petsState} /> : null}
      <Tasks key={current.id} pet={current} user={user} />
      <DoDont pet={current} />
    </>
  );
}

type Message = { tone: "ok" | "error"; text: string };

function Tasks({ pet, user }: { pet: Pet; user: SessionUser }) {
  const tasks = useAsync(async () => tasksForToday(await getRepo().list("care_tasks", { eq: { pet_id: pet.id } }), new Date()), [pet.id]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  async function run(task: CareTask, action: () => Promise<unknown>, okText: string) {
    setBusyId(task.id);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "ok", text: okText });
      tasks.reload();
    } catch (e) {
      setMessage({ tone: "error", text: errorText(e) });
    } finally {
      setBusyId(null);
    }
  }

  const list = tasks.data ?? [];
  const toyDone = list.some((t) => t.status === "done" && t.title.includes("장난감"));

  return (
    <>
      <section aria-labelledby="today-list" className="flex flex-col gap-3">
        <h2 id="today-list" className="text-lg font-bold">
          {pet.name}의 오늘
        </h2>
        {message ? (
          <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-danger" : "text-safe"}`}>
            {message.text}
          </p>
        ) : null}
        {tasks.loading ? (
          <Loading />
        ) : tasks.error ? (
          <ErrorState onRetry={tasks.reload} />
        ) : list.length === 0 ? (
          <EmptyState title="오늘 챙길 일이 없어요" description="필요한 일이 있다면 아래에서 직접 더해 보세요." />
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                busy={busyId !== null}
                onComplete={(note) => run(t, () => completeTask(t, note), "완료했어요. 기록에 남겼어요.")}
                onSnooze={() => run(t, () => snoozeTask(t), "내일로 미뤘어요.")}
                onSaveNote={(note) => run(t, () => getRepo().update("care_tasks", t.id, { note }), "메모를 저장했어요.")}
              />
            ))}
          </ul>
        )}
      </section>

      {toyDone ? (
        <Notice tone="warn">
          <p className="font-semibold">실밥이 풀리거나 조각이 떨어졌다면 바로 회수하세요.</p>
          {commerceAllowedOn("/today") ? (
            <Link href="/shop" className="mt-1 inline-flex min-h-11 items-center text-brand underline">
              맞는 장난감 보기
            </Link>
          ) : null}
        </Notice>
      ) : null}

      <AddTask pet={pet} user={user} onAdded={tasks.reload} />
    </>
  );
}

function TaskItem({ task, busy, onComplete, onSnooze, onSaveNote }: { task: CareTask; busy: boolean; onComplete: (note?: string) => void; onSnooze: () => void; onSaveNote: (note: string | null) => void }) {
  const [note, setNote] = useState(task.note ?? "");
  const [open, setOpen] = useState(false);
  const done = task.status === "done";
  const memoId = `memo-${task.id}`;
  return (
    <Card as="li" className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className={`text-xl leading-6 ${done ? "text-safe" : "text-muted"}`}>
          {done ? "✓" : "○"}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`break-words font-semibold ${done ? "text-muted line-through" : ""}`}>{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {done ? (
              <>
                <Badge tone="safe">완료</Badge>
                <span>
                  {formatDate(task.completed_at)} {formatTime(task.completed_at)}
                </span>
              </>
            ) : (
              <>
                {task.template_id === null ? <Badge tone="brand">내가 더한 일</Badge> : null}
                {task.repeat_rule !== "none" ? <Badge>{REPEAT_LABEL[task.repeat_rule]}</Badge> : null}
                <span>기한 {formatDate(task.due_at)}</span>
              </>
            )}
          </div>
          {task.note && !open ? <p className="mt-2 whitespace-pre-wrap break-words text-sm">메모: {task.note}</p> : null}
        </div>
      </div>
      {open ? (
        <div className="flex flex-col gap-2">
          <Field id={memoId} label="메모" optional value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} hint={done ? undefined : "적어 둔 메모는 완료할 때 기록에도 함께 남아요."} />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                onSaveNote(note.trim() || null);
                setOpen(false);
              }}
            >
              메모 저장
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setNote(task.note ?? "");
                setOpen(false);
              }}
            >
              닫기
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {done ? null : (
          <>
            <Button variant="safe" disabled={busy} onClick={() => onComplete(note.trim() || undefined)} aria-label={`${task.title} 완료`}>
              완료
            </Button>
            <Button variant="ghost" disabled={busy} onClick={onSnooze} aria-label={`${task.title} 내일로 미루기`}>
              내일로 미루기
            </Button>
          </>
        )}
        {open ? null : (
          <Button variant="ghost" onClick={() => setOpen(true)} aria-label={`${task.title} 메모 ${task.note ? "고치기" : "쓰기"}`}>
            {task.note ? "메모 고치기" : "메모 쓰기"}
          </Button>
        )}
      </div>
    </Card>
  );
}

const REPEAT_LABEL: Record<CareTask["repeat_rule"], string> = { none: "한 번만", daily: "매일", weekly: "매주", monthly: "매달" };

function AddTask({ pet, user, onAdded }: { pet: Pet; user: SessionUser; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(() => toDateInput(new Date()));
  const [repeat, setRepeat] = useState<CareTask["repeat_rule"]>("none");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dueError, setDueError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const name = title.trim();
    const dueAt = new Date(`${due}T00:00:00`);
    const tErr = name ? null : "할 일을 적어 주세요.";
    const dErr = due && !Number.isNaN(dueAt.getTime()) ? null : "날짜를 골라 주세요.";
    setTitleError(tErr);
    setDueError(dErr);
    setMessage(null);
    if (tErr || dErr) return;
    setBusy(true);
    try {
      await getRepo().insert("care_tasks", {
        pet_id: pet.id, template_id: null, title: name, due_at: dueAt.toISOString(), repeat_rule: repeat,
        priority: -1, status: "open", completed_at: null, note: null, created_by: user.id,
      });
      const today = toDateInput(new Date());
      setMessage({ tone: "ok", text: due > today ? `${formatDate(dueAt.toISOString())} 할 일로 저장했어요. 그날 목록에 보여요.` : "할 일을 더했어요." });
      setTitle("");
      onAdded();
    } catch (err) {
      setMessage({ tone: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">할 일 더하기</h2>
        <p className="-mt-2 text-sm text-muted">직접 더한 일은 목록 맨 위에 보여요. 병원에서 정해 준 일정도 여기에 적어 두세요.</p>
        <Field id="task-title" label="할 일 (필수)" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} error={titleError} required />
        <Field id="task-due" label="날짜 (필수)" type="date" value={due} onChange={(e) => setDue(e.target.value)} error={dueError} required />
        <SelectField id="task-repeat" label="반복" optional value={repeat} onChange={(e) => setRepeat(e.target.value as CareTask["repeat_rule"])}>
          <option value="none">반복 안 함</option>
          <option value="daily">매일</option>
          <option value="weekly">매주</option>
          <option value="monthly">매달</option>
        </SelectField>
        {message ? (
          <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-danger" : "text-safe"}`}>
            {message.text}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "저장하는 중이에요" : "더하기"}
        </Button>
      </form>
    </Card>
  );
}

// 인수인계서 7장의 표에서 가져온 생활 수칙. 진단·약·치료는 다루지 않는다.
const GUIDE: Record<Pet["species"], { topic: string; todo: string; avoid: string }[]> = {
  dog: [
    { topic: "외출", todo: "기온·노면·목줄·물·배변봉투를 확인해요.", avoid: "더운 차 안에 두거나 무리하게 운동시키지 않아요." },
    { topic: "행동", todo: "잘한 행동을 칭찬하고 스트레스 신호를 살펴요.", avoid: "체벌하거나 겁을 주지 않아요." },
    { topic: "건강", todo: "식욕·물 마시는 양·배변·체중·행동 변화를 기록해요.", avoid: "사람 약을 임의로 먹이지 않아요." },
    { topic: "위험한 것을 먹었을 때", todo: "제품명·성분·양·시간을 적고 바로 동물병원에 문의해요.", avoid: "억지로 토하게 하거나 민간요법을 쓰지 않아요." },
  ],
  cat: [
    { topic: "집 안 환경", todo: "높은 곳·숨을 곳·화장실·위험한 식물을 점검해요.", avoid: "끈·실·사람 약·백합류에 닿지 않게 해요." },
    { topic: "행동", todo: "잘한 행동을 칭찬하고 스트레스 신호를 살펴요.", avoid: "체벌하거나 겁을 주지 않아요." },
    { topic: "건강", todo: "식욕·물 마시는 양·배변·체중·행동 변화를 기록해요.", avoid: "사람 약을 임의로 먹이지 않아요." },
    { topic: "위험한 것을 먹었을 때", todo: "제품명·성분·양·시간을 적고 바로 동물병원에 문의해요.", avoid: "억지로 토하게 하거나 민간요법을 쓰지 않아요." },
  ],
};

function DoDont({ pet }: { pet: Pet }) {
  return (
    <Card as="section" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">해야 할 것 · 하지 말아야 할 것</h2>
      <ul className="flex flex-col gap-3">
        {GUIDE[pet.species].map((g) => (
          <li key={g.topic} className="flex flex-col gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0">
            <p className="font-semibold">{g.topic}</p>
            <p>
              <span className="font-medium text-safe">해요</span> <span aria-hidden="true">·</span> {g.todo}
            </p>
            <p>
              <span className="font-medium text-danger">하지 않아요</span> <span aria-hidden="true">·</span> {g.avoid}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">일반적인 생활 수칙이에요. 아이 상태가 걱정되면 동물병원에 전화해 주세요.</p>
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/records" variant="ghost">
          기록하기
        </LinkButton>
        <LinkButton href="/emergency" variant="danger">
          <span aria-hidden="true">✚</span> 긴급 도움
        </LinkButton>
      </div>
    </Card>
  );
}
