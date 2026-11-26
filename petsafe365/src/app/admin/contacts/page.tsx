"use client";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Loading, Notice, PageHeader, SelectField, formatDate } from "@/components/ui";
import { audit } from "@/lib/domain";
import { useAsync, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { OfficialContact } from "@/lib/types";

const CATEGORY_LABEL: Record<OfficialContact["category"], string> = { lost_found: "발견 신고", lost_mine: "분실 신고", abuse: "학대 신고", illegal_practice: "불법 진료·영업", consumer: "소비자 피해" };
const STATUS_LABEL: Record<OfficialContact["status"], string> = { active: "사용 중", pending: "확인 대기", retired: "사용 중지" };

function ContactRow({ contact, canEdit, onChanged }: { contact: OfficialContact; canEdit: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [url, setUrl] = useState(contact.url ?? "");
  const [status, setStatus] = useState(contact.status);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const run = async (patch: Partial<OfficialContact>, action: string, meta: Record<string, unknown>, doneText: string) => {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      await getRepo().update("official_contacts", contact.id, patch);
      await audit(action, "official_contacts", contact.id, meta);
      setSaved(doneText);
      setEditing(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const nextUrl = url.trim();
    if (nextUrl && !/^https?:\/\//.test(nextUrl)) {
      setUrlError("https:// 로 시작하는 주소를 입력해 주세요.");
      return;
    }
    setUrlError(null);
    const patch = { phone: phone.trim() || null, url: nextUrl || null, status };
    void run(patch, "contact_update", { from: { phone: contact.phone, url: contact.url, status: contact.status }, to: patch }, "저장했어요.");
  };

  return (
    <Card as="li" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 break-keep font-bold">{contact.organization}</h2>
        <Badge>{CATEGORY_LABEL[contact.category]}</Badge>
        <Badge tone={contact.status === "active" ? "safe" : contact.status === "pending" ? "warn" : "neutral"}>{STATUS_LABEL[contact.status]}</Badge>
      </div>
      <dl className="grid gap-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted">전화</dt>
          <dd className="break-all">{contact.phone ?? "없음"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted">주소</dt>
          <dd className="min-w-0 break-all">{contact.url ?? "없음"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted">담당 지역</dt>
          <dd>{contact.coverage_area}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted">최근 확인</dt>
          <dd>{contact.verified_at ? formatDate(contact.verified_at) : "확인 전"}</dd>
        </div>
      </dl>

      {editing ? (
        <form
          className="flex flex-col gap-3 rounded-[12px] bg-tint p-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field id={`phone-${contact.id}`} label="전화번호" optional type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
          <Field id={`url-${contact.id}`} label="웹 주소" optional type="url" value={url} onChange={(e) => setUrl(e.target.value)} error={urlError} maxLength={300} />
          <SelectField id={`status-${contact.id}`} label="상태" value={status} onChange={(e) => setStatus(e.target.value as OfficialContact["status"])}>
            {(Object.keys(STATUS_LABEL) as OfficialContact["status"][]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </SelectField>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "저장하는 중이에요" : "저장"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              취소
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" disabled={busy || !canEdit} onClick={() => setEditing(true)}>
            수정
          </Button>
          <Button disabled={busy || !canEdit} onClick={() => void run({ verified_at: new Date().toISOString() }, "contact_verify", { previous_verified_at: contact.verified_at }, "오늘 확인한 것으로 기록했어요.")}>
            오늘 확인함
          </Button>
        </div>
      )}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {saved ? <p role="status" className="text-sm text-safe">{saved}</p> : null}
    </Card>
  );
}

export default function AdminContactsPage() {
  const { user } = useSession();
  const state = useAsync(() => getRepo().list("official_contacts", { order: { column: "category" } }), []);
  const canEdit = user?.role === "admin";
  return (
    <>
      <PageHeader title="공식 연락처" description="직접 전화하거나 공식 누리집에서 확인한 값만 적어요." />
      <Notice tone="warn">확인하지 않은 번호는 &apos;사용 중&apos;으로 바꾸지 않아요. 보호자가 급할 때 누르는 번호예요.</Notice>
      {!canEdit ? <p className="text-sm text-muted">연락처 수정은 관리자만 할 수 있어요.</p> : null}
      {state.loading && !state.data ? (
        <Loading />
      ) : state.error ? (
        <ErrorState onRetry={state.reload} />
      ) : !state.data || state.data.length === 0 ? (
        <EmptyState title="등록된 연락처가 없어요" />
      ) : (
        <ul className="flex flex-col gap-4">
          {state.data.map((c) => (
            <ContactRow key={c.id} contact={c} canEdit={canEdit} onChanged={state.reload} />
          ))}
        </ul>
      )}
    </>
  );
}
