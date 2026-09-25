import type { Metadata } from "next";
import Link from "next/link";
import { getActivePet, requireMember } from "@/lib/guard";
import { AuthRequired, EmptyState, PageHeader } from "@/components/ui";
import { ageLabel } from "@/lib/dates";
import { selectPetAction } from "@/app/actions/pets";

export const metadata: Metadata = { title: "우리 아이" };

const REG: Record<string, string> = { registered: "동물등록 완료", not_registered: "동물등록 필요", unknown: "등록 여부 모름", not_applicable: "등록 해당 없음" };

export default async function PetsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const sp = await searchParams;
  const m = await requireMember("/pets");
  if (!m) return <AuthRequired what="우리 아이 목록" next="/pets" />;
  const { pets, active } = await getActivePet(m.store);
  return (
    <div>
      <PageHeader title="우리 아이" lead="여러 마리를 등록하고 전환할 수 있어요.">
        <Link href="/onboarding" className="btn btn-primary">+ 추가하기</Link>
      </PageHeader>
      {sp.deleted && <p role="status" className="card mb-3 bg-[#DCFCE7] text-[#14532D]">삭제했어요.</p>}
      {pets.length === 0 ? (
        <EmptyState title="아직 등록한 아이가 없어요" body="한 마리를 등록하면 오늘 할 일이 만들어져요." action={<Link href="/onboarding" className="btn btn-primary">등록하기</Link>} />
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {pets.map((p) => (
            <li key={p.id} className={`card ${p.id === active?.id ? "border-primary border-2" : ""}`}>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="text-3xl">{p.species === "dog" ? "🐶" : "🐱"}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="h2 break-words">{p.name}</h2>
                  <p className="text-sm text-muted">{p.species === "dog" ? "반려견" : "반려묘"} · {ageLabel(p.birth_date, p.estimated_birth)}{p.weight_kg ? ` · ${p.weight_kg}kg` : ""}</p>
                  <p className="mt-1"><span className={`badge ${p.registration_status === "not_registered" ? "badge-warn" : "badge-muted"}`}>{REG[p.registration_status]}</span></p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/pets/${p.id}`} className="btn btn-outline btn-sm flex-1">상세·수정</Link>
                {p.id === active?.id ? (
                  <span className="btn btn-sm flex-1 bg-[#E6F4F1] text-primary" aria-current="true">선택됨</span>
                ) : (
                  <form action={selectPetAction} className="flex-1">
                    <input type="hidden" name="pet_id" value={p.id} />
                    <input type="hidden" name="next" value="/today" />
                    <button className="btn btn-primary btn-sm w-full" type="submit">이 아이로 전환</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
