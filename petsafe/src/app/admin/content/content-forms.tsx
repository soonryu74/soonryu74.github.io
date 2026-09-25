"use client";
import { useActionState } from "react";
import { createVersionAction, reviewVersionAction, setVersionStatusAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage, type FormState } from "@/components/form-message";
import { STATUS_LABELS } from "@/lib/content-rules";
import type { ContentStatus } from "@/lib/types";

export function ReviewForm({ versionId, today, nextYear }: { versionId: string; today: string; nextYear: string }) {
  const [state, action] = useActionState<FormState, FormData>(reviewVersionAction, null);
  return (
    <form action={action} className="mt-2 grid sm:grid-cols-2 gap-2 items-end">
      <input type="hidden" name="version_id" value={versionId} />
      <div className="field"><label htmlFor={`rn-${versionId}`} className="label">검수자 이름</label><input id={`rn-${versionId}`} name="reviewer_name" className="input" /></div>
      <div className="field"><label htmlFor={`rc-${versionId}`} className="label">검수자 자격</label><input id={`rc-${versionId}`} name="reviewer_credential" className="input" placeholder="예: 수의사(면허번호 마스킹)" /></div>
      <div className="field"><label htmlFor={`rd-${versionId}`} className="label">검토일</label><input id={`rd-${versionId}`} name="reviewed_at" type="date" className="input" defaultValue={today} /></div>
      <div className="field"><label htmlFor={`rx-${versionId}`} className="label">다음 검토예정일(공개 만료일)</label><input id={`rx-${versionId}`} name="next_review_at" type="date" className="input" defaultValue={nextYear} /></div>
      <SubmitButton className="btn btn-outline btn-sm">검수 기록</SubmitButton>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
    </form>
  );
}

export function StatusButtons({ versionId, next }: { versionId: string; next: ContentStatus[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setVersionStatusAction, null);
  if (!next.length) return null;
  return (
    <form action={action} className="mt-2 flex flex-wrap gap-2 items-center">
      <input type="hidden" name="version_id" value={versionId} />
      {next.map((to) => <button key={to} type="submit" name="to" value={to} disabled={pending} className={`btn btn-sm ${to === "published" || to === "approved" ? "btn-primary" : "btn-outline"}`}>→ {STATUS_LABELS[to]}</button>)}
      <FormMessage state={state} />
    </form>
  );
}

const SECTIONS: [string, string][] = [["animalSigns", "동물 신호"], ["humanSigns", "사람 신호"], ["transmission", "전파경로"], ["prevention", "예방"], ["humanSeekCare", "사람이 의료기관에 갈 때"], ["animalSeekVet", "동물병원에 갈 때"], ["dont", "하지 말 것"]];

export function NewVersionForm({ contentId, current }: { contentId: string; current: { title: string; summary: string; body: Record<string, string[]>; sources: string } }) {
  const [state, action] = useActionState<FormState, FormData>(createVersionAction, null);
  return (
    <form action={action} className="space-y-2 mt-2">
      <input type="hidden" name="content_id" value={contentId} />
      <div className="field"><label className="label" htmlFor={`t-${contentId}`}>제목</label><input id={`t-${contentId}`} name="title" className="input" defaultValue={current.title} /></div>
      <div className="field"><label className="label" htmlFor={`s-${contentId}`}>요약</label><textarea id={`s-${contentId}`} name="summary" rows={2} className="input" defaultValue={current.summary} /></div>
      {SECTIONS.map(([k, label]) => (
        <div key={k} className="field"><label className="label" htmlFor={`${k}-${contentId}`}>{label} (한 줄에 하나)</label><textarea id={`${k}-${contentId}`} name={k} rows={3} className="input" defaultValue={(current.body[k] ?? []).join("\n")} /></div>
      ))}
      <div className="field"><label className="label" htmlFor={`src-${contentId}`}>공식 출처 (기관명|https://주소, 한 줄에 하나)</label><textarea id={`src-${contentId}`} name="sources" rows={2} className="input" defaultValue={current.sources} /></div>
      <div className="field"><label className="label" htmlFor={`cr-${contentId}`}>변경 사유</label><input id={`cr-${contentId}`} name="change_reason" className="input" /></div>
      <SubmitButton className="btn btn-outline">초안 버전 만들기</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
