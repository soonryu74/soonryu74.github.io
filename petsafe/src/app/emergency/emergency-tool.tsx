"use client";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { RedFlag } from "@/content/emergency";
import { saveEmergencyNoteAction } from "@/app/actions/emergency";
import { FormMessage, type FormState } from "@/components/form-message";
import { telHref } from "@/lib/contacts";

type PetLite = { id: string; name: string; vetName: string | null; vetPhone: string | null };

export function EmergencyTool({ flags, pets, activeId, loggedIn }: { flags: RedFlag[]; pets: PetLite[]; activeId: string | null; loggedIn: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [petId, setPetId] = useState(activeId ?? pets[0]?.id ?? "");
  const [copied, setCopied] = useState<string | null>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(saveEmergencyNoteAction, null);
  const pet = pets.find((p) => p.id === petId) ?? null;
  const chosen = flags.filter((f) => selected.includes(f.key));
  const poison = chosen.some((f) => f.poisonNote);
  const [memo, setMemo] = useState({ started_at: "", substance: "", amount: "", memo: "" });
  const memoText = useMemo(() => [
    pet ? `반려동물: ${pet.name}` : null,
    chosen.length ? `관찰한 신호: ${chosen.map((f) => f.label).join(", ")}` : null,
    memo.started_at && `시작 시각: ${memo.started_at}`,
    memo.substance && `먹은 것/제품: ${memo.substance}`,
    memo.amount && `양: ${memo.amount}`,
    memo.memo && `메모: ${memo.memo}`,
  ].filter(Boolean).join("\n"), [pet, chosen, memo]);

  async function copy() {
    try { await navigator.clipboard.writeText(memoText); setCopied("복사했어요. 병원에 전화하거나 도착해서 보여 주세요."); }
    catch { setCopied("복사할 수 없는 환경이에요. 화면을 그대로 보여 주세요."); }
  }

  return (
    <>
      {/* 1. 가장 먼저: 전화·병원 찾기 */}
      <section aria-labelledby="call-h" className="card border-2 border-danger">
        <h2 id="call-h" className="h2">지금 바로</h2>
        {pets.length > 1 && (
          <div className="field mt-2">
            <label htmlFor="em-pet" className="label">어느 아이인가요?</label>
            <select id="em-pet" className="input" value={petId} onChange={(e) => setPetId(e.target.value)}>
              {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          {pet?.vetPhone ? (
            <a href={telHref(pet.vetPhone)} className="btn btn-danger text-lg min-h-[56px]">📞 {pet.vetName ?? "다니는 병원"}에 전화</a>
          ) : (
            <div className="rounded-xl border border-line p-3 text-sm">
              <p className="font-bold">다니는 병원 번호가 저장돼 있지 않아요.</p>
              <p className="text-muted">{loggedIn ? <>우리 아이 정보에 병원 번호를 저장하면 여기서 한 번에 전화할 수 있어요.</> : <>로그인해 병원 번호를 저장하면 한 번에 전화할 수 있어요.</>}</p>
            </div>
          )}
          <Link href="/map?type=animal_hospital&from=emergency" className="btn btn-primary text-lg min-h-[56px]">📍 가까운 동물병원 찾기</Link>
        </div>
        <p className="hint mt-2">24시간·응급 진료 여부는 병원마다 달라요. 확인된 정보가 없으면 &lsquo;미확인&rsquo;으로 표시돼요. 출발 전에 전화로 진료 가능 여부를 꼭 확인하세요.</p>
      </section>

      {/* 2. 관찰 가능한 신호 선택 */}
      <section aria-labelledby="flags-h" className="card">
        <h2 id="flags-h" className="h2">어떤 모습인가요?</h2>
        <p className="hint">보이는 것을 모두 고르세요. 진단이 아니라 병원에 알릴 내용을 정리하는 과정이에요.</p>
        <fieldset className="mt-2">
          <legend className="sr-only">관찰한 신호</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {flags.map((f) => (
              <label key={f.key} className="flex items-start gap-3 rounded-xl border border-line p-3 cursor-pointer has-[:checked]:border-danger has-[:checked]:bg-[#FEF2F2]">
                <input type="checkbox" className="mt-1 size-5 accent-[#C2413B]" checked={selected.includes(f.key)}
                  onChange={(e) => setSelected((s) => e.target.checked ? [...s, f.key] : s.filter((x) => x !== f.key))} />
                <span><span className="font-bold block">{f.label}</span><span className="text-sm text-muted">{f.observe}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {chosen.length > 0 && (
        <section aria-labelledby="todo-h" aria-live="polite" className="card">
          <h2 id="todo-h" className="h2">병원 가기 전 할 것 · 하지 말 것</h2>
          {chosen.map((f) => (
            <div key={f.key} className="mt-3">
              <h3 className="h3">{f.label}</h3>
              <div className="grid sm:grid-cols-2 gap-2 mt-1">
                <div className="rounded-xl bg-[#ECFDF5] p-3"><p className="font-bold text-[#065F46]">할 것</p><ul className="list-disc pl-5 text-sm">{f.doNow.map((x) => <li key={x}>{x}</li>)}</ul></div>
                <div className="rounded-xl bg-[#FEF2F2] p-3"><p className="font-bold text-[#7F1D1D]">하지 말 것</p><ul className="list-disc pl-5 text-sm">{f.dont.map((x) => <li key={x}>{x}</li>)}</ul></div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 3. 병원 전달용 메모 */}
      <section aria-labelledby="memo-h" className="card">
        <h2 id="memo-h" className="h2">병원에 전할 메모</h2>
        <form action={action} className="space-y-3 mt-2">
          <input type="hidden" name="pet_id" value={petId} />
          <input type="hidden" name="flags" value={chosen.map((f) => f.label).join(", ")} />
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="field">
              <label htmlFor="em-start" className="label">증상이 시작된 시각</label>
              <input id="em-start" name="started_at" type="time" className="input" value={memo.started_at} onChange={(e) => setMemo({ ...memo, started_at: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="em-amount" className="label">먹은 양{poison ? "" : <span className="opt">해당 시</span>}</label>
              <input id="em-amount" name="amount" className="input" maxLength={100} value={memo.amount} onChange={(e) => setMemo({ ...memo, amount: e.target.value })} placeholder="예: 판 초콜릿 반 개" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="em-sub" className="label">먹은 것·제품명·성분{poison ? "" : <span className="opt">해당 시</span>}</label>
            <input id="em-sub" name="substance" className="input" maxLength={200} value={memo.substance} onChange={(e) => setMemo({ ...memo, substance: e.target.value })} placeholder="포장지 사진도 찍어 두세요" />
          </div>
          <div className="field">
            <label htmlFor="em-memo" className="label">그 밖의 관찰</label>
            <textarea id="em-memo" name="memo" rows={2} maxLength={1000} className="input" value={memo.memo} onChange={(e) => setMemo({ ...memo, memo: e.target.value })} />
          </div>
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm" aria-label="메모 미리보기">{memoText || "선택하거나 입력한 내용이 여기에 모여요."}</pre>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline" onClick={copy} disabled={!memoText}>메모 복사</button>
            {loggedIn && pets.length > 0 ? (
              <button type="submit" className="btn btn-primary" disabled={pending || !memoText}>{pending ? "저장 중…" : "건강 기록에 저장"}</button>
            ) : (
              <Link href="/login?next=/emergency" className="btn btn-outline">로그인하고 기록에 저장</Link>
            )}
          </div>
          {copied && <p role="status" className="text-sm">{copied}</p>}
          <FormMessage state={state} />
        </form>
      </section>
    </>
  );
}
