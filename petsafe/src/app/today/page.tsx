import type { Metadata } from "next";
import Link from "next/link";
import { getActivePet, requireMember } from "@/lib/guard";
import { AuthRequired, EmptyState, PageHeader } from "@/components/ui";
import { PetSwitcher } from "@/components/pets/pet-switcher";
import { TaskCard } from "@/components/tasks/task-card";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { isVisibleToday, PRIORITY_ORDER } from "@/lib/rules";
import { formatKst, kstDate, kstDayRange } from "@/lib/dates";

export const metadata: Metadata = { title: "오늘 할 일" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const sp = await searchParams;
  const m = await requireMember("/today");
  if (!m) return <AuthRequired what="오늘 할 일" next="/today" />;
  const { pets, active } = await getActivePet(m.store);
  if (!active) {
    return (
      <div>
        <PageHeader title="오늘 할 일" />
        <EmptyState title="먼저 우리 아이를 등록해 주세요" body="등록하면 종·나이에 맞는 기본 할 일이 만들어져요." action={<Link className="btn btn-primary" href="/onboarding">등록하기</Link>} />
      </div>
    );
  }
  const now = new Date();
  const { start, end } = kstDayRange(now);
  const tasks = (await m.store.listTasks(active.id, { from: start.toISOString(), to: end.toISOString() })).filter((t) => isVisibleToday(t, now));
  const sorted = [...tasks].sort((a, b) =>
    (a.template_id || a.template_key ? 1 : 0) - (b.template_id || b.template_key ? 1 : 0) || // 보호자 지정 일정 우선
    PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority) || a.due_at.localeCompare(b.due_at));
  const pending = sorted.filter((t) => t.status !== "done");
  const done = sorted.filter((t) => t.status === "done");
  return (
    <div className="space-y-4">
      <PageHeader title={`${active.name}의 오늘 할 일`} lead={formatKst(now.toISOString())} />
      {sp.welcome && <p role="status" className="card bg-[#DCFCE7] text-[#14532D]">{active.name}을(를) 등록했어요. 기본 할 일을 만들어 두었어요. 완료하면 건강 기록에 남아요.</p>}
      <PetSwitcher pets={pets} activeId={active.id} next="/today" />
      <section aria-labelledby="pending-h">
        <h2 id="pending-h" className="h2 mb-2">해야 할 일 <span className="text-muted text-base">({pending.length})</span></h2>
        {pending.length === 0 ? <EmptyState title="오늘 할 일을 모두 마쳤어요" body="새 할 일을 추가하거나 기록을 남겨 보세요." /> : (
          <ul className="space-y-2">{pending.map((t) => <TaskCard key={t.id} task={t} />)}</ul>
        )}
      </section>
      {done.length > 0 && (
        <section aria-labelledby="done-h">
          <h2 id="done-h" className="h2 mb-2">오늘 완료 <span className="text-muted text-base">({done.length})</span></h2>
          <ul className="space-y-2">{done.map((t) => <TaskCard key={t.id} task={t} />)}</ul>
        </section>
      )}
      <section aria-labelledby="new-h" className="card">
        <h2 id="new-h" className="h2 mb-2">할 일 추가</h2>
        <p className="hint mb-2">담당 수의사가 정해 준 일정은 여기에 추가하세요. 일반 권고보다 먼저 보여요.</p>
        <NewTaskForm petId={active.id} today={kstDate(now)} />
      </section>
    </div>
  );
}
