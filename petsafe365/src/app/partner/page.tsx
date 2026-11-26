"use client";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Field, LinkButton, Loading, Notice, PageHeader, SelectField, TextareaField } from "@/components/ui";
import { useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";

const PLANS = [
  { name: "Basic", price: "0원", features: ["공공데이터 기반 기본 프로필", "정보 수정 요청"], note: "지금 문의할 수 있어요" },
  { name: "Pro", price: "월 59,000원 (가정)", features: ["인증 배지", "서비스·운영시간 안내", "문의 받기", "후기 응답", "통계"], note: "파일럿 문의를 받고 있어요" },
  { name: "Growth", price: "월 149,000원 (가정)", features: ["고객 관리(CRM)", "쿠폰", "여러 지점 관리", "상세 분석"], note: "2차로 준비해요" },
];
const CATEGORIES = ["동물병원", "동물약국", "미용", "호텔·돌봄", "훈련", "동반 카페·식당", "용품점", "기타"];

type Errors = { business?: string; contact?: string; message?: string; consent?: string };

function InquiryForm({ userId }: { userId: string }) {
  const [business, setBusiness] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!business.trim()) next.business = "상호를 입력해 주세요.";
    if (!contact.trim()) next.contact = "연락받을 전화번호나 이메일을 입력해 주세요.";
    if (!message.trim()) next.message = "문의 내용을 입력해 주세요.";
    if (!consent) next.consent = "연락처 사용에 동의해야 문의를 보낼 수 있어요.";
    setErrors(next);
    setFailed(null);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      await getRepo().insert("partner_inquiries", {
        user_id: userId, business_name: business.trim(), category, contact: contact.trim(), message: message.trim(), status: "new", consent_at: new Date().toISOString(),
      });
      setDone(true);
    } catch {
      setFailed("문의를 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p className="font-semibold text-safe">문의를 접수했어요.</p>
        <p className="text-muted">남겨 주신 연락처로 담당자가 연락드릴게요.</p>
        <Button
          variant="ghost"
          onClick={() => {
            setBusiness("");
            setContact("");
            setMessage("");
            setConsent(false);
            setDone(false);
          }}
        >
          다른 문의 남기기
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">모든 항목이 필수예요.</p>
      <Field id="inq-business" label="상호" value={business} onChange={(e) => setBusiness(e.target.value)} error={errors.business} required maxLength={80} autoComplete="organization" />
      <SelectField id="inq-category" label="업종" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>
      <Field id="inq-contact" label="연락처" hint="전화번호나 이메일을 적어 주세요." value={contact} onChange={(e) => setContact(e.target.value)} error={errors.contact} required maxLength={80} />
      <TextareaField id="inq-message" label="문의 내용" value={message} onChange={(e) => setMessage(e.target.value)} error={errors.message} required maxLength={1000} rows={4} />
      <div className="flex flex-col gap-1">
        <label htmlFor="inq-consent" className="flex min-h-12 items-center gap-3">
          <input id="inq-consent" type="checkbox" className="size-5 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-describedby={errors.consent ? "inq-consent-error" : undefined} />
          <span>문의 응대를 위해 입력한 연락처를 사용하는 데 동의해요 <span className="text-sm text-muted">(필수)</span></span>
        </label>
        {errors.consent ? <p id="inq-consent-error" role="alert" className="text-sm text-danger">{errors.consent}</p> : null}
      </div>
      {failed ? <p role="alert" className="text-sm text-danger">{failed}</p> : null}
      <Button type="submit" disabled={busy}>
        {busy ? "보내는 중이에요" : "문의 보내기"}
      </Button>
    </form>
  );
}

export default function PartnerPage() {
  const { user, loading } = useSession();
  return (
    <>
      <PageHeader title="파트너 안내" description="보호자가 믿고 찾을 수 있게, 확인된 정보로 업체를 소개해요." />
      <Notice>가격은 가정이며 확정 전이에요. 지도 검색 순위는 판매하지 않아요.</Notice>

      <ul className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card as="li" key={p.name} className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-brand">{p.name}</h2>
            <p className="text-xl font-bold">{p.price}</p>
            <ul className="list-disc pl-5">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="mt-auto">
              <Badge>{p.note}</Badge>
            </p>
          </Card>
        ))}
      </ul>

      <Card as="section" className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">구독 결제</h2>
        <p className="text-muted">구독 결제는 준비 중이에요. 사업자 신고와 결제대행사 심사가 끝난 뒤에 열려요.</p>
        <Button disabled>구독 결제 준비 중</Button>
      </Card>

      <Card as="section" className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">입점 문의</h2>
        {loading ? (
          <Loading />
        ) : user ? (
          <InquiryForm userId={user.id} />
        ) : (
          <>
            <p className="text-muted">문의를 남기려면 로그인이 필요해요. 답변을 드릴 분을 확인하기 위해서예요.</p>
            <LinkButton href="/login">로그인하기</LinkButton>
          </>
        )}
      </Card>
    </>
  );
}
