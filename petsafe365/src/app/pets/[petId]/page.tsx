"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, ErrorState, Field, Forbidden, LinkButton, Loading, LoginRequired, PageHeader, SelectField, formatDate } from "@/components/ui";
import { deletePetCascade } from "@/lib/domain";
import { useAsync, useSession } from "@/lib/hooks";
import { RepoError, getRepo, validateFile } from "@/lib/repo";
import type { HealthEvent, Pet, PetCondition, PetDocument, SessionUser } from "@/lib/types";
import { EVENT_LABEL, PetFormFields, SPECIES_LABEL, ageLabel, errorText, eventValue, formToPet, petToForm, validatePetForm, type PetFormErrors } from "../pet-shared";

export default function PetDetailPage() {
  const { petId } = useParams<{ petId: string }>();
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (!user) return <LoginRequired what="우리 아이 정보" />;
  return <PetDetail key={`${user.id}:${petId}`} petId={petId} user={user} />;
}

type Loaded = { pet: Pet; conditions: PetCondition[]; events: HealthEvent[]; documents: PetDocument[]; now: Date };

function PetDetail({ petId, user }: { petId: string; user: SessionUser }) {
  // 다른 보호자의 아이는 저장소가 돌려주지 않는다(null). 그 경우 어떤 정보도 그리지 않는다.
  const state = useAsync<Loaded | null>(async () => {
    const repo = getRepo();
    const pet = await repo.get("pets", petId);
    if (!pet || pet.deleted_at || pet.owner_id !== user.id) return null;
    const [conditions, events, documents] = await Promise.all([
      repo.list("pet_conditions", { eq: { pet_id: pet.id }, order: { column: "created_at" } }),
      repo.list("health_events", { eq: { pet_id: pet.id }, order: { column: "occurred_at", ascending: false }, limit: 20 }),
      repo.list("documents", { eq: { pet_id: pet.id }, order: { column: "created_at", ascending: false } }),
    ]);
    return { pet, conditions, events, documents, now: new Date() };
  }, [petId, user.id]);

  if (state.loading) return <Loading />;
  if (state.error instanceof RepoError && (state.error.code === "forbidden" || state.error.code === "not_found")) return <Forbidden />;
  if (state.error) return <ErrorState onRetry={state.reload} />;
  if (!state.data) return <Forbidden />;
  const { pet, conditions, events, documents, now } = state.data;

  return (
    <>
      <PageHeader title={pet.name} description={`${SPECIES_LABEL[pet.species]} · ${ageLabel(pet, now)}`} action={<LinkButton href="/pets" variant="ghost">목록으로</LinkButton>} />
      <Profile pet={pet} onSaved={state.reload} />
      <Conditions pet={pet} conditions={conditions} onChanged={state.reload} />
      <Timeline events={events} />
      <Documents pet={pet} documents={documents} onChanged={state.reload} />
      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">가족 공유</h2>
        <p className="text-muted">가족과 함께 기록을 보는 기능을 준비하고 있어요.</p>
        <Button variant="ghost" disabled>
          가족 초대하기 (준비 중)
        </Button>
      </Card>
      <DeletePet pet={pet} />
    </>
  );
}

function StatusLine({ message }: { message: { tone: "ok" | "error"; text: string } | null }) {
  if (!message) return null;
  return (
    <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-danger" : "text-safe"}`}>
      {message.text}
    </p>
  );
}
type Message = { tone: "ok" | "error"; text: string };

function Profile({ pet, onSaved }: { pet: Pet; onSaved: () => void }) {
  const [values, setValues] = useState(() => petToForm(pet));
  const [errors, setErrors] = useState<PetFormErrors>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problems = validatePetForm(values);
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      setMessage({ tone: "error", text: "빨간 글씨로 표시된 곳을 확인해 주세요." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await getRepo().update("pets", pet.id, formToPet(values));
      setMessage({ tone: "ok", text: "프로필을 저장했어요." });
      onSaved();
    } catch (err) {
      setMessage({ tone: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold">프로필</h2>
          <p className="text-sm text-muted">마지막으로 저장한 날: {formatDate(pet.updated_at)}</p>
        </div>
        <PetFormFields idPrefix="profile" values={values} errors={errors} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} />
        <StatusLine message={message} />
        <Button type="submit" disabled={busy}>
          {busy ? "저장하는 중이에요" : "프로필 저장"}
        </Button>
      </form>
    </Card>
  );
}

const CONDITION_LABEL: Record<PetCondition["type"], string> = { condition: "질환", allergy: "알레르기" };

function Conditions({ pet, conditions, onChanged }: { pet: Pet; conditions: PetCondition[]; onChanged: () => void }) {
  const [type, setType] = useState<PetCondition["type"]>("condition");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, okText: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "ok", text: okText });
      onChanged();
    } catch (err) {
      setMessage({ tone: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = name.trim();
    setNameError(value ? null : "이름을 적어 주세요.");
    if (!value) return;
    void run(async () => {
      await getRepo().insert("pet_conditions", { pet_id: pet.id, type, name: value, note: null, active: true, source: "guardian" });
      setName("");
    }, "더했어요.");
  }

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">질환·알레르기</h2>
        <p className="text-sm text-muted">병원에서 들은 내용을 적어 두는 메모예요. 이 앱은 진단하거나 치료를 권하지 않아요.</p>
      </div>
      {conditions.length === 0 ? (
        <p className="text-muted">아직 적어 둔 내용이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {conditions.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 first:border-t-0 first:pt-0">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge tone={c.type === "allergy" ? "warn" : "neutral"}>{CONDITION_LABEL[c.type]}</Badge>
                <span className="break-words">{c.name}</span>
              </span>
              <Button variant="ghost" disabled={busy} onClick={() => run(() => getRepo().remove("pet_conditions", c.id), "지웠어요.")} aria-label={`${c.name} 지우기`}>
                지우기
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 border-t border-line pt-4">
        <SelectField id="condition-type" label="종류" value={type} onChange={(e) => setType(e.target.value as PetCondition["type"])}>
          <option value="condition">질환</option>
          <option value="allergy">알레르기</option>
        </SelectField>
        <Field id="condition-name" label="이름 (필수)" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} error={nameError} />
        <StatusLine message={message} />
        <Button type="submit" variant="ghost" disabled={busy}>
          {busy ? "저장하는 중이에요" : "더하기"}
        </Button>
      </form>
    </Card>
  );
}

function Timeline({ events }: { events: HealthEvent[] }) {
  return (
    <Card as="section" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">타임라인</h2>
      {events.length === 0 ? (
        <p className="text-muted">아직 기록이 없어요. 할 일을 완료하거나 기록을 남기면 여기에 쌓여요.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {events.map((e) => {
            const value = eventValue(e);
            return (
              <li key={e.id} className="flex flex-col gap-1 border-t border-line pt-2 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={e.event_type === "task_done" ? "safe" : "brand"}>{EVENT_LABEL[e.event_type]}</Badge>
                  <time dateTime={e.occurred_at} className="text-sm text-muted">
                    {formatDate(e.occurred_at)}
                  </time>
                </div>
                {value ? <p className="break-words font-medium">{value}</p> : null}
                {e.note ? <p className="whitespace-pre-wrap break-words text-sm">{e.note}</p> : null}
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-sm text-muted">최근 20개까지 보여요.</p>
      <LinkButton href="/records" variant="ghost">
        건강 기록에서 더 보기·남기기
      </LinkButton>
    </Card>
  );
}

const DOC_LABEL: Record<PetDocument["document_type"], string> = { medical: "진료·검사", insurance: "보험", receipt: "영수증", other: "기타" };

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function Documents({ pet, documents, onChanged }: { pet: Pet; documents: PetDocument[]; onChanged: () => void }) {
  const [type, setType] = useState<PetDocument["document_type"]>("medical");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = file ? validateFile(file) : "올릴 파일을 골라 주세요.";
    setFileError(problem);
    setMessage(null);
    if (!file || problem) return;
    setBusy(true);
    try {
      await getRepo().files.upload(pet.id, type, file);
      setMessage({ tone: "ok", text: "문서를 올렸어요." });
      setFile(null);
      setInputKey((k) => k + 1);
      onChanged();
    } catch (err) {
      setMessage({ tone: "error", text: errorText(err, "올리지 못했어요. 잠시 뒤 다시 시도해 주세요.") });
    } finally {
      setBusy(false);
    }
  }

  async function prepare(doc: PetDocument) {
    setBusy(true);
    setMessage(null);
    try {
      const url = await getRepo().files.openUrl(doc);
      setLinks((l) => ({ ...l, [doc.id]: url }));
    } catch (err) {
      setMessage({ tone: "error", text: errorText(err, "문서를 열지 못했어요. 잠시 뒤 다시 시도해 주세요.") });
    } finally {
      setBusy(false);
    }
  }

  async function remove(doc: PetDocument) {
    setBusy(true);
    setMessage(null);
    try {
      await getRepo().files.remove(doc);
      setConfirmId(null);
      setMessage({ tone: "ok", text: "문서를 지웠어요." });
      onChanged();
    } catch (err) {
      setMessage({ tone: "error", text: errorText(err, "지우지 못했어요. 잠시 뒤 다시 시도해 주세요.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">문서</h2>
        <p className="text-sm text-muted">올린 문서는 나만 볼 수 있어요. 열람 링크는 잠깐만 쓸 수 있어요.</p>
      </div>
      <StatusLine message={message} />
      {documents.length === 0 ? (
        <p className="text-muted">아직 올린 문서가 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{DOC_LABEL[d.document_type]}</Badge>
                <span className="min-w-0 break-all font-medium">{d.original_name}</span>
              </div>
              <p className="text-sm text-muted">
                {formatDate(d.created_at)} · {formatSize(d.size)}
              </p>
              {confirmId === d.id ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm">이 문서를 지울까요? 지우면 되돌릴 수 없어요.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="danger" disabled={busy} onClick={() => remove(d)}>
                      {busy ? "지우는 중이에요" : "지우기"}
                    </Button>
                    <Button variant="ghost" disabled={busy} onClick={() => setConfirmId(null)}>
                      그대로 두기
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {links[d.id] ? (
                    <a
                      href={links[d.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-line bg-card px-4 font-semibold text-brand underline hover:bg-tint"
                    >
                      새 탭에서 열기
                    </a>
                  ) : (
                    <Button variant="ghost" disabled={busy} onClick={() => prepare(d)} aria-label={`${d.original_name} 열람 링크 만들기`}>
                      열람 링크 만들기
                    </Button>
                  )}
                  <Button variant="ghost" disabled={busy} onClick={() => setConfirmId(d.id)} aria-label={`${d.original_name} 지우기`}>
                    지우기
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 border-t border-line pt-4">
        <SelectField id="doc-type" label="문서 종류" value={type} onChange={(e) => setType(e.target.value as PetDocument["document_type"])}>
          {(Object.keys(DOC_LABEL) as PetDocument["document_type"][]).map((t) => (
            <option key={t} value={t}>
              {DOC_LABEL[t]}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-col gap-1">
          <label htmlFor="doc-file" className="font-medium">
            파일 (필수)
          </label>
          <input
            key={inputKey}
            id="doc-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            aria-invalid={fileError ? true : undefined}
            aria-describedby={fileError ? "doc-file-error" : "doc-file-hint"}
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              setFile(picked);
              setFileError(picked ? validateFile(picked) : null);
            }}
            className="w-full rounded-[12px] border border-line bg-card p-3 text-base file:mr-3 file:rounded-[10px] file:border-0 file:bg-tint file:px-3 file:py-2 file:font-semibold file:text-brand"
          />
          {fileError ? (
            <p id="doc-file-error" role="alert" className="text-sm text-danger">
              {fileError}
            </p>
          ) : (
            <p id="doc-file-hint" className="text-sm text-muted">
              PDF, JPG, PNG, WEBP · 10MB 이하
            </p>
          )}
        </div>
        <Button type="submit" variant="ghost" disabled={busy}>
          {busy ? "처리하는 중이에요" : "문서 올리기"}
        </Button>
      </form>
    </Card>
  );
}

function DeletePet({ pet }: { pet: Pet }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const matches = typed.trim() === pet.name.trim();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!matches) {
      setError("이름이 똑같아야 삭제할 수 있어요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deletePetCascade(pet.id);
      router.push("/pets");
    } catch (err) {
      setError(errorText(err, "삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요."));
      setBusy(false);
    }
  }

  return (
    <Card as="section" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">삭제</h2>
      {open ? (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
          <p>
            <strong>{pet.name}</strong>의 정보를 삭제하면 일정·기록·문서·보험 메모가 함께 삭제돼요. 삭제한 뒤에는 되돌릴 수 없어요.
          </p>
          <Field id="delete-confirm" label={`확인을 위해 아이 이름 "${pet.name}"을(를) 적어 주세요`} value={typed} onChange={(e) => setTyped(e.target.value)} error={error} autoComplete="off" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger" disabled={busy || !matches}>
              {busy ? "삭제하는 중이에요" : "모두 삭제하기"}
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
              그만두기
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-muted">더 이상 함께 지내지 않는 아이의 정보를 지울 수 있어요.</p>
          <div>
            <Button variant="ghost" onClick={() => setOpen(true)}>
              이 아이 정보 삭제하기
            </Button>
          </div>
          <p className="text-sm text-muted">
            기록만 지우고 싶다면{" "}
            <Link href="/records" className="text-brand underline">
              건강 기록
            </Link>
            에서 하나씩 지울 수 있어요.
          </p>
        </>
      )}
    </Card>
  );
}
