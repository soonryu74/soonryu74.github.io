import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/guard";
import { AuthRequired } from "@/components/ui";
import { formatKst, kstDate } from "@/lib/dates";
import { daysBetween, summarizeCare } from "@/lib/memorial";
import { LetterDelete, LetterForm, ReminderToggle, UndoPassed } from "../memorial-forms";

export const metadata: Metadata = { title: "함께한 날들" };

export default async function MemorialPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const m = await requireMember(`/pets/${petId}/memorial`);
  if (!m) return <AuthRequired what="추모 페이지" next={`/pets/${petId}/memorial`} />;
  if (!/^[0-9a-f-]{36}$/i.test(petId)) notFound();
  const pet = await m.store.getPet(petId);
  if (!pet) notFound();
  if (!pet.passed_at) redirect(`/pets/${petId}`);

  const [events, docs, letters] = await Promise.all([m.store.listEvents(petId, 1000), m.store.listDocuments(petId), m.store.listLetters(petId)]);
  const photos = docs.filter((d) => d.mime_type.startsWith("image/")).slice(0, 12);
  const care = summarizeCare(events);
  const start = pet.birth_date ?? pet.created_at.slice(0, 10);
  const together = daysBetween(start, pet.passed_at);
  const weights = events.filter((e) => e.event_type === "weight").sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

  return (
    <article className="space-y-4 max-w-2xl">
      <header className="card text-center py-6 bg-gradient-to-b from-[#F0FDFA] to-white">
        <p aria-hidden="true" className="text-4xl">{pet.species === "dog" ? "🐶" : "🐱"}</p>
        <h1 className="h1 mt-1">{pet.name}</h1>
        <p className="text-muted">{pet.birth_date ? formatKst(pet.birth_date) : "펫안심365 등록일 " + formatKst(pet.created_at)} ~ {formatKst(pet.passed_at)}</p>
        {together && <p className="mt-2 text-lg">함께한 날 <strong>{together.toLocaleString("ko-KR")}일</strong>{!pet.birth_date && <span className="block text-xs text-muted">(생일을 몰라 등록한 날부터 셌어요)</span>}</p>}
      </header>

      <section className="card" aria-labelledby="care-h">
        <h2 id="care-h" className="h2 mb-2">기록에 남은 돌봄</h2>
        {care.totalRecords === 0 ? (
          <p className="text-muted">펫안심365에 남은 기록은 없지만, 기록되지 않은 날들에도 곁에서 챙겨 준 시간이 있었을 거예요.</p>
        ) : (
          <>
            <p>{formatKst(care.firstRecord)}부터 {formatKst(care.lastRecord)}까지, {pet.name}를(을) 위해 남긴 기록이에요.</p>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-muted">챙긴 할 일</dt><dd className="text-xl font-extrabold">{care.tasksDone}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-muted">진료·검사</dt><dd className="text-xl font-extrabold">{care.visits}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-muted">체중 기록</dt><dd className="text-xl font-extrabold">{care.weights}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-muted">관찰 메모</dt><dd className="text-xl font-extrabold">{care.observations}</dd></div>
            </dl>
            {care.topTasks.length > 0 && (
              <div className="mt-3">
                <h3 className="h3">자주 챙겨 준 일</h3>
                <ul className="mt-1">{care.topTasks.map((t) => <li key={t.title} className="flex justify-between border-b border-line py-1"><span>{t.title}</span><span className="text-muted">{t.count}번</span></li>)}</ul>
              </div>
            )}
            {weights.length > 1 && <p className="text-sm text-muted mt-2">처음 기록한 체중 {String((weights[0].value_json as { weight_kg?: number }).weight_kg)}kg · 마지막 {String((weights.at(-1)!.value_json as { weight_kg?: number }).weight_kg)}kg</p>}
          </>
        )}
      </section>

      <section className="card" aria-labelledby="photo-h">
        <h2 id="photo-h" className="h2 mb-2">사진</h2>
        {photos.length === 0 ? (
          <p className="text-muted">아직 올린 사진이 없어요. <Link className="link" href={`/records?pet=${pet.id}#documents`}>기록 → 비공개 문서</Link>에서 &lsquo;사진&rsquo;으로 올리면 여기에 모여요. 나만 볼 수 있어요.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((d) => (
              <li key={d.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/documents/${d.id}`} alt={`${pet.name} 사진 ${formatKst(d.created_at)}`} loading="lazy" className="aspect-square w-full rounded-xl object-cover bg-slate-100" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="letter-h">
        <h2 id="letter-h" className="h2 mb-1">편지</h2>
        <p className="hint mb-2">다 하지 못한 말, 고마웠던 순간을 적어 보세요. 나만 볼 수 있어요.</p>
        <LetterForm petId={pet.id} name={pet.name} />
        {letters.length > 0 && (
          <ul className="mt-4 space-y-3">
            {letters.map((l) => (
              <li key={l.id} className="rounded-xl bg-[#FFFBEB] p-3">
                <p className="whitespace-pre-line break-words">{l.body}</p>
                <p className="text-xs text-muted mt-1 flex gap-3">{formatKst(l.created_at, true)} <LetterDelete petId={pet.id} id={l.id} /></p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-2" aria-labelledby="care-self-h">
        <h2 id="care-self-h" className="h2">나를 돌보기</h2>
        <p>&ldquo;더 잘해 줄 걸&rdquo; 하는 마음은 그만큼 사랑했다는 뜻이에요. 충분히 슬퍼할 시간을 갖고, 가족이나 같은 경험을 한 사람과 이야기를 나눠 보세요.</p>
        <ReminderToggle petId={pet.id} on={pet.memorial_reminders !== false} />
        <p className="text-sm"><Link className="link" href="/funeral">장례·등록 말소 안내</Link> · 마음이 너무 힘들면 <a className="link font-bold" href="tel:15770199">정신건강 위기상담 1577-0199</a> · <a className="link font-bold" href="tel:109">자살예방 상담 109</a> (24시간)</p>
      </section>

      <p className="text-center"><UndoPassed petId={pet.id} /> <span className="text-xs text-muted">· 기준일 {kstDate()}</span></p>
    </article>
  );
}
