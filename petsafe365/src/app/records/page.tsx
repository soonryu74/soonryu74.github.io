"use client";
import { useState, type FormEvent } from "react";
import { PetSwitcher } from "@/components/PetSwitcher";
import { Badge, Button, Card, EmptyState, ErrorState, Field, LinkButton, Loading, LoginRequired, PageHeader, SelectField, TextareaField, formatDate } from "@/components/ui";
import { useAsync, usePets, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { HealthEvent, Pet } from "@/lib/types";
import { EVENT_LABEL, errorText, eventValue, toDateInput } from "../pets/pet-shared";

type RecordType = Exclude<HealthEvent["event_type"], "task_done">;
const TYPES: RecordType[] = ["weight", "medication_note", "test", "visit", "cost", "note"];

export default function RecordsPage() {
  const { user, loading } = useSession();
  return (
    <>
      <PageHeader title="건강 기록" description="체중, 진료, 비용을 적어 두면 병원에서 설명하기 쉬워요." />
      {loading ? <Loading /> : user ? <Records /> : <LoginRequired what="건강 기록" />}
    </>
  );
}

function Records() {
  const petsState = usePets();
  const { current, loading, error, reload } = petsState;
  if (loading) return <Loading />;
  if (error) return <ErrorState onRetry={reload} />;
  if (!current) {
    return <EmptyState title="아직 등록한 아이가 없어요" description="아이를 등록하면 기록을 남길 수 있어요." action={<LinkButton href="/onboarding">우리 아이 등록하기</LinkButton>} />;
  }
  return (
    <>
      <PetSwitcher {...petsState} />
      <PetRecords key={current.id} pet={current} />
    </>
  );
}

function PetRecords({ pet }: { pet: Pet }) {
  const events = useAsync(() => getRepo().list("health_events", { eq: { pet_id: pet.id }, order: { column: "occurred_at", ascending: false } }), [pet.id]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(true);
    setListError(null);
    try {
      await getRepo().remove("health_events", id);
      setConfirmId(null);
      events.reload();
    } catch (e) {
      setListError(errorText(e, "지우지 못했어요. 잠시 뒤 다시 시도해 주세요."));
    } finally {
      setBusy(false);
    }
  }

  const list = events.data ?? [];
  return (
    <>
      <AddRecord pet={pet} onAdded={events.reload} />
      <section aria-labelledby="records-timeline" className="flex flex-col gap-3">
        <h2 id="records-timeline" className="text-lg font-bold">
          {pet.name}의 기록
        </h2>
        {listError ? (
          <p role="alert" className="text-sm text-danger">
            {listError}
          </p>
        ) : null}
        {events.loading ? (
          <Loading />
        ) : events.error ? (
          <ErrorState onRetry={events.reload} />
        ) : list.length === 0 ? (
          <EmptyState title="아직 기록이 없어요" description="오늘 잰 체중부터 가볍게 적어 보세요." />
        ) : (
          <ol className="flex flex-col gap-3">
            {list.map((e) => {
              const value = eventValue(e);
              return (
                <Card as="li" key={e.id} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={e.event_type === "task_done" ? "safe" : "brand"}>{EVENT_LABEL[e.event_type]}</Badge>
                    <time dateTime={e.occurred_at} className="text-sm text-muted">
                      {formatDate(e.occurred_at)}
                    </time>
                  </div>
                  {value ? <p className="break-words font-semibold">{value}</p> : null}
                  {e.note ? <p className="whitespace-pre-wrap break-words">{e.note}</p> : null}
                  {confirmId === e.id ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm">이 기록을 지울까요? 지우면 되돌릴 수 없어요.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="danger" disabled={busy} onClick={() => remove(e.id)}>
                          {busy ? "지우는 중이에요" : "지우기"}
                        </Button>
                        <Button variant="ghost" disabled={busy} onClick={() => setConfirmId(null)}>
                          그대로 두기
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Button variant="ghost" onClick={() => setConfirmId(e.id)} aria-label={`${formatDate(e.occurred_at)} ${EVENT_LABEL[e.event_type]} 기록 지우기`}>
                        지우기
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}

function AddRecord({ pet, onAdded }: { pet: Pet; onAdded: () => void }) {
  const [type, setType] = useState<RecordType>("weight");
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ date?: string; value?: string; note?: string }>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const needsValue = type === "weight" || type === "cost";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const now = new Date();
    const today = toDateInput(now);
    const problems: typeof errors = {};
    if (!date || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) problems.date = "날짜를 골라 주세요.";
    else if (date > today) problems.date = "오늘보다 뒤의 날짜는 고를 수 없어요.";
    const n = Number(value);
    if (type === "weight" && (!value.trim() || !Number.isFinite(n) || n < 0.1 || n > 120)) problems.value = "체중은 0.1kg에서 120kg 사이로 적어 주세요.";
    if (type === "cost" && (!value.trim() || !Number.isInteger(n) || n < 0 || n > 100_000_000)) problems.value = "비용은 0원 이상의 숫자로 적어 주세요.";
    if (!needsValue && !note.trim()) problems.note = "내용을 적어 주세요.";
    setErrors(problems);
    setMessage(null);
    if (Object.keys(problems).length > 0) return;
    setBusy(true);
    try {
      // 오늘 기록은 지금 시각으로, 지난 날짜는 그날 정오로 남긴다.
      const occurred = date === today ? now : new Date(`${date}T12:00:00`);
      await getRepo().insert("health_events", {
        pet_id: pet.id,
        event_type: type,
        occurred_at: occurred.toISOString(),
        value_json: type === "weight" ? { weight_kg: n } : type === "cost" ? { amount_krw: n } : {},
        note: note.trim() || null,
        visibility: "private",
      });
      setMessage({ tone: "ok", text: "기록을 저장했어요." });
      setValue("");
      setNote("");
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
        <h2 className="text-lg font-bold">기록 남기기</h2>
        <SelectField
          id="record-type"
          label="종류 (필수)"
          value={type}
          onChange={(e) => {
            setType(e.target.value as RecordType);
            setValue("");
            setErrors({});
          }}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {EVENT_LABEL[t]}
            </option>
          ))}
        </SelectField>
        <Field id="record-date" label="날짜 (필수)" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} required />
        {type === "weight" ? (
          <Field id="record-value" label="체중 (kg) (필수)" type="number" inputMode="decimal" min={0.1} max={120} step={0.1} value={value} onChange={(e) => setValue(e.target.value)} error={errors.value} required />
        ) : null}
        {type === "cost" ? (
          <Field id="record-value" label="비용 (원) (필수)" type="number" inputMode="numeric" min={0} step={1} value={value} onChange={(e) => setValue(e.target.value)} error={errors.value} required />
        ) : null}
        <TextareaField id="record-note" label={needsValue ? "메모" : "내용 (필수)"} optional={needsValue} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} error={errors.note} />
        {type === "medication_note" ? (
          <p className="text-sm text-muted">약 이름과 용량은 담당 수의사의 안내를 그대로 적어 두는 용도예요. 이 앱은 약을 추천하지 않아요.</p>
        ) : null}
        {message ? (
          <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-danger" : "text-safe"}`}>
            {message.text}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "저장하는 중이에요" : "기록 저장"}
        </Button>
      </form>
    </Card>
  );
}
