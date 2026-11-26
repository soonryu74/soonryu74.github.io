"use client";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Loading, Notice, PageHeader, formatDate } from "@/components/ui";
import { audit } from "@/lib/domain";
import { useAsync, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { FeatureFlag, FeatureFlagKey } from "@/lib/types";

const INFO: Record<FeatureFlagKey, { name: string; desc: string; prerequisites: string[] }> = {
  paymentsEnabled: {
    name: "앱 안 결제",
    desc: "용품을 앱 안에서 바로 결제할 수 있게 해요.",
    prerequisites: ["사업자 등록과 통신판매업 신고", "결제대행사 심사·계약과 서버 결제 검증 연결", "판매자 정보 표시, 청약철회·환불 정책 게시", "상품 시험 결과와 통관 확인"],
  },
  partnerSubscriptionsEnabled: {
    name: "파트너 구독 결제",
    desc: "파트너 Pro·Growth 구독료를 받아요.",
    prerequisites: ["가격 확정과 파트너 입점·광고 계약서", "정기결제 약관, 해지·환불 흐름", "결제대행사 정기결제 심사"],
  },
  insuranceReferralEnabled: {
    name: "보험 연계",
    desc: "보험사나 모집인에게 연결하는 기능이에요.",
    prerequisites: ["보험 모집 자격 또는 적법한 제휴 계약", "보험 전문가·법률 검토", "가입 권유·순위 표시가 없는지 화면 점검"],
  },
  preciseLocationStorageEnabled: {
    name: "정밀 위치 저장",
    desc: "보호자의 정확한 위치를 계정에 저장해요.",
    prerequisites: ["위치기반서비스사업 신고와 위치정보 약관", "별도 동의 화면과 보관·파기 기준", "위치정보 전문가 검토"],
  },
  publicReviewsEnabled: {
    name: "공개 후기",
    desc: "구매·이용 후기를 모두에게 보여 줘요.",
    prerequisites: ["게시물 운영정책과 권리침해 신고 창구", "사진 권리·초상권·개인정보 비노출 확인 절차", "대가성 후기 표시 기준"],
  },
  adsEnabled: {
    name: "광고",
    desc: "허용된 화면에 '광고' 표시와 함께 광고를 실어요.",
    prerequisites: ["월 이용자 5천 명 이상", "광고·협찬 표시 정책 게시", "긴급·신고·건강·보험·지도 화면 제외 확인", "건강·보험·위치·신고 정보를 광고 대상 선정에 쓰지 않는지 확인"],
  },
};

function FlagItem({ flag, isAdmin, onChanged }: { flag: FeatureFlag; isAdmin: boolean; onChanged: () => void }) {
  const { user } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const info = INFO[flag.key] ?? { name: flag.key, desc: "", prerequisites: [] };
  const target = !flag.enabled;

  const apply = async () => {
    if (!user || !isAdmin) return;
    if (!reason.trim()) {
      setReasonError("바꾸는 이유를 적어 주세요. 감사로그에 남아요.");
      return;
    }
    setReasonError(null);
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      await getRepo().update("feature_flags", flag.id, { enabled: target, approved_by: user.id, approved_at: new Date().toISOString() });
      await audit("flag_change", "feature_flags", flag.id, { key: flag.key, enabled: target, reason: reason.trim() });
      setSaved(target ? "켰어요." : "껐어요.");
      setConfirming(false);
      setReason("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="li" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">{info.name}</h2>
        <Badge tone={flag.enabled ? "danger" : "neutral"}>{flag.enabled ? "켜짐" : "꺼짐"}</Badge>
      </div>
      <p className="break-all font-mono text-xs text-muted">{flag.key}</p>
      {info.desc ? <p>{info.desc}</p> : null}
      {info.prerequisites.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold">켜기 전에 끝나 있어야 하는 것</h3>
          <ul className="list-disc pl-5 text-sm">
            {info.prerequisites.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-sm text-muted">{flag.approved_at ? `마지막 변경 ${formatDate(flag.approved_at)} · 승인자 ${flag.approved_by ?? "기록 없음"}` : "아직 변경한 적이 없어요."}</p>

      {confirming ? (
        <form
          className="flex flex-col gap-3 rounded-[12px] bg-tint p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void apply();
          }}
        >
          <p className="font-medium">
            &apos;{info.name}&apos; 기능을 {target ? "켤까요" : "끌까요"}? {target ? "위 조건이 모두 끝났는지 다시 확인해 주세요." : ""}
          </p>
          <Field id={`reason-${flag.id}`} label="변경 이유" hint="예: 2026-12-01 법률 검토 완료, 결제대행사 계약 체결" value={reason} onChange={(e) => setReason(e.target.value)} error={reasonError} maxLength={300} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant={target ? "danger" : "primary"} disabled={busy}>
              {busy ? "저장하는 중이에요" : target ? "확인했고, 켜요" : "꺼요"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setReasonError(null);
              }}
            >
              취소
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="ghost" className="self-start" disabled={!isAdmin} onClick={() => setConfirming(true)}>
          {flag.enabled ? "끄기" : "켜기"}
        </Button>
      )}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {saved ? <p role="status" className="text-sm text-safe">{saved}</p> : null}
    </Card>
  );
}

export default function AdminFlagsPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const state = useAsync(() => getRepo().list("feature_flags", { order: { column: "created_at" } }), []);
  return (
    <>
      <PageHeader title="기능 플래그" description="법률·운영 검토가 필요한 기능을 여기서만 켜고 꺼요." />
      <Notice tone="danger">결제·보험 연계·정밀 위치 저장·공개 후기·광고는 법률·운영 검토 후에만 켜야 해요. 바꾼 사람과 이유가 감사로그에 남아요.</Notice>
      {!isAdmin ? <p className="text-sm text-muted">기능 플래그는 관리자만 바꿀 수 있어요.</p> : null}
      {state.loading && !state.data ? (
        <Loading />
      ) : state.error ? (
        <ErrorState onRetry={state.reload} />
      ) : !state.data || state.data.length === 0 ? (
        <EmptyState title="등록된 기능 플래그가 없어요" description="플래그가 없으면 모든 기능이 꺼진 상태로 동작해요." />
      ) : (
        <ul className="flex flex-col gap-4">
          {state.data.map((f) => (
            <FlagItem key={f.id} flag={f} isAdmin={isAdmin} onChanged={state.reload} />
          ))}
        </ul>
      )}
    </>
  );
}
