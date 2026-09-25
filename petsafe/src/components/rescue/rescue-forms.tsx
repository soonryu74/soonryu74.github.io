"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { deleteRescueWatchAction, markRescueWatchSeenAction, saveRescueWatchAction } from "@/app/actions/rescue";
import { FormMessage, type FormState } from "@/components/form-message";
import type { RescueWatch } from "@/lib/types";

export function AutoSubmitSelect({ id, name, defaultValue, options }: { id: string; name: string; defaultValue: string; options: { code: string; name: string }[] }) {
  // 시·도를 바꾸면 시·군구 목록을 새로 받도록 폼을 제출한다 (JS가 없으면 '찾기' 버튼으로 동작)
  return (
    <select id={id} name={name} className="input" defaultValue={defaultValue}
      onChange={(e) => { const f = e.currentTarget.form; if (f) { const sg = f.elements.namedItem("sigungu") as HTMLSelectElement | null; if (sg) sg.value = ""; f.requestSubmit(); } }}>
      {options.map((o) => <option key={o.code || "all"} value={o.code}>{o.name}</option>)}
    </select>
  );
}

export function SaveWatchForm(p: { sidoCode: string; sidoName: string | null; sigunguCode: string; sigunguName: string | null; species: string; keyword: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveRescueWatchAction, null);
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="sido_code" value={p.sidoCode} />
      <input type="hidden" name="sido_name" value={p.sidoName ?? ""} />
      <input type="hidden" name="sigungu_code" value={p.sigunguCode} />
      <input type="hidden" name="sigungu_name" value={p.sigunguName ?? ""} />
      <input type="hidden" name="species" value={p.species} />
      <input type="hidden" name="keyword" value={p.keyword} />
      <button type="submit" className="btn btn-outline btn-sm" disabled={pending}>{pending ? "저장 중…" : "🔔 지금 조건으로 새 공고 알림 받기"}</button>
      <FormMessage state={state} />
    </form>
  );
}

export function WatchList({ watches, activeId }: { watches: RescueWatch[]; activeId: string | null }) {
  const [pending, start] = useTransition();
  if (!watches.length) return null;
  return (
    <ul className="mt-3 divide-y divide-line">
      {watches.map((w) => {
        const qs = new URLSearchParams();
        if (w.sido_code) qs.set("sido", w.sido_code);
        if (w.sigungu_code) qs.set("sigungu", w.sigungu_code);
        if (w.species) qs.set("species", w.species);
        if (w.keyword) qs.set("q", w.keyword);
        qs.set("watch", w.id);
        return (
          <li key={w.id} className="py-2 flex items-center gap-2">
            <Link href={`/lost?${qs}`} aria-current={w.id === activeId ? "page" : undefined} className={`flex-1 link break-words ${w.id === activeId ? "font-bold" : ""}`}>🔔 {w.label}</Link>
            <button type="button" className="text-xs link" disabled={pending} aria-label={`${w.label} 조건 삭제`}
              onClick={() => { if (confirm(`'${w.label}' 조건을 지울까요?`)) start(() => deleteRescueWatchAction(w.id)); }}>삭제</button>
          </li>
        );
      })}
    </ul>
  );
}

/** 관심 조건 화면을 열면 '본 것'으로 기록 (다음 방문부터 이후 공고만 새 공고) */
export function MarkSeen({ watchId }: { watchId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void markRescueWatchSeenAction(watchId);
  }, [watchId]);
  return null;
}
