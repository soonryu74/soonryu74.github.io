import type { Metadata } from "next";
import { PageHeader, Disclaimer } from "@/components/ui";
import { getStore } from "@/lib/session";
import { resolveFlags } from "@/lib/flags";

export const metadata: Metadata = { title: "파트너" };

const PLANS = [
  { name: "Basic", price: "무료", items: ["공공데이터 기반 기본 프로필", "정보 수정 요청"] },
  { name: "Pro", price: "월 59,000원 (예정)", items: ["사업자 확인 배지", "서비스·운영시간 직접 관리", "보호자 문의 받기", "후기 응답·통계"] },
  { name: "Growth", price: "월 149,000원 (예정)", items: ["고객관리·쿠폰", "여러 지점", "상세 분석"] },
];

export default async function PartnerPage() {
  const store = await getStore();
  const flags = resolveFlags(await store.getFlags().catch(() => []));
  return (
    <div className="space-y-4">
      <PageHeader title="파트너" lead="동물병원·미용·위탁·카페 등 반려동물 업체를 위한 검증 프로필." />
      <Disclaimer>지도 순위는 판매하지 않아요. 유료 노출이 생기면 &lsquo;광고&rsquo;로 표시하고 자연 검색과 분리해요. 의료비 연동 수수료는 받지 않아요.</Disclaimer>
      <ul className="grid md:grid-cols-3 gap-3">
        {PLANS.map((p) => (
          <li key={p.name} className="card">
            <h2 className="h2">{p.name}</h2>
            <p className="font-bold text-primary">{p.price}</p>
            <ul className="list-disc pl-5 mt-2 text-sm">{p.items.map((x) => <li key={x}>{x}</li>)}</ul>
          </li>
        ))}
      </ul>
      <div className="card">
        <p className="h3">입점 신청</p>
        <p className="text-muted text-sm">파트너 신청·검증 절차는 사업자 정보와 계약서 확정 후 열려요.{!flags.partnerSubscriptionsEnabled && " 유료 구독은 법무 검토 전까지 잠겨 있어요."}</p>
        <button type="button" className="btn btn-outline mt-2" disabled aria-disabled="true">입점 신청 (준비 중)</button>
      </div>
    </div>
  );
}
