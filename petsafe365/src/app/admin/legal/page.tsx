"use client";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Loading, Notice, PageHeader, SelectField, TextareaField, formatDate } from "@/components/ui";
import { audit } from "@/lib/domain";
import { useAsync, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { LegalDocument } from "@/lib/types";

type DocType = LegalDocument["document_type"];
const TYPE_LABEL: Record<DocType | "marketing", string> = { terms: "이용약관", privacy: "개인정보 처리방침", location: "위치정보 안내", copyright: "저작권·게시물 정책", refund: "환불·청약철회", ads: "광고 표시 정책", marketing: "마케팅 수신 (선택)" };
const DOC_TYPES: DocType[] = ["terms", "privacy", "location", "copyright", "refund", "ads"];

function PublishButton({ doc, onChanged }: { doc: LegalDocument; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      await getRepo().update("legal_documents", doc.id, { status: "published" });
      await audit("legal_publish", "legal_documents", doc.id, { document_type: doc.document_type, version: doc.version, from: doc.status, to: "published" });
      setConfirming(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "게시하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <>
          <p className="text-sm">게시하면 보호자에게 바로 보여요. 법률 검토를 마친 문서인가요?</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={publish}>
              {busy ? "게시하는 중이에요" : "네, 게시해요"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              취소
            </Button>
          </div>
        </>
      ) : (
        <Button className="self-start" onClick={() => setConfirming(true)}>
          게시
        </Button>
      )}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function NewVersionForm({ existing, onSaved }: { existing: LegalDocument[]; onSaved: () => void }) {
  const [type, setType] = useState<DocType>("terms");
  const [version, setVersion] = useState("");
  const [effective, setEffective] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<{ version?: string; effective?: string; body?: string }>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const v = version.trim();
    if (!v) next.version = "버전을 입력해 주세요.";
    else if (existing.some((d) => d.document_type === type && d.version === v)) next.version = "같은 문서에 이미 있는 버전이에요.";
    const date = effective ? new Date(`${effective}T00:00:00`) : null;
    if (!date || Number.isNaN(date.getTime())) next.effective = "시행일을 정해 주세요.";
    if (!body.trim()) next.body = "본문을 입력해 주세요.";
    setErrors(next);
    setFailed(null);
    setSaved(false);
    if (Object.keys(next).length > 0 || !date) return;
    setBusy(true);
    try {
      const row = await getRepo().insert("legal_documents", { document_type: type, version: v, effective_at: date.toISOString(), body: body.trim(), status: "draft" });
      await audit("legal_create", "legal_documents", row.id, { document_type: type, version: v });
      setSaved(true);
      setVersion("");
      setBody("");
      onSaved();
    } catch (err) {
      setFailed(err instanceof Error && err.message ? err.message : "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <SelectField id="legal-type" label="문서 종류" value={type} onChange={(e) => setType(e.target.value as DocType)}>
        {DOC_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </SelectField>
      <Field id="legal-version" label="버전" hint="예: 1.1" value={version} onChange={(e) => setVersion(e.target.value)} error={errors.version} maxLength={20} />
      <Field id="legal-effective" label="시행일" type="date" value={effective} onChange={(e) => setEffective(e.target.value)} error={errors.effective} />
      <TextareaField id="legal-body" label="본문" rows={8} value={body} onChange={(e) => setBody(e.target.value)} error={errors.body} />
      {failed ? <p role="alert" className="text-sm text-danger">{failed}</p> : null}
      {saved ? <p role="status" className="text-sm text-safe">초안으로 저장했어요. 검토 뒤 목록에서 게시해 주세요.</p> : null}
      <Button type="submit" disabled={busy}>
        {busy ? "저장하는 중이에요" : "초안으로 등록"}
      </Button>
    </form>
  );
}

export default function AdminLegalPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const state = useAsync(async () => {
    const repo = getRepo();
    const docs = await repo.list("legal_documents", { order: { column: "effective_at", ascending: false } });
    let consents: { key: string; type: string; version: string; count: number }[] = [];
    try {
      const counts = new Map<string, { key: string; type: string; version: string; count: number }>();
      for (const c of await repo.list("user_consents")) {
        const key = `${c.document_type}@${c.document_version}`;
        const entry = counts.get(key) ?? { key, type: c.document_type, version: c.document_version, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      }
      consents = [...counts.values()].sort((a, b) => a.key.localeCompare(b.key));
    } catch {
      consents = [];
    }
    return { docs, consents };
  }, []);

  return (
    <>
      <PageHeader title="문서 버전" description="약관과 정책의 버전, 시행일, 동의 이력을 관리해요." />
      <Notice tone="warn">여기 문서는 운영 초안이에요. 유료 공개 전에는 변호사 등 전문가 검토를 거쳐야 해요.</Notice>

      {state.loading && !state.data ? (
        <Loading />
      ) : state.error || !state.data ? (
        <ErrorState onRetry={state.reload} />
      ) : (
        <>
          {state.data.docs.length === 0 ? (
            <EmptyState title="등록된 문서가 없어요" />
          ) : (
            <ul className="flex flex-col gap-4">
              {state.data.docs.map((d) => (
                <Card as="li" key={d.id} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{TYPE_LABEL[d.document_type]}</h2>
                    <Badge>버전 {d.version}</Badge>
                    <Badge tone={d.status === "published" ? "safe" : "warn"}>{d.status === "published" ? "게시" : "초안"}</Badge>
                  </div>
                  <p className="text-sm text-muted">시행일 {formatDate(d.effective_at)}</p>
                  <details>
                    <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-brand">본문 보기</summary>
                    <p className="whitespace-pre-wrap break-words text-sm">{d.body}</p>
                  </details>
                  {d.status === "draft" && isAdmin ? <PublishButton doc={d} onChanged={state.reload} /> : null}
                </Card>
              ))}
            </ul>
          )}

          <Card as="section" className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">동의 이력</h2>
            {state.data.consents.length === 0 ? (
              <p className="text-muted">동의 이력 집계는 실제 DB 연결 후 제공돼요</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th scope="col" className="py-1 pr-3 font-medium">문서</th>
                        <th scope="col" className="py-1 pr-3 font-medium">버전</th>
                        <th scope="col" className="py-1 font-medium">동의 수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.data.consents.map((c) => (
                        <tr key={c.key} className="border-b border-line last:border-0">
                          <td className="py-1 pr-3">{TYPE_LABEL[c.type as DocType | "marketing"] ?? c.type}</td>
                          <td className="py-1 pr-3">{c.version}</td>
                          <td className="py-1">{c.count}건</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted">지금 계정이 읽을 수 있는 동의 기록만 센 값이에요. 전체 집계는 실제 DB 연결 후 제공돼요.</p>
              </>
            )}
          </Card>

          <Card as="section" className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">새 버전 등록</h2>
            {isAdmin ? <NewVersionForm existing={state.data.docs} onSaved={state.reload} /> : <p className="text-muted">문서 등록과 게시는 관리자만 할 수 있어요.</p>}
          </Card>
        </>
      )}
    </>
  );
}
