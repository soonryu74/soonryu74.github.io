"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ToyArt } from "@/components/ToyArt";
import { Button, ErrorState, Field, Loading, SelectField, formatWon } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { Product, WaitlistEntry } from "@/lib/types";

const WRAP = "mx-auto w-full max-w-5xl px-4";

/** 가게 첫 화면. 과장 없이, 갖고 싶게. 가짜 후기·마감 임박·근거 없는 안전 표현은 쓰지 않는다. */
export function Storefront() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Materials />
      <Products />
      <PlayGuide />
      <Promises />
      <Waitlist />
    </div>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden bg-brand text-white">
      <div className={`${WRAP} grid items-center gap-8 py-12 md:grid-cols-2 md:py-20`}>
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent">HANDMADE IN INDIA</p>
          <h1 className="text-[2.6rem] font-extrabold leading-[1.12] tracking-tight md:text-6xl">
            오늘,
            <br />
            같이 놀 <span className="text-accent">10분</span>.
          </h1>
          <p className="max-w-md text-lg text-white/85">한 땀씩 손으로 꿰맨 가죽과 폭신한 울 펠트. 플라스틱 삑삑이 대신 건네는 조용한 놀이 친구예요.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop" className="inline-flex min-h-14 items-center rounded-[16px] bg-accent px-6 text-lg font-bold text-ink">
              놀이 친구 보러 가기
            </Link>
            <a href="#waitlist" className="inline-flex min-h-14 items-center rounded-[16px] border border-white/50 px-6 text-lg font-semibold text-white">
              출시 알림 받기
            </a>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-sm">
          <div className="absolute inset-0 rounded-full bg-accent" aria-hidden="true" />
          <div className="absolute inset-[9%] rounded-full bg-bg" aria-hidden="true" />
          <ToyArt material="set" className="absolute inset-[14%] h-[72%] w-[72%] rotate-[-8deg] text-ink drop-shadow-xl" />
          <span className="absolute right-0 top-6 rotate-[10deg] rounded-full bg-card px-4 py-2 text-sm font-bold text-brand shadow-lg">가죽 + 울, 번갈아</span>
        </div>
      </div>
    </section>
  );
}

const MATERIALS = [
  { material: "leather" as const, title: "가죽", feel: "질겅질겅", text: "물수록 손에 익는 가죽. 터그 놀이와 가져오기에 좋아요." },
  { material: "wool_felt" as const, title: "울 펠트", feel: "폭신폭신", text: "입이 작은 아이도 물기 편한 부드러운 촉감이에요." },
  { material: "set" as const, title: "번갈아 주기", feel: "새것처럼", text: "두 가지를 번갈아 주면 흥미가 오래가요." },
];

function Materials() {
  return (
    <section className={`${WRAP} flex flex-col gap-8 py-14`}>
      <h2 className="max-w-xl text-3xl font-extrabold tracking-tight">소리 대신 촉감으로 놀아요</h2>
      <ul className="grid gap-5 md:grid-cols-3">
        {MATERIALS.map((m) => (
          <li key={m.title} className="flex flex-col gap-3 rounded-[24px] bg-card p-6">
            <div className="grid aspect-[4/3] place-items-center rounded-[18px] bg-tint">
              <ToyArt material={m.material} className="h-3/4 w-3/4 text-ink" />
            </div>
            <p className="text-sm font-bold text-accent">{m.feel}</p>
            <h3 className="text-xl font-bold">{m.title}</h3>
            <p className="text-muted">{m.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Products() {
  const state = useAsync<Product[]>(async () => (await getRepo().list("products")).filter((p) => p.status !== "draft"), []);
  return (
    <section className="bg-card">
      <div className={`${WRAP} flex flex-col gap-8 py-14`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-extrabold tracking-tight">놀이 친구들</h2>
          <Link href="/shop" className="font-semibold text-brand underline underline-offset-4">
            전체 보기
          </Link>
        </div>
        {state.loading ? <Loading /> : null}
        {state.error ? <ErrorState onRetry={state.reload} /> : null}
        {state.data && state.data.length === 0 ? <p className="text-muted">곧 첫 놀이 친구를 소개할게요.</p> : null}
        <ul className="grid gap-6 md:grid-cols-3">
          {(state.data ?? []).map((p) => (
            <li key={p.id}>
              <Link href={`/shop/${p.slug}`} className="group flex h-full flex-col gap-3 rounded-[24px] border border-line p-4 transition-shadow hover:shadow-xl">
                <div className="grid aspect-square place-items-center rounded-[18px] bg-tint">
                  <ToyArt material={p.material} className="h-3/4 w-3/4 text-ink transition-transform group-hover:scale-105" />
                </div>
                <h3 className="text-lg font-bold">{p.name.replace(/^\[예시\]\s*/, "")}</h3>
                <p className="text-muted">{p.summary}</p>
                <p className="mt-auto flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-brand">{formatWon(p.price_krw)}</span>
                  <span className="text-sm text-muted">{p.shipping_included ? "배송비 포함" : "배송비 별도"}</span>
                </p>
                {p.is_example ? <p className="text-sm text-warn">예시 상품이에요. 실제 판매 전이에요.</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PLAY = [
  { n: "1", title: "던져 주세요", text: "가져오면 크게 칭찬해요. 3분이면 충분해요." },
  { n: "2", title: "살짝 당겨 주세요", text: "가볍게 터그 놀이를 해요. 으르렁거려도 놀이예요." },
  { n: "3", title: "치워 두세요", text: "놀이가 끝나면 보이지 않는 곳에. 내일 또 새것 같아요." },
];

function PlayGuide() {
  return (
    <section className={`${WRAP} flex flex-col gap-8 py-14`}>
      <div className="flex max-w-xl flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight">10분 놀이법</h2>
        <p className="text-muted">혼자 오래 씹는 장난감이 아니에요. 보호자와 함께 노는 시간을 위한 물건이에요.</p>
      </div>
      <ol className="grid gap-5 md:grid-cols-3">
        {PLAY.map((s) => (
          <li key={s.n} className="flex gap-4 rounded-[24px] bg-card p-6">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-xl font-extrabold text-white" aria-hidden="true">
              {s.n}
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="text-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const PROMISES = [
  { title: "재료를 그대로 알려요", text: "원산지, 소재, 염료, 시험 항목과 결과를 상품마다 공개해요. 모르는 것은 확인 중이라고 써요." },
  { title: "맞지 않는 아이도 알려요", text: "강하게 물어뜯거나 조각을 삼키는 아이에게는 권하지 않아요." },
  { title: "먹는 제품이 아니에요", text: "실밥이나 조각이 떨어지면 바로 회수해 주세요. 언제 바꿔야 하는지도 알려 드려요." },
  { title: "재촉하지 않아요", text: "가짜 마감, 꾸며 낸 후기, 근거 없는 '무독성' 같은 말은 쓰지 않아요." },
];

function Promises() {
  return (
    <section className="bg-tint">
      <div className={`${WRAP} flex flex-col gap-8 py-14`}>
        <h2 className="text-3xl font-extrabold tracking-tight">입에 넣는 물건이니까, 솔직하게</h2>
        <ul className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {PROMISES.map((p) => (
            <li key={p.title} className="flex flex-col gap-1 border-t-2 border-brand pt-4">
              <h3 className="text-lg font-bold">{p.title}</h3>
              <p className="text-muted">{p.text}</p>
            </li>
          ))}
        </ul>
        <p>
          <Link href="/legal" className="font-semibold text-brand underline underline-offset-4">
            우리 약속 전체 보기
          </Link>
        </p>
      </div>
    </section>
  );
}

function Waitlist() {
  const [email, setEmail] = useState("");
  const [size, setSize] = useState<WaitlistEntry["dog_size"]>("unknown");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return setError("이메일 주소를 다시 확인해 주세요.");
    if (!agree) return setError("알림을 보내려면 동의가 필요해요.");
    setBusy(true);
    setError(null);
    try {
      await getRepo().insert("waitlist", { email: value, dog_size: size, consent_at: new Date().toISOString() });
      setDone(true);
    } catch {
      setError("신청을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="waitlist" className="scroll-mt-20 bg-brand text-white">
      <div className={`${WRAP} grid gap-8 py-14 md:grid-cols-2`}>
        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-extrabold tracking-tight">첫 판매를 준비하고 있어요</h2>
          <p className="text-white/85">시험과 통관 확인이 끝나면 판매를 시작해요. 이메일을 남겨 주시면 열리는 날 한 번만 알려 드릴게요.</p>
        </div>
        {done ? (
          <div role="status" className="rounded-[24px] bg-card p-6 text-ink">
            <p className="text-xl font-bold">신청했어요. 고맙습니다.</p>
            <p className="mt-1 text-muted">판매가 열리는 날 메일로 알려 드릴게요.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-[24px] bg-card p-6 text-ink">
            <Field id="waitlist-email" label="이메일" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
            <SelectField id="waitlist-size" label="우리 아이 크기" optional value={size} onChange={(e) => setSize(e.target.value as WaitlistEntry["dog_size"])}>
              <option value="unknown">고르지 않을게요</option>
              <option value="small">소형 (7kg 미만)</option>
              <option value="medium">중형 (7~20kg)</option>
              <option value="large">대형 (20kg 이상)</option>
            </SelectField>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-5 shrink-0 accent-brand" />
              <span>출시 알림을 받기 위해 이메일을 보관하는 데 동의해요. 알림을 보낸 뒤 지워요.</span>
            </label>
            <Button type="submit" variant="accent" disabled={busy}>
              {busy ? "저장하는 중이에요" : "출시 알림 받기"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
