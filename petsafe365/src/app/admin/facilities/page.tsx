"use client";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Loading, Notice, PageHeader, formatDate } from "@/components/ui";
import { audit } from "@/lib/domain";
import { useAsync, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { FacilityReport } from "@/lib/types";

const TYPE_LABEL: Record<FacilityReport["report_type"], string> = { closed: "폐업·휴업", wrong_phone: "전화번호 오류", wrong_hours: "운영시간 오류", other: "기타" };

function ReportItem({ report, facilityName, canResolve, onChanged }: { report: FacilityReport; facilityName: string; canResolve: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = async () => {
    setBusy(true);
    setError(null);
    try {
      await getRepo().update("facility_reports", report.id, { status: "resolved", resolved_at: new Date().toISOString() });
      await audit("facility_report_resolve", "facility_reports", report.id, { facility_id: report.facility_id, from: report.status, to: "resolved" });
      onChanged();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="li" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 break-keep font-bold">{facilityName}</h2>
        <Badge>{TYPE_LABEL[report.report_type]}</Badge>
        <Badge tone={report.status === "open" ? "warn" : "safe"}>{report.status === "open" ? "처리 전" : "처리 완료"}</Badge>
      </div>
      <p className="whitespace-pre-wrap break-words">{report.details || "적힌 내용이 없어요."}</p>
      <p className="text-sm text-muted">
        접수 {formatDate(report.created_at)}
        {report.resolved_at ? ` · 처리 ${formatDate(report.resolved_at)}` : ""}
      </p>
      {report.status === "open" ? (
        <Button disabled={busy || !canResolve} onClick={resolve} className="self-start">
          {busy ? "저장하는 중이에요" : "처리 완료"}
        </Button>
      ) : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </Card>
  );
}

export default function AdminFacilitiesPage() {
  const { user } = useSession();
  const canResolve = user?.role === "admin";
  const state = useAsync(async () => {
    const repo = getRepo();
    const [reports, facilities] = await Promise.all([repo.list("facility_reports", { order: { column: "created_at", ascending: false } }), repo.list("facilities")]);
    const names = new Map(facilities.map((f) => [f.id, f.name]));
    return [...reports].sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved")).map((report) => ({ report, name: names.get(report.facility_id) ?? "삭제되었거나 찾을 수 없는 시설" }));
  }, []);

  return (
    <>
      <PageHeader title="시설 오류 신고" description="보호자가 알려 준 폐업·전화·운영시간 오류를 확인하고 처리해요." />
      <Notice>중복 병합·공공데이터 동기화는 준비 중이에요. 지금은 신고를 확인하고 처리 완료로 표시할 수 있어요.</Notice>
      {!canResolve ? <p className="text-sm text-muted">신고 처리는 관리자만 할 수 있어요.</p> : null}
      {state.loading && !state.data ? (
        <Loading />
      ) : state.error ? (
        <ErrorState onRetry={state.reload} />
      ) : !state.data || state.data.length === 0 ? (
        <EmptyState title="들어온 신고가 없어요" description="보호자가 시설 정보 오류를 알리면 여기에 모여요." />
      ) : (
        <ul className="flex flex-col gap-4">
          {state.data.map(({ report, name }) => (
            <ReportItem key={report.id} report={report} facilityName={name} canResolve={canResolve} onChanged={state.reload} />
          ))}
        </ul>
      )}
    </>
  );
}
