// 결제대행사(PG) 연결 지점.
//
// 지금은 어떤 경우에도 결제를 성공으로 처리하지 않는다. 사업자 신고와 결제대행사 심사·계약이 끝나고
// 관리자가 paymentsEnabled 를 켠 뒤에, 아래 표시한 자리에 실제 SDK 호출을 넣는다.
//
// 연결할 때 지켜야 할 것:
// 1. 브라우저에는 공개 키(NEXT_PUBLIC_PAYMENT_CLIENT_KEY)만 둔다. 시크릿 키는 서버 환경변수에만 둔다.
// 2. requestPayment 는 결제창을 띄우는 일만 한다.
//    - Toss Payments: `loadTossPayments(clientKey)` → `payment.requestPayment({ method, amount, orderId, orderName, successUrl, failUrl })`
//    - PortOne: `PortOne.requestPayment({ storeId, channelKey, paymentId, orderName, totalAmount, currency, payMethod })`
// 3. 결제 승인은 반드시 서버에서 검증한다. 브라우저가 돌려준 성공 값만 믿고 주문을 'paid' 로 바꾸지 않는다.
//    - 서버 Route Handler(예: /api/payments/confirm)에서 DB 의 주문 금액과 결제대행사가 알려 준 금액을 비교하고,
//      Toss `POST /v1/payments/confirm` 또는 PortOne 결제 단건 조회 API 로 승인·검증한 뒤에만
//      orders.status='paid', payment_ref 를 기록한다. 웹훅도 같은 검증을 거친다.
// 4. 금액은 서버가 가진 상품 가격으로 다시 계산한다. 클라이언트가 보낸 금액을 그대로 쓰지 않는다.

export type PaymentRequest = { id: string; amount: number; orderName: string };
export type PaymentResult = { ok: boolean; reason?: string };

export interface PaymentAdapter {
  name: string;
  /** 결제대행사 키가 설정되어 있는지. true 여도 계약·연동 전에는 결제가 되지 않는다. */
  isConfigured(): boolean;
  requestPayment(order: PaymentRequest): Promise<PaymentResult>;
}

const notConfigured: PaymentAdapter = {
  name: "not_configured",
  isConfigured: () => false,
  async requestPayment() {
    return { ok: false, reason: "결제대행사가 아직 연결되지 않았어요." };
  },
};

export function getPaymentAdapter(): PaymentAdapter {
  const provider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER;
  const clientKey = process.env.NEXT_PUBLIC_PAYMENT_CLIENT_KEY;
  if (!provider || !clientKey) return notConfigured;
  return {
    name: provider,
    isConfigured: () => true,
    async requestPayment() {
      // TODO(계약 후): 여기서 provider 에 맞는 SDK(Toss Payments / PortOne)의 결제창을 띄운다.
      // 결제창이 성공으로 돌아와도 서버 검증(위 3번)이 끝나기 전에는 ok:true 를 돌려주지 않는다.
      return { ok: false, reason: "결제대행사 연동은 계약 후 연결돼요." };
    },
  };
}
