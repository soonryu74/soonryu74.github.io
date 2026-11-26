"use client";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, ExampleBadge, LinkButton, Loading, Notice, PageHeader, SelectField, SourceMeta, TextareaField, formatDate } from "@/components/ui";
import { useAsync, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { Facility, FacilityReport } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  animal_hospital: "동물병원", animal_pharmacy: "동물약국", shelter: "보호센터", grooming: "미용", boarding: "호텔·위탁", transport: "운송", funeral: "장례",
  pet_cafe: "동반 카페", park: "공원", playground: "놀이터", lodging: "동반 숙소", restaurant: "동반 식당", shopping: "용품점",
};
const COMPANION_TYPES = ["pet_cafe", "park", "playground", "lodging", "restaurant", "shopping"];
const BUSINESS: Record<Facility["business_status"], { label: string; tone: "safe" | "danger" | "warn" | "neutral" }> = {
  open: { label: "영업", tone: "safe" },
  closed: { label: "폐업", tone: "danger" },
  suspended: { label: "휴업", tone: "warn" },
  unknown: { label: "미확인", tone: "neutral" },
};
// pet_access_json 에서 읽는 키. 값이 없으면 "미확인".
const ACCESS_FIELDS: { key: string; label: string }[] = [
  { key: "size_limit", label: "크기 제한" },
  { key: "carrier", label: "이동장" },
  { key: "leash", label: "목줄" },
  { key: "indoor_outdoor", label: "실내/실외" },
  { key: "vaccination_proof", label: "예방접종 증명" },
  { key: "extra_fee", label: "추가요금" },
  { key: "verified_at", label: "최근 확인일" },
];
const REPORT_TYPES: { key: FacilityReport["report_type"]; label: string }[] = [
  { key: "closed", label: "폐업했거나 쉬고 있어요" },
  { key: "wrong_phone", label: "전화번호가 달라요" },
  { key: "wrong_hours", label: "운영시간이 달라요" },
  { key: "other", label: "그 밖의 내용" },
];

function StatusRow({ label, children, note }: { label: string; children: React.ReactNode; note: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <dt className="font-medium">{label}</dt>
        <dd>{children}</dd>
      </div>
      <p className="text-sm text-muted">{note}</p>
    </div>
  );
}

function ReportForm({ facility }: { facility: Facility }) {
  const { user, loading } = useSession();
  const [reportType, setReportType] = useState<FacilityReport["report_type"]>("closed");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (details.trim().length < 5) {
      setError("무엇이 다른지 5자 이상 적어 주세요.");
      return;
    }
    setError(null);
    setSubmitError(null);
    setBusy(true);
    try {
      await getRepo().insert("facility_reports", { facility_id: facility.id, reporter_id: user.id, report_type: reportType, details: details.trim(), status: "open", resolved_at: null });
      setDone(true);
      setDetails("");
    } catch {
      setSubmitError("신고를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="section" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">정보가 틀렸나요?</h2>
      <p className="text-sm text-muted">알려 주시면 운영자가 확인한 뒤 고쳐요. 신고 내용은 공개되지 않아요.</p>
      {loading ? (
        <Loading />
      ) : !user ? (
        <div className="flex flex-col gap-2">
          <p>오류 신고는 로그인한 뒤에 보낼 수 있어요.</p>
          <LinkButton href="/login" variant="ghost">
            로그인하기
          </LinkButton>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <SelectField
            id="report-type"
            label="어떤 점이 다른가요?"
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value as FacilityReport["report_type"]);
              setDone(false);
            }}
          >
            {REPORT_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </SelectField>
          <TextareaField
            id="report-details"
            label="자세한 내용"
            value={details}
            onChange={(e) => {
              setDetails(e.target.value);
              setDone(false);
            }}
            error={error}
            placeholder="예: 오늘 전화해 보니 없는 번호라고 나와요."
            maxLength={1000}
          />
          <p className="text-sm text-muted">다른 사람의 이름·연락처 같은 개인정보는 적지 말아 주세요.</p>
          {submitError ? (
            <p role="alert" className="text-sm text-danger">
              {submitError}
            </p>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? "보내는 중이에요" : "오류 신고 보내기"}
          </Button>
          <p role="status" aria-live="polite" className="text-sm text-safe">
            {done ? "신고를 접수했어요. 확인해서 고칠게요. 고마워요." : ""}
          </p>
        </form>
      )}
    </Card>
  );
}

export default function FacilityPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAsync(() => getRepo().get("facilities", id), [id]);

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorState onRetry={state.reload} />;
  const f = state.data;
  if (!f) {
    return <EmptyState title="시설을 찾지 못했어요" description="주소가 바뀌었거나 없는 시설이에요." action={<LinkButton href="/map" variant="ghost">주변 시설로 돌아가기</LinkButton>} />;
  }

  const business = BUSINESS[f.business_status] ?? BUSINESS.unknown;
  const access = f.pet_access_json ?? {};

  return (
    <>
      <PageHeader title={f.name} description={f.address} />
      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">{TYPE_LABEL[f.facility_type] ?? f.facility_type}</Badge>
        {f.is_example ? <ExampleBadge /> : null}
      </div>
      {f.is_example ? <Notice tone="warn">화면을 보여 주기 위한 예시 데이터예요. 실제 장소가 아니에요.</Notice> : null}

      <Card as="section">
        <h2 className="text-lg font-bold">영업·운영 상태</h2>
        <p className="mt-1 text-sm text-muted">세 가지는 서로 다른 정보예요. 따로 확인해 주세요.</p>
        <dl className="mt-2">
          <StatusRow label="허가상 영업 상태" note="인허가 기록 기준이에요. 지금 문을 열었는지와는 달라요.">
            <Badge tone={business.tone}>{business.label}</Badge>
          </StatusRow>
          <StatusRow label="운영시간 확인" note="운영시간을 사업자나 최근 전화로 확인했는지예요.">
            <Badge tone={f.hours_status === "verified" ? "safe" : "neutral"}>{f.hours_status === "verified" ? "확인됨" : "미확인"}</Badge>
          </StatusRow>
          <StatusRow label="24시간·응급" note="확인되기 전에는 24시간·응급 진료를 한다고 보지 말고 전화로 물어봐 주세요.">
            <Badge tone={f.emergency_status === "verified" ? "safe" : "neutral"}>{f.emergency_status === "verified" ? "확인됨" : "미확인"}</Badge>
          </StatusRow>
        </dl>
      </Card>

      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">연락·길찾기</h2>
        {f.phone ? (
          <LinkButton href={`tel:${f.phone.replace(/[^0-9+]/g, "")}`} variant="safe" className="w-full">
            전화하기 {f.phone}
          </LinkButton>
        ) : (
          <p className="text-muted">전화번호 없음</p>
        )}
        {f.is_example ? (
          <Button variant="ghost" disabled className="w-full">
            예시 데이터라 길찾기를 제공하지 않아요
          </Button>
        ) : (
          <LinkButton href={`https://map.kakao.com/link/search/${encodeURIComponent(f.name)}`} variant="ghost" className="w-full">
            카카오맵에서 길찾기
          </LinkButton>
        )}
      </Card>

      {COMPANION_TYPES.includes(f.facility_type) ? (
        <Card as="section" className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">동반 조건</h2>
          <Notice tone="warn">방문 전 전화로 확인하세요. 동반 조건은 날짜나 상황에 따라 달라질 수 있어요.</Notice>
          <dl className="flex flex-col">
            {ACCESS_FIELDS.map((a) => {
              const raw = access[a.key];
              const value = !raw ? "미확인" : a.key === "verified_at" && formatDate(raw) !== "-" ? formatDate(raw) : raw;
              return (
                <div key={a.key} className="flex justify-between gap-3 border-b border-line py-2 last:border-b-0">
                  <dt className="shrink-0 font-medium">{a.label}</dt>
                  <dd className={`min-w-0 break-words text-right ${raw ? "" : "text-muted"}`}>{value}</dd>
                </div>
              );
            })}
          </dl>
        </Card>
      ) : null}

      <SourceMeta
        sources={[{ org: f.source_system === "example" ? "예시 데이터" : f.source_system }]}
        reviewedAt={f.source_updated_at}
        statusLabel={`동기화일 ${f.source_updated_at ? formatDate(f.source_updated_at) : "동기화 전"}`}
      />

      <ReportForm facility={f} />
    </>
  );
}
