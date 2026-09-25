import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/lib/session";
import { listSido, listSigungu, rescueApiConfigured, searchRescue } from "@/lib/rescue/client";
import { kstDate, formatKst } from "@/lib/dates";
import { PageHeader, ErrorNote } from "@/components/ui";
import { RescueResults } from "@/components/rescue/rescue-results";
import { AutoSubmitSelect, SaveWatchForm, WatchList, MarkSeen } from "@/components/rescue/rescue-forms";
import type { RescueSpecies } from "@/lib/rescue/normalize";

export const metadata: Metadata = { title: "실종·구조동물 찾기" };

type SP = { sido?: string; sigungu?: string; species?: string; sex?: string; q?: string; days?: string; notice?: string; watch?: string };

export default async function LostPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const species = (["dog", "cat", "other"].includes(sp.species ?? "") ? sp.species : "") as RescueSpecies | "";
  const sex = (sp.sex === "M" || sp.sex === "F" ? sp.sex : "") as "M" | "F" | "";
  const days = [7, 14, 30].includes(Number(sp.days)) ? Number(sp.days) : 14;
  const keyword = (sp.q ?? "").trim().slice(0, 60);
  const sido = (sp.sido ?? "").slice(0, 20);
  const sigungu = (sp.sigungu ?? "").slice(0, 20);

  const store = await getStore();
  const [sidoList, sigunguList, result, watches] = await Promise.all([
    listSido(),
    listSigungu(sido),
    searchRescue({ sido: sido || undefined, sigungu: sigungu || undefined, species, sex, keyword, days, state: sp.notice === "1" ? "notice" : "" }),
    store.user ? store.listRescueWatches().catch(() => []) : Promise.resolve([]),
  ]);
  const activeWatch = watches.find((w) => w.id === sp.watch) ?? null;
  const sidoName = sidoList.find((r) => r.code === sido)?.name ?? null;
  const sigunguName = sigunguList.find((r) => r.code === sigungu)?.name ?? null;

  return (
    <div className="space-y-4">
      <PageHeader title="실종·구조동물 찾기" lead="전국 보호소에 올라온 구조 공고를 한곳에서 모아 봐요. 공고 기간이 끝나기 전에 보호소에 전화하는 것이 가장 중요해요." />

      {result.mode === "example" && (
        <p role="note" className="card bg-[#FFFBEB] border-[#FCD34D] text-[#78350F] text-sm">
          <strong>예시 공고</strong> · 공공데이터 키를 설정하기 전이라 실제 동물이 아닌 예시를 보여줘요. 키를 넣으면 국가동물보호정보시스템 공고가 그대로 표시돼요.
        </p>
      )}

      <form method="get" className="card space-y-3" role="search" aria-label="구조 공고 검색">
        {activeWatch && <input type="hidden" name="watch" value={activeWatch.id} />}
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="field">
            <label htmlFor="sido" className="label">시·도</label>
            <AutoSubmitSelect id="sido" name="sido" defaultValue={sido} options={[{ code: "", name: "전국" }, ...sidoList]} />
          </div>
          <div className="field">
            <label htmlFor="sigungu" className="label">시·군·구</label>
            <select id="sigungu" name="sigungu" className="input" defaultValue={sigungu} disabled={!sido || sigunguList.length === 0}>
              <option value="">{sido ? "전체" : "시·도를 먼저 고르세요"}</option>
              {sigunguList.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="label mb-1">종류</legend>
          <div className="flex flex-wrap gap-2">
            {[["", "전체"], ["dog", "개"], ["cat", "고양이"], ["other", "기타"]].map(([v, l]) => (
              <label key={v} className="btn btn-outline btn-sm has-[:checked]:border-primary has-[:checked]:bg-[#E6F4F1]">
                <input type="radio" name="species" value={v} defaultChecked={species === v} className="accent-[#0F766E]" /> {l}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid sm:grid-cols-3 gap-2">
          <div className="field sm:col-span-2">
            <label htmlFor="q" className="label">색·품종·특징</label>
            <input id="q" name="q" className="input" defaultValue={keyword} maxLength={60} placeholder="예: 흰색 말티즈, 빨간 목줄" />
            <p className="hint">띄어 쓴 단어가 모두 들어간 공고만 보여줘요.</p>
          </div>
          <div className="field">
            <label htmlFor="days" className="label">기간</label>
            <select id="days" name="days" className="input" defaultValue={String(days)}>
              <option value="7">최근 7일</option><option value="14">최근 14일</option><option value="30">최근 30일</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">성별</legend>
            {[["", "성별 전체"], ["M", "수컷"], ["F", "암컷"]].map(([v, l]) => (
              <label key={v} className="flex items-center gap-1 text-sm min-h-[40px]"><input type="radio" name="sex" value={v} defaultChecked={sex === v} className="accent-[#0F766E]" /> {l}</label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm min-h-[40px]"><input type="checkbox" name="notice" value="1" defaultChecked={sp.notice === "1"} className="size-4 accent-[#0F766E]" /> 공고 중인 것만</label>
        </div>
        <button type="submit" className="btn btn-primary w-full sm:w-auto">찾기</button>
      </form>

      <section className="card" aria-labelledby="watch-h">
        <h2 id="watch-h" className="h3">새 공고 알림</h2>
        {store.user ? (
          <>
            <p className="hint">지금 조건을 저장하면, 새 공고가 올라왔을 때 홈 화면에 알려드려요. 최대 5개.</p>
            <SaveWatchForm sidoCode={sido} sidoName={sidoName} sigunguCode={sigungu} sigunguName={sigunguName} species={species} keyword={keyword} />
            <WatchList watches={watches} activeId={activeWatch?.id ?? null} />
          </>
        ) : (
          <p className="text-sm text-muted">이 기기에서는 지난번에 본 뒤 새로 올라온 공고에 &lsquo;새 공고&rsquo; 표시를 해 드려요. <Link className="link" href="/login?next=/lost">로그인</Link>하면 조건을 저장하고 홈에서 알림을 받을 수 있어요.</p>
        )}
      </section>

      <aside className="card border-l-4 border-primary text-sm" aria-label="잃어버렸을 때">
        <p className="font-bold">우리 아이를 잃어버렸다면</p>
        <ol className="list-decimal pl-5 mt-1 space-y-0.5">
          <li>동물등록을 했다면 <a className="link" href="https://www.animal.go.kr" target="_blank" rel="noopener noreferrer">국가동물보호정보시스템<span className="sr-only"> (새 창)</span></a>에 유실 신고를 해요.</li>
          <li>이 화면에서 잃어버린 동네와 특징으로 조건을 저장하고, 매일 새 공고를 확인해요.</li>
          <li>비슷한 아이가 보이면 사진만 믿지 말고 보호소에 바로 전화해요.</li>
        </ol>
        <Link className="link mt-1 inline-block" href="/reports?situation=my_pet_lost">신고 준비 체크리스트 보기</Link>
      </aside>

      {result.error ? (
        <ErrorNote message={`공고를 불러오지 못했어요 (${result.error}). 잠시 후 다시 시도하거나 국가동물보호정보시스템에서 직접 확인하세요.`} />
      ) : (
        <RescueResults
          animals={result.animals}
          today={kstDate()}
          storageKey={`petsafe365:lost-seen:${sido}|${sigungu}|${species}|${keyword}`}
          serverSince={activeWatch ? kstDate(new Date(activeWatch.last_seen_at)) : null}
        />
      )}
      {result.truncated && <p className="text-sm text-muted">공고가 많아 최근 500건만 모았어요. 지역이나 종류를 좁혀 보세요.</p>}
      {activeWatch && <MarkSeen watchId={activeWatch.id} />}

      <p className="text-xs text-muted">
        출처: 농림축산식품부 국가동물보호정보시스템 구조동물 조회 서비스(공공데이터포털, 이용허락 제한 없음) · {result.mode === "live" ? `조회 ${formatKst(result.fetchedAt, true)}, 30분마다 새로 받아요` : "예시 데이터"}
        {!rescueApiConfigured() && " · 운영자: PUBLIC_DATA_SERVICE_KEY 설정 필요"}
      </p>
    </div>
  );
}
