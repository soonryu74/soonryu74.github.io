"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ToyArt } from "@/components/ToyArt";
import { Badge, Button, Card, ErrorState, ExampleBadge, Forbidden, LinkButton, Loading, Notice, formatDate, formatWon } from "@/components/ui";
import { getFlags } from "@/lib/domain";
import { useAsync } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { ProductLot } from "@/lib/types";

const CARE = [
  "보호자와 함께 놀 때만 꺼내 주세요. 혼자 오래 씹게 두지 않아요.",
  "실밥이나 조각이 떨어지면 바로 회수하고 더 쓰지 않아요.",
  "놀이가 끝나면 아이 손이 닿지 않는 곳에 보관해 주세요.",
  "세탁기와 건조기는 쓰지 않아요. 마른 천으로 닦고 그늘에서 말려 주세요.",
  "조각을 삼킨 것 같으면 바로 동물병원에 전화해 주세요.",
];

function Lot({ lot }: { lot: ProductLot }) {
  return (
    <li className="flex flex-col gap-2 rounded-[12px] border border-line p-3">
      <p className="flex flex-wrap items-center gap-2 font-medium">
        <span className="break-all">로트 {lot.lot_code}</span>
        <Badge tone={lot.status === "passed" ? "safe" : lot.status === "failed" ? "danger" : "neutral"}>
          {lot.status === "passed" ? "시험 통과" : lot.status === "failed" ? "판매 안 함" : "결과 대기"}
        </Badge>
      </p>
      {lot.status === "pending" ? <p className="text-sm text-muted">시험 결과 대기 중이에요. 결과가 나오기 전에는 &apos;불검출&apos; 같은 표시를 하지 않아요.</p> : null}
      {lot.status === "failed" ? <p className="text-sm text-danger">이 로트는 판매하지 않아요</p> : null}
      {lot.status === "passed" ? (
        <>
          {lot.results_json.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="py-1 pr-3 font-medium">항목</th>
                    <th scope="col" className="py-1 font-medium">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {lot.results_json.map((r) => (
                    <tr key={r.item} className="border-b border-line last:border-0">
                      <td className="py-1 pr-3">{r.item}</td>
                      <td className="py-1">{r.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">항목별 결과는 아직 등록되지 않았어요.</p>
          )}
          <p className="text-sm text-muted">
            시험 기관 {lot.lab_name ?? "확인 전"} · 시험일 {lot.tested_at ? formatDate(lot.tested_at) : "확인 전"}
          </p>
          {lot.report_document_url ? (
            <a href={lot.report_document_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand underline">
              시험 성적서 보기
            </a>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const state = useAsync(async () => {
    const repo = getRepo();
    const [product] = await repo.list("products", { eq: { slug } });
    if (!product || product.status === "draft") return null;
    const [lots, flags] = await Promise.all([repo.list("product_lots", { eq: { product_id: product.id } }), getFlags()]);
    return { product, lots, flags };
  }, [slug]);

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorState onRetry={state.reload} />;
  if (!state.data) return <Forbidden />;
  const { product, lots, flags } = state.data;
  const soldOut = product.status === "sold_out";

  return (
    <>
      <Link href="/shop" className="text-sm font-medium text-brand underline">
        ← 용품 목록
      </Link>
      {product.is_example ? <Notice tone="warn">예시 상품이에요. 실제 판매 상품이 아니에요.</Notice> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex items-center rounded-[16px] bg-tint p-8">
          <ToyArt material={product.material} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-keep text-2xl font-bold tracking-tight">{product.name}</h1>
            {product.is_example ? <ExampleBadge /> : null}
          </div>
          <p className="text-muted">{product.summary}</p>
          <p>
            <span className="text-3xl font-bold text-brand">{formatWon(product.price_krw)}</span>{" "}
            <span className="text-sm text-muted">{product.shipping_included ? "배송비 포함" : "배송비 별도"}</span>
          </p>
          <p>{product.description}</p>

          <div className="flex flex-col gap-2">
            {soldOut ? (
              <>
                <Button disabled>품절</Button>
                <p className="text-sm text-muted">지금은 재고가 없어요.</p>
              </>
            ) : flags.paymentsEnabled ? (
              <LinkButton variant="accent" href={`/shop/checkout?product=${encodeURIComponent(product.slug)}`}>
                바로 구매
              </LinkButton>
            ) : product.external_url ? (
              <LinkButton variant="accent" href={product.external_url} external>
                스마트스토어에서 구매
              </LinkButton>
            ) : (
              <>
                <Button disabled>판매 준비 중</Button>
                <p className="text-sm text-muted">아직 판매 전이에요. 시험과 통관 확인이 끝나면 열려요.</p>
              </>
            )}
          </div>
          <Notice tone="warn">먹는 제품이 아니에요. 강하게 물어뜯는 아이에게는 맞지 않아요.</Notice>
        </div>
      </div>

      <Card as="section" className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">이런 아이에게는 맞지 않아요</h2>
        {product.not_for.length > 0 ? (
          <ul className="list-disc pl-5">
            {product.not_for.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">등록된 내용이 없어요.</p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card as="section" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">크기</h2>
          <p>{product.size_cm ?? "실측 전"}</p>
        </Card>
        <Card as="section" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">원산지·수입자</h2>
          <dl className="flex flex-col gap-1">
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted">원산지</dt>
              <dd>{product.origin_country}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted">수입자</dt>
              <dd>{product.importer ?? "수입자 정보 확정 전"}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">로트·시험 결과</h2>
        {lots.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {lots.map((lot) => (
              <Lot key={lot.id} lot={lot} />
            ))}
          </ul>
        ) : (
          <p className="text-muted">등록된 로트가 아직 없어요. 시험 결과가 없는 상태에서는 안전 표시를 하지 않아요.</p>
        )}
      </Card>

      <Card as="section" className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">사용·관리 안내</h2>
        <ul className="list-disc pl-5">
          {CARE.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Card>

      <Card as="section" className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">리뷰</h2>
        <p className="text-muted">{flags.publicReviewsEnabled ? "아직 등록된 구매 후기가 없어요." : "구매 후기는 준비 중이에요"}</p>
      </Card>
    </>
  );
}
