import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/guard";
import { AuthRequired, PageHeader } from "@/components/ui";
import { formatKst } from "@/lib/dates";
import { PetEditForm, PetDeleteForm, ConditionForm, ConditionRemove } from "./pet-forms";
import { MarkPassedForm } from "./memorial-forms";
import { kstDate } from "@/lib/dates";
import { Timeline } from "@/components/records/timeline";

export const metadata: Metadata = { title: "우리 아이 상세" };

const COND: Record<string, string> = { disease: "질환", allergy: "알레르기", medication: "투약", other: "기타" };

export default async function PetDetailPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const m = await requireMember(`/pets/${petId}`);
  if (!m) return <AuthRequired what="반려동물 정보" next={`/pets/${petId}`} />;
  if (!/^[0-9a-f-]{36}$/i.test(petId)) notFound();
  // 다른 사용자의 pet_id 는 RLS/소유자 필터로 null → 404 (존재 여부도 노출하지 않음)
  const pet = await m.store.getPet(petId);
  if (!pet) notFound();
  const [conditions, events, documents] = await Promise.all([
    m.store.listConditions(petId), m.store.listEvents(petId, 20), m.store.listDocuments(petId),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title={pet.name} lead={`${pet.species === "dog" ? "반려견" : "반려묘"} · 등록일 ${formatKst(pet.created_at)}`}>
        <Link href="/pets" className="btn btn-outline btn-sm">목록</Link>
      </PageHeader>

      {pet.passed_at && (
        <p className="card border-l-4 border-primary">{pet.name}는(은) {formatKst(pet.passed_at)}에 떠났어요. <Link className="link font-bold" href={`/pets/${pet.id}/memorial`}>함께한 날들 보기</Link></p>
      )}

      <section aria-labelledby="profile-h" className="card">
        <h2 id="profile-h" className="h2 mb-3">프로필</h2>
        <PetEditForm pet={pet} />
      </section>

      <section aria-labelledby="cond-h" className="card">
        <h2 id="cond-h" className="h2 mb-2">질환·알레르기·투약 메모</h2>
        <p className="hint mb-2">수의사에게 받은 내용을 기록하는 곳이에요. 펫안심365는 진단이나 약을 제안하지 않아요.</p>
        {conditions.length === 0 ? <p className="text-muted">기록된 내용이 없어요.</p> : (
          <ul className="divide-y divide-line">
            {conditions.map((c) => (
              <li key={c.id} className="py-2 flex items-center gap-2">
                <span className="badge badge-muted">{COND[c.type]}</span>
                <span className="flex-1 break-words">{c.name}{c.note ? <span className="text-muted text-sm"> — {c.note}</span> : null}</span>
                <ConditionRemove petId={pet.id} conditionId={c.id} name={c.name} />
              </li>
            ))}
          </ul>
        )}
        <ConditionForm petId={pet.id} />
      </section>

      <section aria-labelledby="tl-h" className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 id="tl-h" className="h2">건강 타임라인</h2>
          <Link href="/records" className="link text-sm">기록 추가</Link>
        </div>
        <Timeline events={events} />
      </section>

      <section aria-labelledby="doc-h" className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 id="doc-h" className="h2">비공개 문서</h2>
          <Link href="/records#documents" className="link text-sm">문서 관리</Link>
        </div>
        <p className="text-muted">{documents.length ? `${documents.length}개 저장됨 (본인만 열람 가능)` : "저장된 문서가 없어요."}</p>
      </section>

      <section aria-labelledby="family-h" className="card">
        <h2 id="family-h" className="h2 mb-1">가족 공동관리</h2>
        <p className="text-muted">가족 초대 기능은 준비 중이에요. 데이터베이스 권한 구조(읽기·쓰기 공동보호자)는 이미 마련돼 있어요.</p>
        <button type="button" className="btn btn-outline btn-sm mt-2" disabled aria-disabled="true">가족 초대 (준비 중)</button>
      </section>

      {!pet.passed_at && (
        <section aria-labelledby="farewell-h" className="card">
          <h2 id="farewell-h" className="h2 mb-1">이별</h2>
          <p className="text-muted text-sm">떠나보낸 날을 남기면 돌봄 알림을 멈추고, 기록은 그대로 두어 추모 페이지로 만들어 드려요.</p>
          <MarkPassedForm petId={pet.id} name={pet.name} today={kstDate()} />
        </section>
      )}

      <section aria-labelledby="del-h" className="card border-[#FCA5A5]">
        <h2 id="del-h" className="h2 mb-1 text-danger">삭제</h2>
        <p className="text-muted text-sm">삭제하면 이 아이의 할 일·건강 기록·문서 파일·보험 메모가 모두 영구 삭제되며 되돌릴 수 없어요. 필요하면 먼저 <Link className="link" href="/account">내 데이터 내려받기</Link>를 하세요.</p>
        <PetDeleteForm pet={pet} />
      </section>
    </div>
  );
}
