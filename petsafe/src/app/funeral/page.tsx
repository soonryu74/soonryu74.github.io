import type { Metadata } from "next";
import Link from "next/link";
import data from "@/content/funeral-businesses.json";
import { findByName, type FuneralBusiness } from "@/lib/funeral/parse";
import { formatKst } from "@/lib/dates";
import { telHref } from "@/lib/contacts";
import { kakaoSearchUrl } from "@/lib/geo";

export const metadata: Metadata = { title: "반려동물 장례 도움" };

const LIST = data.items as FuneralBusiness[];
const SIDOS = [...new Set(LIST.map((b) => b.sido))].sort((a, b) => a.localeCompare(b, "ko"));
const FACILITIES = ["장례", "화장", "봉안", "건조", "수분해"];
const LAW = "https://www.easylaw.go.kr/CSP/OnhunqueansInfoRetrieve.laf?onhunqnaAstSeq=87&onhunqueSeq=6157";

export default async function FuneralPage({ searchParams }: { searchParams: Promise<{ sido?: string; name?: string; f?: string }> }) {
  const sp = await searchParams;
  const sido = SIDOS.includes(sp.sido ?? "") ? sp.sido! : "";
  const facility = FACILITIES.includes(sp.f ?? "") ? sp.f! : "";
  const name = (sp.name ?? "").trim().slice(0, 40);
  const nameMatches = name ? findByName(LIST, name) : null;
  const list = LIST.filter((b) => (!sido || b.sido === sido) && (!facility || b.facilities.includes(facility)));
  const counts = SIDOS.map((s) => ({ sido: s, n: LIST.filter((b) => b.sido === s).length }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h1">반려동물 장례 도움</h1>
        <p className="text-muted mt-1">함께해 줘서 고마웠던 아이를 보내는 일이에요. 서두르지 않아도 괜찮아요. 합법 업체인지, 무엇을 물어볼지부터 차근차근 도와드릴게요.</p>
      </div>

      <section className="card" aria-labelledby="now-h">
        <h2 id="now-h" className="h2 mb-2">지금 할 수 있는 일</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>몸을 깨끗한 수건이나 담요로 감싸 서늘한 곳에 두세요. 장례 결정은 가족과 이야기한 뒤에 해도 돼요.</li>
          <li>합법적인 방법은 세 가지예요: <strong>허가받은 동물장묘업체</strong>에서 화장 등, <strong>동물병원</strong>에 처리 위탁, 지자체 기준에 따른 <strong>생활폐기물 배출</strong>.</li>
          <li><strong>땅에 묻는 것은 내 땅이라도 불법</strong>이에요(폐기물관리법).</li>
          <li>동물등록을 했다면 떠난 날부터 <strong>30일 안에 등록 말소 신고</strong>를 해야 해요.</li>
        </ol>
        <p className="text-xs text-muted mt-2">근거: <a className="link" href={LAW} target="_blank" rel="noopener noreferrer">찾기쉬운 생활법령정보 – 반려동물 사체처리 방법<span className="sr-only"> (새 창)</span></a></p>
      </section>

      <section className="card" aria-labelledby="check-h">
        <h2 id="check-h" className="h2 mb-1">이 업체, 허가받은 곳인가요?</h2>
        <p className="hint mb-2">업체 이름을 넣으면 국가동물보호정보시스템에 게시된 동물장묘업 목록({data.total}곳)에 있는지 확인해요.</p>
        <form method="get" className="flex flex-wrap gap-2 items-end" role="search" aria-label="장묘업체 이름 확인">
          <div className="field flex-1 min-w-[12rem]">
            <label htmlFor="name" className="label">업체 이름</label>
            <input id="name" name="name" className="input" defaultValue={name} maxLength={40} placeholder="예: ○○ 반려동물 장례식장" />
          </div>
          <button type="submit" className="btn btn-primary">확인</button>
        </form>
        {nameMatches && (
          <div className="mt-3" role="status" aria-live="polite">
            {nameMatches.length > 0 ? (
              <>
                <p className="font-bold text-[#14532D]">✓ 공식 목록에서 {nameMatches.length}곳을 찾았어요.</p>
                <ul className="mt-2 space-y-2">{nameMatches.map((b) => <BusinessCard key={b.no + b.name} b={b} />)}</ul>
              </>
            ) : (
              <div className="rounded-xl border-2 border-[#FCA5A5] bg-[#FEF2F2] p-3 text-[#7F1D1D]">
                <p className="font-bold">&lsquo;{name}&rsquo;은(는) 공식 목록에서 찾지 못했어요.</p>
                <p className="text-sm mt-1">이름이 조금 다를 수 있어요. 업체에 &lsquo;동물장묘업 허가번호&rsquo;를 물어보고, 확실하지 않으면 업체 소재지 시·군·구청 동물보호 담당 부서에 확인하세요. 허가 없는 곳에서는 다른 아이의 유골과 섞이는 등의 피해가 생길 수 있어요.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="list-h" className="space-y-3">
        <h2 id="list-h" className="h2">지역별 허가 업체</h2>
        <form method="get" className="card grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div className="field">
            <label htmlFor="sido" className="label">시·도</label>
            <select id="sido" name="sido" className="input" defaultValue={sido}>
              <option value="">전국</option>
              {counts.map((c) => <option key={c.sido} value={c.sido}>{c.sido} ({c.n})</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f" className="label">필요한 시설</label>
            <select id="f" name="f" className="input" defaultValue={facility}>
              <option value="">전체</option>
              {FACILITIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">보기</button>
        </form>
        {sido === "서울특별시" && <p className="card text-sm">서울에는 허가 업체가 1곳뿐이에요. 가까운 경기도 업체도 함께 살펴보세요.</p>}
        {list.length === 0 ? (
          <div className="card text-center py-6"><p className="h3">조건에 맞는 업체가 없어요</p><p className="text-muted">시설 조건을 빼거나 가까운 시·도를 골라 보세요.</p></div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">{list.map((b) => <BusinessCard key={b.no + b.name} b={b} />)}</ul>
        )}
        <p className="text-xs text-muted">
          출처: <a className="link" href={data.sourceUrl} target="_blank" rel="noopener noreferrer">{data.source}<span className="sr-only"> (새 창)</span></a> · 가져온 날 {formatKst(data.fetchedAt)} · {data.notice} 가격·운영시간은 업체마다 달라 표시하지 않아요. 광고·유료 노출은 없어요.
        </p>
      </section>

      <section className="card" aria-labelledby="ask-h">
        <h2 id="ask-h" className="h2 mb-2">전화할 때 물어볼 것</h2>
        <ul className="space-y-1 list-disc pl-5">
          <li>동물장묘업 허가번호가 무엇인가요?</li>
          <li>개별 화장인가요? 화장하는 모습을 볼 수 있나요?</li>
          <li>기본 비용과, 추가 상품까지 합친 <strong>총액</strong>은 얼마인가요? (체중에 따라 달라요)</li>
          <li>유골은 어떤 형태로 언제 받나요? 봉안(보관)은 따로 비용이 드나요?</li>
          <li>추가 상품을 권하면 거절해도 되나요? 영수증을 받을 수 있나요?</li>
        </ul>
        <p className="hint mt-2">슬플 때는 판단이 흐려지기 쉬워요. 가족 한 사람이 통화 내용을 메모해 두면 도움이 돼요.</p>
      </section>

      <section className="card border-l-4 border-primary" aria-labelledby="heart-h">
        <h2 id="heart-h" className="h2 mb-2">마음 돌보기</h2>
        <p>많은 보호자가 &ldquo;내가 더 잘해 줬어야 했는데&rdquo; 하는 자책을 겪어요. 2025년 조사에서 반려동물을 떠나보낸 사람의 71.5%가 자책과 후회를 느꼈다고 답했어요.</p>
        <p className="mt-2">같은 조사에서 도움이 됐다고 꼽은 것은 이랬어요.</p>
        <ul className="list-disc pl-5 mt-1">
          <li>충분히 슬퍼할 시간을 갖는 것</li>
          <li>가족·지인과 마음을 나누는 것</li>
          <li>같은 경험을 한 사람과 이야기하는 것</li>
        </ul>
        <p className="mt-2">사진과 기록을 모아 함께한 날들을 돌아보는 것도 좋은 방법이에요. 펫안심365의 <Link className="link" href="/records">건강 기록</Link>에는 그동안 챙겨 준 일들이 남아 있어요.</p>
        <p className="mt-3 text-sm rounded-xl bg-slate-50 p-3">마음이 너무 힘들어 일상이 어렵다면 혼자 견디지 마세요. <a className="link font-bold" href="tel:15770199">정신건강 위기상담 1577-0199</a> · <a className="link font-bold" href="tel:109">자살예방 상담 109</a> (24시간)</p>
        <p className="text-xs text-muted mt-2">출처: <a className="link" href="https://kbthink.com/investment/deepdive/research/250629-7.html" target="_blank" rel="noopener noreferrer">KB금융지주 경영연구소, 2025 반려가구의 펫로스 관리<span className="sr-only"> (새 창)</span></a></p>
      </section>
    </div>
  );
}

function BusinessCard({ b }: { b: FuneralBusiness }) {
  return (
    <li className="card">
      <div className="flex flex-wrap gap-1">
        <span className="badge badge-ok">✓ 공식 목록 게시</span>
        {b.facilities.map((f) => <span key={f} className="badge badge-muted">{f}</span>)}
      </div>
      <h3 className="h3 mt-1 break-words">{b.name}</h3>
      <p className="text-sm text-muted break-words">{b.address}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {b.phone ? <a className="btn btn-primary btn-sm" href={telHref(b.phone)}>📞 {b.phone}</a> : <span className="btn btn-outline btn-sm" aria-disabled="true">전화번호 없음</span>}
        <a className="btn btn-outline btn-sm" href={kakaoSearchUrl(`${b.name} ${b.address}`)} target="_blank" rel="noopener noreferrer">지도<span className="sr-only"> (카카오맵 새 창)</span></a>
        {b.homepage && <a className="btn btn-outline btn-sm" href={b.homepage} target="_blank" rel="noopener noreferrer nofollow">홈페이지<span className="sr-only"> (새 창)</span></a>}
      </div>
    </li>
  );
}
