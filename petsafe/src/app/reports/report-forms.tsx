"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { deleteIncidentDraftAction, saveIncidentDraftAction } from "@/app/actions/reports";
import { FormMessage, FieldError, type FormState } from "@/components/form-message";

const LOCAL_KEY = "petsafe365:report-drafts";

export function DraftForm({ type, evidence, loggedIn }: { type: string; evidence: string[]; loggedIn: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveIncidentDraftAction, null);
  const [local, setLocal] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}");
      const saved = all[type];
      if (saved && ref.current) {
        for (const [k, v] of Object.entries(saved as Record<string, string | string[]>)) {
          if (Array.isArray(v)) ref.current.querySelectorAll<HTMLInputElement>(`[name="${k}"]`).forEach((el) => { el.checked = v.includes(el.value); });
          else { const el = ref.current.elements.namedItem(k) as HTMLInputElement | null; if (el && "value" in el) el.value = v; }
        }
        queueMicrotask(() => setLocal("이 기기에 저장된 메모를 불러왔어요."));
      }
    } catch { /* ignore */ }
  }, [type]);

  function saveLocal() {
    if (!ref.current) return;
    const fd = new FormData(ref.current);
    const data = { occurred_at: String(fd.get("occurred_at") ?? ""), location_text: String(fd.get("location_text") ?? ""), features: String(fd.get("features") ?? ""), memo: String(fd.get("memo") ?? ""), evidence: fd.getAll("evidence").map(String) };
    try {
      const all = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}");
      all[type] = data;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
      setLocal("이 기기(브라우저)에만 저장했어요. 서버로 보내지 않았어요.");
    } catch { setLocal("이 브라우저에서는 저장할 수 없어요."); }
  }
  function clearLocal() {
    try { const all = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}"); delete all[type]; localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); } catch { /* ignore */ }
    ref.current?.reset();
    setLocal("이 기기에서 지웠어요.");
  }
  async function copy() {
    if (!ref.current) return;
    const fd = new FormData(ref.current);
    const text = [
      fd.get("occurred_at") && `일시: ${fd.get("occurred_at")}`,
      fd.get("location_text") && `장소: ${fd.get("location_text")}`,
      fd.get("features") && `특징: ${fd.get("features")}`,
      fd.get("memo") && `메모: ${fd.get("memo")}`,
      fd.getAll("evidence").length ? `준비한 자료: ${fd.getAll("evidence").join(", ")}` : null,
    ].filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(text); setLocal("복사했어요. 신고할 때 붙여 넣으세요."); } catch { setLocal("복사할 수 없는 환경이에요."); }
  }

  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="incident_type" value={type} />
      <fieldset>
        <legend className="label mb-1">준비할 것</legend>
        <ul className="space-y-1">
          {evidence.map((e, i) => <li key={e}><label className="flex items-center gap-2 min-h-[40px]"><input id={`ev-${i}`} type="checkbox" name="evidence" value={e} className="size-5 accent-[#0F766E]" /> {e}</label></li>)}
        </ul>
      </fieldset>
      <div className="grid sm:grid-cols-2 gap-2">
        <div className="field"><label htmlFor="r-when" className="label">일시<span className="opt">선택</span></label><input id="r-when" name="occurred_at" type="datetime-local" className="input" /></div>
        <div className="field"><label htmlFor="r-where" className="label">장소(동네·건물 수준)<span className="opt">선택</span></label><input id="r-where" name="location_text" maxLength={120} className="input" placeholder="예: ○○동 ○○공원 입구" /></div>
      </div>
      <div className="field"><label htmlFor="r-feat" className="label">동물의 특징<span className="opt">선택</span></label><textarea id="r-feat" name="features" rows={2} maxLength={1000} className="input" /></div>
      <div className="field"><label htmlFor="r-memo" className="label">메모<span className="opt">선택</span></label><textarea id="r-memo" name="memo" rows={2} maxLength={1000} className="input" placeholder="다른 사람의 실명·주소는 적지 마세요." /></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline" onClick={copy}>메모 복사</button>
        <button type="button" className="btn btn-outline" onClick={saveLocal}>이 기기에 저장</button>
        <button type="button" className="btn btn-outline" onClick={clearLocal}>기기에서 지우기</button>
      </div>
      {local && <p role="status" className="text-sm">{local}</p>}
      {loggedIn && (
        <div className="border-t border-line pt-3 space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="account_consent" className="mt-1 size-4 accent-[#0F766E]" />
            <span>[선택] 신고 준비를 위해 이 메모를 내 계정에 90일간 보관하는 데 동의해요. 제3자에게 제공되지 않고 언제든 삭제할 수 있어요.</span>
          </label>
          <FieldError id="r-consent-err" error={state?.errors?.account_consent} />
          <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "저장 중…" : "계정에 저장"}</button>
        </div>
      )}
      <FormMessage state={state} />
    </form>
  );
}

export function DraftDelete({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button type="button" className="text-xs link" disabled={pending} onClick={() => { if (confirm("이 메모를 삭제할까요?")) start(() => deleteIncidentDraftAction(id)); }}>삭제</button>;
}
