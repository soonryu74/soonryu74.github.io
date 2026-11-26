"use client";
import { EmptyState, ErrorState, Loading, PageHeader } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AdminAuditPage() {
  const state = useAsync(() => getRepo().list("audit_logs", { order: { column: "created_at", ascending: false }, limit: 100 }), []);
  return (
    <>
      <PageHeader title="감사로그" description="운영자가 바꾼 내용을 최근 100건까지 보여 줘요." />
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorState onRetry={state.reload} />
      ) : !state.data || state.data.length === 0 ? (
        <EmptyState title="아직 기록이 없어요" description="콘텐츠 상태, 연락처, 기능 플래그를 바꾸면 여기에 남아요. 관리자만 볼 수 있어요." />
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-line bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">감사로그 목록</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="px-3 py-2 font-medium">시각</th>
                <th scope="col" className="px-3 py-2 font-medium">행위자</th>
                <th scope="col" className="px-3 py-2 font-medium">동작</th>
                <th scope="col" className="px-3 py-2 font-medium">대상</th>
                <th scope="col" className="px-3 py-2 font-medium">세부 내용</th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((log) => (
                <tr key={log.id} className="border-b border-line align-top last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">{formatDateTime(log.created_at)}</td>
                  <td className="max-w-32 break-all px-3 py-2 font-mono text-xs">{log.actor_id}</td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="max-w-40 break-all px-3 py-2">
                    {log.entity_type}
                    {log.entity_id ? <span className="block font-mono text-xs text-muted">{log.entity_id}</span> : null}
                  </td>
                  <td className="max-w-64 break-all px-3 py-2 font-mono text-xs">{JSON.stringify(log.metadata_json)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
