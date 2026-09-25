import { formatKst } from "@/lib/dates";
import type { HealthEvent } from "@/lib/types";

export const EVENT_LABELS: Record<string, string> = {
  weight: "체중", observation: "관찰", medication_note: "투약 메모", exam: "검사", visit: "진료", cost: "비용",
  task_done: "할 일 완료", emergency_note: "긴급 메모", document: "문서",
};

export function describeEvent(e: HealthEvent): string {
  const v = e.value_json as Record<string, unknown>;
  if (e.event_type === "weight" && v.weight_kg != null) return `${v.weight_kg}kg`;
  if (e.event_type === "cost" && v.amount_krw != null) return `${Number(v.amount_krw).toLocaleString("ko-KR")}원${v.place ? ` · ${v.place}` : ""}`;
  if (e.event_type === "task_done" && v.title) return String(v.title);
  if (v.place) return String(v.place);
  return "";
}

export function Timeline({ events, onDelete }: { events: HealthEvent[]; onDelete?: (e: HealthEvent) => React.ReactNode }) {
  if (events.length === 0) return <p className="text-muted">아직 기록이 없어요. 오늘 할 일을 완료하면 여기에 쌓여요.</p>;
  return (
    <ol className="relative border-l-2 border-line ml-2 space-y-3">
      {events.map((e) => (
        <li key={e.id} className="ml-4">
          <span aria-hidden="true" className={`absolute -left-[7px] mt-1.5 size-3 rounded-full ${e.event_type === "emergency_note" ? "bg-danger" : "bg-primary"}`} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-muted">{EVENT_LABELS[e.event_type] ?? e.event_type}</span>
            <time className="text-sm text-muted" dateTime={e.occurred_at}>{formatKst(e.occurred_at, true)}</time>
            {onDelete?.(e)}
          </div>
          <p className="break-words">{describeEvent(e)}{e.note ? <span className="block text-sm whitespace-pre-line">{e.note}</span> : null}</p>
        </li>
      ))}
    </ol>
  );
}
