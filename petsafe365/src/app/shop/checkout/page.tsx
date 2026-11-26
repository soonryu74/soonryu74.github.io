"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Card, EmptyState, ErrorState, LinkButton, Loading, Notice, PageHeader, formatWon } from "@/components/ui";
import { getFlags } from "@/lib/domain";
import { useAsync, useSession } from "@/lib/hooks";
import { getPaymentAdapter } from "@/lib/payments";
import { getRepo } from "@/lib/repo";

const SHIPPING_KRW = 3000;
const MAX_QTY = 5;

function Checkout() {
  const slug = useSearchParams().get("product");
  const { user } = useSession();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const state = useAsync(async () => {
    const flags = await getFlags();
    if (!flags.paymentsEnabled || !slug) return { flags, product: null };
    const [product] = await getRepo().list("products", { eq: { slug } });
    return { flags, product: product && product.status === "on_sale" ? product : null };
  }, [slug]);

  if (state.loading) return <Loading />;
  if (state.error || !state.data) return <ErrorState onRetry={state.reload} />;
  if (!state.data.flags.paymentsEnabled) {
    return (
      <EmptyState
        title="앱 안 결제는 준비 중이에요"
        description="사업자 신고와 결제대행사 심사가 끝난 뒤에 열려요. 그 전에는 결제를 받지 않아요."
        action={<LinkButton href="/shop" variant="ghost">용품으로 돌아가기</LinkButton>}
      />
    );
  }
  const product = state.data.product;
  if (!product) {
    return <EmptyState title="주문할 상품을 찾지 못했어요" description="판매 중인 상품인지 확인해 주세요." action={<LinkButton href="/shop" variant="ghost">용품으로 돌아가기</LinkButton>} />;
  }

  const shipping = product.shipping_included ? 0 : SHIPPING_KRW;
  const total = product.price_krw * qty + shipping;

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const adapter = getPaymentAdapter();
      const repo = getRepo();
      const items = [{ product_id: product.id, name: product.name, qty, price_krw: product.price_krw }];
      const order = await repo.insert("orders", { user_id: user?.id ?? null, status: "pending", total_krw: total, items_json: items, payment_provider: adapter.name, payment_ref: null });
      const result = await adapter.requestPayment({ id: order.id, amount: total, orderName: qty > 1 ? `${product.name} ${qty}개` : product.name });
      if (result.ok) setPaid(true);
      else setError(`${result.reason ?? "결제를 진행하지 못했어요."} 주문은 결제 대기 상태로 남아 있고 돈은 빠져나가지 않았어요.`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "주문을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (paid) {
    return <EmptyState title="결제가 끝났어요" description="주문 내용을 확인한 뒤 배송을 준비할게요." action={<LinkButton href="/shop" variant="ghost">용품으로 돌아가기</LinkButton>} />;
  }

  return (
    <>
      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">주문 내용</h2>
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted">상품</dt>
            <dd className="min-w-0 break-keep text-right">{product.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-muted">수량</dt>
            <dd className="flex items-center gap-2">
              <Button variant="ghost" aria-label="수량 줄이기" disabled={busy || qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </Button>
              <span aria-live="polite" className="w-10 text-center font-semibold">
                {qty}개
              </span>
              <Button variant="ghost" aria-label="수량 늘리기" disabled={busy || qty >= MAX_QTY} onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}>
                +
              </Button>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">상품 금액</dt>
            <dd>{formatWon(product.price_krw * qty)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">배송비</dt>
            <dd>{shipping === 0 ? "0원 (상품 가격에 포함)" : formatWon(shipping)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-line pt-2 text-lg font-bold">
            <dt>결제 금액</dt>
            <dd className="text-brand">{formatWon(total)}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted">한 번에 {MAX_QTY}개까지 주문할 수 있어요. 여기 보이는 금액 말고 더 붙는 비용은 없어요.</p>
      </Card>

      <Notice>
        상품을 받은 날부터 7일 안에 청약철회를 할 수 있어요.{" "}
        <Link href="/legal/refund" className="font-medium text-brand underline">
          교환·환불 안내 보기
        </Link>
      </Notice>

      <Card as="section" className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">판매자 정보</h2>
        <p className="text-muted">판매자 정보는 사업자 정보 확정 뒤 표시돼요</p>
      </Card>

      {error ? (
        <p role="alert" className="rounded-[14px] border border-danger px-4 py-3 text-danger">
          {error}
        </p>
      ) : null}
      <Button variant="accent" disabled={busy} onClick={pay}>
        {busy ? "처리하는 중이에요" : `${formatWon(total)} 결제하기`}
      </Button>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <PageHeader title="주문 확인·결제" description="금액을 확인한 뒤 결제해 주세요." />
      <Suspense fallback={<Loading />}>
        <Checkout />
      </Suspense>
    </>
  );
}
