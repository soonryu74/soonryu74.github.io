import Link from "next/link";
import { getStore } from "@/lib/session";
import { getActivePet, missingConsents } from "@/lib/guard";
import { isVisibleToday, PRIORITY_ORDER } from "@/lib/rules";
import { kstDayRange } from "@/lib/dates";
import { PetSwitcher } from "@/components/pets/pet-switcher";
import type { CareTask, Pet } from "@/lib/types";
import { newCountsForWatches, watchQuery } from "@/lib/rescue/watches";

export default async function Home({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const sp = await searchParams;
  const store = await getStore();
  let pets: Pet[] = [];
  let active: Pet | null = null;
  let tasks: CareTask[] = [];
  let needsConsent = false;
  let rescueAlerts: Awaited<ReturnType<typeof newCountsForWatches>> = [];
  if (store.user) {
    needsConsent = (await missingConsents(store)).length > 0;
    if (!needsConsent) {
      ({ pets, active } = await getActivePet(store));
      if (active) {
        const now = new Date();
        const { start, end } = kstDayRange(now);
        tasks = (await store.listTasks(active.id, { from: start.toISOString(), to: end.toISOString() }))
          .filter((t) => isVisibleToday(t, now) && t.status !== "done")
          .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))
          .slice(0, 3);
      }
      rescueAlerts = (await newCountsForWatches(store)).filter((a) => a.newCount > 0);
    }
  }
  return (
    <div className="space-y-4">
      {sp.account === "deleted" && <p role="status" className="card bg-[#DCFCE7] text-[#14532D]">탈퇴가 완료됐어요. 그동안 함께해 주셔서 고마워요.</p>}
      {sp.account === "requested" && <p role="status" className="card bg-[#FEF3C7] text-[#78350F]">반려동물 데이터는 삭제했고, 계정 삭제 요청을 접수했어요. 운영자가 확인 후 계정을 완전히 삭제해요.</p>}

      {/* 1. 반려동물 전환·알림 */}
      <section aria-labelledby="hello-h">
        <h1 id="hello-h" className="h1">{active ? `${active.name}와(과) 함께하는 오늘` : "오늘 할 일부터, 위급한 순간까지"}</h1>
        {!store.user && <p className="text-muted mt-1">반려견·반려묘 보호자를 위한 안전 서비스. 긴급 도움과 신고·지도·감염병 정보는 로그인 없이 쓸 수 있어요.</p>}
        {store.user && needsConsent && <p className="mt-2"><Link href="/consent" className="btn btn-primary">약관 확인하고 시작하기</Link></p>}
        {active && <div className="mt-2"><PetSwitcher pets={pets} activeId={active.id} next="/" /></div>}
      </section>

      {rescueAlerts.length > 0 && (
        <section aria-labelledby="rescue-alert-h" className="card border-2 border-danger">
          <h2 id="rescue-alert-h" className="h3">🔔 관심 조건에 새 구조 공고가 있어요</h2>
          <ul className="mt-1">
            {rescueAlerts.map(({ watch, newCount }) => (
              <li key={watch.id}><Link className="link" href={`/lost?${watchQuery(watch)}`}>{watch.label} — 새 공고 {newCount}건</Link></li>
            ))}
          </ul>
        </section>
      )}

      {/* 2. 긴급 도움 */}
      <Link href="/emergency" className="block rounded-2xl bg-danger text-white p-4 min-h-[72px] hover:bg-danger-dark">
        <span className="text-xl font-extrabold"><span aria-hidden="true">🚨</span> 긴급 도움</span>
        <span className="block text-sm opacity-95">숨쉬기 힘들어함·경련·중독 의심 — 지금 할 일과 병원 전화</span>
      </Link>

      {/* 3. 오늘 할 일 3개 */}
      <section aria-labelledby="today-h" className="card">
        <div className="flex items-center justify-between">
          <h2 id="today-h" className="h2">오늘 할 일</h2>
          {active && <Link href="/today" className="link text-sm">전체 보기</Link>}
        </div>
        {!store.user ? (
          <p className="text-muted mt-1">로그인하고 우리 아이를 등록하면 종·나이에 맞는 할 일을 알려드려요. <Link href="/login?next=/onboarding" className="link">시작하기</Link></p>
        ) : !active ? (
          <p className="text-muted mt-1">아직 등록한 아이가 없어요. <Link href="/onboarding" className="link">등록하기</Link></p>
        ) : tasks.length === 0 ? (
          <p className="text-muted mt-1">오늘 남은 할 일이 없어요.</p>
        ) : (
          <ul className="mt-2 space-y-1">{tasks.map((t) => <li key={t.id}><Link href="/today" className="flex items-center gap-2 min-h-[44px] hover:underline"><span aria-hidden="true" className="size-5 rounded-full border-2 border-slate-400" />{t.title}</Link></li>)}</ul>
        )}
      </section>

      {/* 4. 가까운 곳 */}
      <section aria-labelledby="near-h" className="card">
        <h2 id="near-h" className="h2 mb-2">가까운 곳</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link className="btn btn-outline" href="/map?type=animal_hospital">🏥 동물병원</Link>
          <Link className="btn btn-outline" href="/map?type=animal_pharmacy">💊 동물약국</Link>
          <Link className="btn btn-outline" href="/map?type=shelter">🏠 보호센터</Link>
          <Link className="btn btn-outline" href="/map?type=pet_cafe&type=park&type=playground">🌳 동반 장소</Link>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* 5. 보험 */}
        <Link href="/insurance" className="card block hover:border-primary">
          <h2 className="h2">🧾 보험·비용</h2>
          <p className="text-sm text-muted">내 보험 약관 정리, 진료 유형별 확인, 청구 서류 체크</p>
        </Link>
        {/* 6. 신고 */}
        <Link href="/reports" className="card block hover:border-primary">
          <h2 className="h2">📣 분실·발견·학대 신고</h2>
          <p className="text-sm text-muted">공식 기관 번호와 신고 준비 메모</p>
        </Link>
      </div>
      <Link href="/lost" className="card block hover:border-primary">
        <h2 className="h2">🔎 실종·구조동물 찾기</h2>
        <p className="text-sm text-muted">전국 보호소의 새 구조 공고를 동네·종류·특징으로 모아 보고, 새로 올라오면 알려드려요</p>
      </Link>

      {/* 7. 건강·인수공통감염병 */}
      <Link href="/health/zoonoses" className="card block hover:border-primary">
        <h2 className="h2">🦠 사람과 동물 모두의 건강</h2>
        <p className="text-sm text-muted">진드기 계절 SFTS 예방, 공수병, 개 브루셀라증, 톡소포자충증</p>
      </Link>
    </div>
  );
}
