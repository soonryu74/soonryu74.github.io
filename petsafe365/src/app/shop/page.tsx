"use client";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { ToyArt } from "@/components/ToyArt";
import { Badge, Card, EmptyState, ErrorState, ExampleBadge, Loading, Notice, PageHeader, formatWon } from "@/components/ui";
import { useAsync, usePets, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import { fitFor } from "@/lib/rules";
import { SAFETY_APP_ENABLED } from "@/lib/site";
import type { Pet, Product } from "@/lib/types";

function FitNote({ product, pet }: { product: Product; pet: Pet }) {
  const fit = fitFor(product, pet);
  if (fit === "ok") return <p className="text-sm text-safe">{pet.name} 입 크기에 맞아요</p>;
  if (fit === "too_small") {
    return (
      <p>
        <Badge tone="warn">{pet.name}에게는 작을 수 있어요. 삼킬 위험이 있으니 다른 크기를 확인하세요</Badge>
      </p>
    );
  }
  return SAFETY_APP_ENABLED ? <p className="text-sm text-muted">체중을 등록하면 크기 안내를 받을 수 있어요</p> : null;
}

export default function ShopPage() {
  const { user } = useSession();
  const { current } = usePets();
  const products = useAsync(async () => (await getRepo().list("products", { order: { column: "created_at" } })).filter((p) => p.status !== "draft"), []);
  const pet = user ? current : null;

  return (
    <>
      <PageHeader title="용품" description="손으로 만든 놀이 친구. 재료와 시험 결과를 그대로 보여 드려요." />
      <Notice tone="warn">먹는 제품이 아니에요. 강하게 물어뜯는 아이에게는 맞지 않아요.</Notice>

      {products.loading ? (
        <Loading />
      ) : products.error ? (
        <ErrorState onRetry={products.reload} />
      ) : !products.data || products.data.length === 0 ? (
        <EmptyState title="아직 보여 드릴 용품이 없어요" description="시험과 확인이 끝난 용품부터 차례로 올릴게요." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.data.map((p) => (
            <Card as="li" key={p.id} className="flex flex-col gap-3">
              <Link href={`/shop/${p.slug}`} className="flex flex-col gap-3">
                <div className="rounded-[12px] bg-tint p-6">
                  <ToyArt material={p.material} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 break-keep text-lg font-bold">{p.name}</h2>
                  {p.is_example ? <ExampleBadge /> : null}
                  {p.status === "sold_out" ? <Badge>품절</Badge> : null}
                </div>
                <p className="text-muted">{p.summary}</p>
                <p>
                  <span className="text-xl font-bold text-brand">{formatWon(p.price_krw)}</span>{" "}
                  <span className="text-sm text-muted">{p.shipping_included ? "배송비 포함" : "배송비 별도"}</span>
                </p>
              </Link>
              {pet ? <FitNote product={p} pet={pet} /> : null}
              <Link href={`/shop/${p.slug}`} className="mt-auto font-medium text-brand underline">
                재료·시험 결과 보기
              </Link>
            </Card>
          ))}
        </ul>
      )}

      <AdSlot>광고 영역</AdSlot>
    </>
  );
}
