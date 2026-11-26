"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, LinkButton, Loading, Notice, PageHeader, TextareaField, formatDate } from "@/components/ui";
import { useAsync, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import { isContactUsable } from "@/lib/rules";
import type { IncidentDraft, OfficialContact } from "@/lib/types";

type Category = OfficialContact["category"];

const SITUATIONS: { key: Category; label: string; short: string; intro: string; checklist: string[]; tips: string[] }[] = [
  {
    key: "lost_found",
    label: "유실·유기 동물을 발견했어요",
    short: "유실·유기 동물 발견",
    intro: "다가가기 전에 먼저 안전을 확인해 주세요. 겁먹은 동물은 물거나 달아날 수 있어요.",
    checklist: ["동물 사진 (전신, 얼굴)", "발견한 시간", "발견한 장소 (동 단위와 주변 건물)", "특징 (크기, 털색, 목줄·인식표, 옷)", "다친 곳이 있는지 눈으로 본 모습", "지금 어디에 있는지 (그 자리, 임시 보호 중)"],
    tips: ["인식표가 있으면 적힌 번호로 먼저 연락해 보세요.", "무리하게 붙잡지 말고 공식 창구에 신고해 주세요."],
  },
  {
    key: "lost_mine",
    label: "우리 아이를 잃어버렸어요",
    short: "우리 아이 분실",
    intro: "많이 놀라셨죠. 빨리 알릴수록 좋아요. 아래 내용을 정리해서 공식 창구에 분실 신고를 해 주세요.",
    checklist: ["최근 사진 (전신, 얼굴)", "잃어버린 시간", "잃어버린 장소 (동 단위와 주변 건물)", "특징 (크기, 털색, 목줄·인식표, 옷)", "동물등록번호", "보호자 연락처 (신고서에만 적어요)"],
    tips: ["동물등록이 되어 있으면 분실 신고를 함께 해 주세요.", "전단이나 온라인 글에는 집 주소를 적지 않는 것이 안전해요."],
  },
  {
    key: "abuse",
    label: "학대가 의심돼요",
    short: "학대 의심",
    intro: "직접 막아서거나 따지지 말고, 안전한 곳에서 신고해 주세요.",
    checklist: ["사진이나 영상 (안전한 거리에서, 무리하지 않기)", "목격한 날짜와 시간", "장소 (동 단위와 주변 건물)", "동물의 상태와 특징", "반복해서 본 일이면 날짜별 기록", "함께 본 사람이 있는지"],
    tips: ["증거 원본 파일은 지우거나 편집하지 말고 그대로 보관해 주세요.", "상대방의 이름·주소·얼굴을 온라인에 올리지 마세요. 신고서로만 전달해 주세요."],
  },
  {
    key: "illegal_practice",
    label: "불법 진료가 의심돼요",
    short: "불법 진료 의심",
    intro: "수의사가 아닌 사람의 진료가 의심될 때는 공식 창구에 알려 주세요.",
    checklist: ["받은 처치나 판매 내용을 적은 기록", "날짜와 시간", "장소 (상호, 동 단위)", "영수증, 결제 내역", "주고받은 문자·대화 기록", "광고나 게시물 화면 사진"],
    tips: ["아이 상태가 걱정되면 먼저 동물병원에 연락해 주세요.", "상대방의 이름·주소를 온라인에 올리지 마세요. 신고서로만 전달해 주세요."],
  },
  {
    key: "consumer",
    label: "서비스·진료비 분쟁이 있어요",
    short: "서비스·진료비 분쟁",
    intro: "먼저 업체에 이의를 제기하고, 해결되지 않으면 소비자 상담을 받아 보세요.",
    checklist: ["영수증과 진료비 세부내역", "사전에 들은 설명이나 견적", "주고받은 문자·대화 기록", "이용 날짜와 시간", "업체 이름과 지점", "원하는 해결 방법 (환불, 재처리 등)"],
    tips: ["영수증, 설명, 대화 기록을 지우지 말고 보관해 주세요.", "후기나 온라인 글에 직원의 이름·얼굴을 올리지 마세요."],
  },
];

function ContactList({ category }: { category: Category }) {
  const state = useAsync(() => getRepo().list("official_contacts", { eq: { category } }), [category]);
  if (state.loading) return <Loading label="공식 연락처를 불러오는 중이에요" />;
  if (state.error) return <ErrorState message="공식 연락처를 불러오지 못했어요." onRetry={state.reload} />;
  const now = new Date();
  const all = state.data ?? [];
  const usable = all.filter((c) => isContactUsable(c, now));
  const pending = all.filter((c) => c.status === "pending");
  if (usable.length === 0 && pending.length === 0) {
    return <EmptyState title="확인된 공식 연락처가 아직 없어요" description="운영자가 확인하는 대로 올릴게요. 급하면 관할 시·군·구청에 문의해 주세요." />;
  }
  return (
    <ul className="flex flex-col gap-3">
      {usable.map((c) => (
        <li key={c.id} className="flex flex-col gap-2 rounded-[14px] border border-line p-3">
          <p className="break-words font-semibold">{c.organization}</p>
          <p className="text-sm text-muted">
            {c.coverage_area}
            {c.available_hours ? ` · ${c.available_hours}` : ""}
          </p>
          {c.phone ? (
            <LinkButton href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`} variant="safe" className="w-full">
              전화하기 {c.phone}
            </LinkButton>
          ) : null}
          {c.url ? (
            <LinkButton href={c.url} variant="ghost" className="w-full">
              온라인으로 열기
            </LinkButton>
          ) : null}
          {!c.phone && !c.url ? <p className="text-muted">연락처 확인 중</p> : null}
          <p className="break-words text-sm text-muted">
            최근 확인일: {c.verified_at ? formatDate(c.verified_at) : "운영자 확인 전"} · 출처:{" "}
            {c.source_url ? (
              <a className="underline" href={c.source_url} target="_blank" rel="noopener noreferrer">
                {c.source_url.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              "출처 확인 전"
            )}
          </p>
        </li>
      ))}
      {pending.map((c) => (
        <li key={c.id} className="flex flex-col gap-1 rounded-[14px] border border-dashed border-line p-3">
          <p className="break-words font-semibold">{c.organization}</p>
          <p>
            <Badge tone="warn">연락처 확인 중</Badge>
          </p>
          <p className="text-sm text-muted">운영자가 확인한 뒤에 번호와 링크를 올려요. 확인 전 번호는 보여 주지 않아요.</p>
        </li>
      ))}
    </ul>
  );
}

function MyDrafts({ userId, tick }: { userId: string; tick: number }) {
  const state = useAsync(() => getRepo().list("incident_drafts", { eq: { user_id: userId }, order: { column: "created_at", ascending: false } }), [userId, tick]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setError(null);
    setBusy(true);
    try {
      await getRepo().remove("incident_drafts", id);
      setConfirmId(null);
      state.reload();
    } catch {
      setError("지우지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorState onRetry={state.reload} />;
  const drafts: IncidentDraft[] = state.data ?? [];
  if (drafts.length === 0) return <EmptyState title="저장한 신고 준비 내용이 없어요" />;
  return (
    <>
      <ul className="flex flex-col gap-3">
        {drafts.map((d) => (
          <li key={d.id} className="flex flex-col gap-2 rounded-[14px] border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{SITUATIONS.find((s) => s.key === d.incident_type)?.short ?? d.incident_type}</Badge>
              <span className="text-sm text-muted">저장한 날 {formatDate(d.created_at)}</span>
            </div>
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium">일어난 때</dt>
                <dd>{d.occurred_at ? formatDate(d.occurred_at) : "적지 않음"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium">장소</dt>
                <dd className="min-w-0 break-words">{d.details_json.place || "적지 않음"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium">특징</dt>
                <dd className="min-w-0 whitespace-pre-line break-words">{d.details_json.features || "적지 않음"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium">챙긴 것</dt>
                <dd className="min-w-0 break-words">{d.details_json.checklist?.length ? d.details_json.checklist.join(", ") : "없음"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium">삭제 예정</dt>
                <dd>{d.retention_until ? `${formatDate(d.retention_until)} 이후` : "정해지지 않음"}</dd>
              </div>
            </dl>
            {confirmId === d.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm">이 내용을 지울까요?</span>
                <Button variant="danger" disabled={busy} onClick={() => remove(d.id)}>
                  지우기
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => setConfirmId(null)}>
                  취소
                </Button>
              </div>
            ) : (
              <Button variant="ghost" className="self-start" onClick={() => setConfirmId(d.id)}>
                삭제
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

function SituationPanel({ situation, onSaved }: { situation: (typeof SITUATIONS)[number]; onSaved: () => void }) {
  const { user, loading: sessionLoading } = useSession();
  const [checked, setChecked] = useState<string[]>([]);
  const [occurredAt, setOccurredAt] = useState("");
  const [place, setPlace] = useState("");
  const [features, setFeatures] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggle = (item: string) => {
    setSaved(false);
    setChecked((c) => (c.includes(item) ? c.filter((i) => i !== item) : [...c, item]));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!occurredAt && !place.trim() && !features.trim() && checked.length === 0) {
      setError("저장할 내용이 없어요. 하나 이상 적거나 체크해 주세요.");
      return;
    }
    const occurred = occurredAt ? new Date(occurredAt) : null;
    if (occurred && Number.isNaN(occurred.getTime())) {
      setError("날짜와 시간을 다시 확인해 주세요.");
      return;
    }
    setError(null);
    setSaved(false);
    setBusy(true);
    const retention = new Date();
    retention.setDate(retention.getDate() + 30);
    try {
      await getRepo().insert("incident_drafts", {
        user_id: user.id,
        incident_type: situation.key,
        occurred_at: occurred ? occurred.toISOString() : null,
        location_precision: place.trim() ? "district" : "none",
        details_json: { place: place.trim(), features: features.trim(), checklist: checked },
        retention_until: retention.toISOString(),
      });
      setSaved(true);
      onSaved();
    } catch {
      setError("저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {situation.key === "abuse" ? (
        <Notice tone="danger">
          <p className="text-base font-bold">지금 위험하면 112</p>
          <p className="mt-1">학대가 진행 중이거나 생명이 위험하면 바로 112에 신고해 주세요.</p>
          <LinkButton href="tel:112" variant="danger" className="mt-2 w-full">
            112에 전화하기
          </LinkButton>
          <p className="mt-3 font-semibold">신고하는 분의 안전이 먼저예요</p>
          <ul className="mt-1 list-disc pl-5">
            <li>직접 맞서거나 집 안으로 들어가지 마세요.</li>
            <li>안전한 거리에서, 안전한 곳으로 옮긴 뒤 신고해 주세요.</li>
            <li>상대방의 이름·주소·얼굴을 온라인에 올리지 마세요. 신고서로만 전달해 주세요.</li>
          </ul>
        </Notice>
      ) : null}

      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{situation.short} · 공식 신고 창구</h2>
        <p>{situation.intro}</p>
        <ContactList category={situation.key} />
      </Card>

      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">챙겨 둘 것</h2>
        <ul className="flex flex-col">
          {situation.checklist.map((item, i) => (
            <li key={item}>
              <label htmlFor={`evidence-${i}`} className="flex min-h-12 items-center gap-3">
                <input id={`evidence-${i}`} type="checkbox" className="size-5 shrink-0" checked={checked.includes(item)} onChange={() => toggle(item)} />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ul>
        <ul className="list-disc pl-5 text-sm text-muted">
          {situation.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Card>

      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">신고 준비 내용 저장 (선택)</h2>
        <p className="text-sm text-muted">
          저장을 누를 때만 내 계정에 보관해요. 어디에도 공개되지 않고 신고 기관으로 자동 전달되지도 않아요. 저장한 내용은 30일 뒤 삭제 대상이며 언제든 지울 수 있어요.
        </p>
        {sessionLoading ? (
          <Loading />
        ) : (
          <form onSubmit={save} className="flex flex-col gap-3" noValidate>
            <Field id="draft-occurred" label="일어난 날짜와 시간" optional type="datetime-local" value={occurredAt} onChange={(e) => { setOccurredAt(e.target.value); setSaved(false); }} />
            <Field id="draft-place" label="장소" optional hint="동 단위까지만 적어 주세요. 정확한 주소나 좌표는 저장하지 않아요." placeholder="예: OO동 공원 근처" value={place} onChange={(e) => { setPlace(e.target.value); setSaved(false); }} maxLength={100} />
            <TextareaField id="draft-features" label="특징·메모" optional placeholder="예: 갈색 털, 빨간 목줄, 중간 크기" value={features} onChange={(e) => { setFeatures(e.target.value); setSaved(false); }} maxLength={1000} />
            <p className="text-sm text-muted">다른 사람의 이름·주소·연락처는 적지 말아 주세요.</p>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            {user ? (
              <Button type="submit" variant="ghost" disabled={busy}>
                {busy ? "저장하는 중이에요" : "저장"}
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <p>저장은 로그인한 뒤에 할 수 있어요. 로그인하지 않아도 위의 신고 창구와 체크리스트는 그대로 쓸 수 있어요.</p>
                <LinkButton href="/login" variant="ghost">
                  로그인하기
                </LinkButton>
              </div>
            )}
            <p role="status" aria-live="polite" className="text-sm text-safe">
              {saved ? "저장했어요. 아래 '내가 저장한 내용'에서 볼 수 있어요." : ""}
            </p>
          </form>
        )}
      </Card>
    </>
  );
}

export default function ReportsPage() {
  const { user } = useSession();
  const [selected, setSelected] = useState<Category | null>(null);
  const [draftTick, setDraftTick] = useState(0);
  const situation = SITUATIONS.find((s) => s.key === selected) ?? null;

  return (
    <>
      <PageHeader title="분실·발견·신고" description="상황을 고르면 공식 신고 창구와 챙길 것을 알려 드려요. 이 화면에서는 아무것도 공개 게시되지 않아요." />

      <section aria-label="상황 고르기">
        <ul className="grid gap-2 sm:grid-cols-2">
          {SITUATIONS.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={selected === s.key}
                onClick={() => setSelected(s.key)}
                className={`min-h-14 w-full rounded-[14px] border px-4 py-2 text-left text-base font-semibold ${selected === s.key ? "border-brand bg-brand text-white" : "border-line bg-card text-ink hover:bg-tint"}`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {situation ? (
        <SituationPanel key={situation.key} situation={situation} onSaved={() => setDraftTick((t) => t + 1)} />
      ) : (
        <p className="text-muted">위에서 상황을 하나 골라 주세요.</p>
      )}

      {user ? (
        <Card as="section" className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">내가 저장한 내용</h2>
          <p className="text-sm text-muted">나만 볼 수 있어요. 필요 없어지면 바로 지워 주세요.</p>
          <MyDrafts userId={user.id} tick={draftTick} />
        </Card>
      ) : null}

      <Notice>긴급한 동물 진료가 필요하면 <Link className="font-semibold underline" href="/emergency">긴급 도움</Link>을 열어 주세요.</Notice>
    </>
  );
}
