import type { Metadata } from "next";
import Link from "next/link";
import { HEALTH_CARDS } from "@/content/health-rules";
import { PageHeader, SourceLine, Disclaimer } from "@/components/ui";

export const metadata: Metadata = { title: "건강·예방" };

export default function HealthPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="건강·예방" lead="해야 할 것과 하지 말아야 할 것. 진단이 아니라 관찰과 기록, 병원 연결을 돕는 생활수칙이에요." />
      <Disclaimer>펫안심365는 진단명·약·용량·치료법을 제시하지 않아요. 걱정되는 변화가 있으면 동물병원에 문의하세요.</Disclaimer>
      <Link href="/health/zoonoses" className="card block hover:border-primary">
        <p className="h2">사람과 동물 모두의 건강 →</p>
        <p className="text-muted">SFTS, 공수병, 개 브루셀라증, 톡소포자충증 — 인수공통감염병 예방정보</p>
      </Link>
      <ul className="grid sm:grid-cols-2 gap-3">
        {HEALTH_CARDS.map((c) => (
          <li key={c.key} className="card flex flex-col">
            <h2 className="h2">{c.title}</h2>
            <div className="grid grid-cols-2 gap-2 mt-2 flex-1">
              <div className="rounded-xl bg-[#ECFDF5] p-2"><p className="font-bold text-[#065F46] text-sm">해야 할 것</p><ul className="list-disc pl-4 text-sm">{c.do.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div className="rounded-xl bg-[#FEF2F2] p-2"><p className="font-bold text-[#7F1D1D] text-sm">하지 말 것</p><ul className="list-disc pl-4 text-sm">{c.dont.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
            <Link href={c.action.href} className="btn btn-outline btn-sm mt-3">{c.action.label}</Link>
            <SourceLine organization={c.source.organization} url={c.source.url} reviewedAt={c.reviewedAt} />
          </li>
        ))}
      </ul>
    </div>
  );
}
