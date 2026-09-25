import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/session";
import { ZOONOSES } from "@/content/zoonoses";
import { formatKst } from "@/lib/dates";
import { Disclaimer } from "@/components/ui";

export const metadata: Metadata = { title: "인수공통감염병" };

const SECTIONS: { key: string; title: string; tone: "animal" | "human" | "neutral" | "warn" }[] = [
  { key: "animalSigns", title: "🐾 동물에게서 볼 수 있는 신호", tone: "animal" },
  { key: "humanSigns", title: "🧑 사람에게서 볼 수 있는 신호", tone: "human" },
  { key: "transmission", title: "어떻게 옮나요", tone: "neutral" },
  { key: "prevention", title: "예방하려면", tone: "neutral" },
  { key: "humanSeekCare", title: "🧑 사람이 의료기관에 갈 때", tone: "human" },
  { key: "animalSeekVet", title: "🐾 반려동물이 동물병원에 갈 때", tone: "animal" },
  { key: "dont", title: "하지 말아야 할 것", tone: "warn" },
];

const TONE = { animal: "border-l-4 border-primary", human: "border-l-4 border-secondary", neutral: "", warn: "border-l-4 border-danger" };

export default async function ZoonosisPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = ZOONOSES.find((z) => z.slug === slug);
  if (!base) notFound();
  const store = await getStore();
  const pub = await store.getPublicContent(slug).catch(() => null);
  if (!pub) {
    return (
      <div className="space-y-3">
        <Link href="/health/zoonoses" className="link text-sm">← 목록</Link>
        <h1 className="h1">{base.title}</h1>
        <p className="card"><span className="badge badge-warn">전문가 검수 중</span><span className="block mt-2">검수자·검토일이 기록되고 승인되기 전에는 내용을 공개하지 않아요. 아래 공식 자료를 확인해 주세요.</span></p>
        <ul className="card">{base.sources.map((s) => <li key={s.url}><a className="link" href={s.url} target="_blank" rel="noopener noreferrer">{s.organization}<span className="sr-only"> (새 창)</span></a></li>)}</ul>
      </div>
    );
  }
  const v = pub.version;
  return (
    <article className="space-y-4">
      <Link href="/health/zoonoses" className="link text-sm">← 목록</Link>
      <header>
        <h1 className="h1">{v.title}</h1>
        <p className="mt-1 text-lg">{v.summary}</p>
        <p className="text-sm text-muted mt-2">
          작성 {v.author_name ?? "미기록"} · 검수 {v.reviewer_name}{v.reviewer_credential ? ` (${v.reviewer_credential})` : ""} · 검토일 {formatKst(v.reviewed_at)}
          {v.next_review_at ? ` · 다음 검토 예정 ${formatKst(v.next_review_at)}` : ""} · 버전 {v.version}
        </p>
      </header>
      <Disclaimer>이 글은 예방 정보이며 진단이 아니에요. 증상이 있으면 사람은 의료기관, 반려동물은 동물병원에 문의하세요.</Disclaimer>
      <div className="grid md:grid-cols-2 gap-3">
        {SECTIONS.map((s) => {
          const items = v.body_json[s.key] ?? [];
          if (!items.length) return null;
          return (
            <section key={s.key} className={`card ${TONE[s.tone]}`} aria-labelledby={`sec-${s.key}`}>
              <h2 id={`sec-${s.key}`} className="h3">{s.title}</h2>
              <ul className="list-disc pl-5 mt-1">{items.map((x) => <li key={x}>{x}</li>)}</ul>
            </section>
          );
        })}
      </div>
      <section className="card" aria-labelledby="src-h">
        <h2 id="src-h" className="h3">공식 출처</h2>
        <ul className="mt-1">{v.source_json.map((s) => <li key={s.url}><a className="link" href={s.url} target="_blank" rel="noopener noreferrer">{s.organization}<span className="sr-only"> (새 창)</span></a>{s.checkedAt ? <span className="text-xs text-muted"> · 확인 {formatKst(s.checkedAt)}</span> : null}</li>)}</ul>
      </section>
    </article>
  );
}
