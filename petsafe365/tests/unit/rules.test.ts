import { describe, expect, it } from "vitest";
import {
  classifyInsurance, commerceAllowedOn, fitFor, isContactUsable, isContentPublic, lifeStage, matchesTemplate, nextDue, pickInitialTemplates, INSURANCE_DISCLAIMER,
} from "@/lib/rules";
import { careTaskTemplates, featureFlags, productLots, products, facilities, contentVersions } from "@/lib/seed";
import { validateFile } from "@/lib/repo/repo";

const NOW = new Date("2026-11-26T09:00:00+09:00");
const dog = { species: "dog" as const, birth_date: "2023-05-01", registration_status: "unknown" as const, insurance_status: "uninsured" as const, indoor: true, neutered: true };
const cat = { ...dog, species: "cat" as const };

describe("오늘 할 일 규칙 엔진", () => {
  it("등록 직후 3개를 고르고 법정 의무가 맨 앞이다", () => {
    const picked = pickInitialTemplates(dog, careTaskTemplates, NOW);
    expect(picked).toHaveLength(3);
    expect(picked[0].priority_class).toBe("legal");
    expect(picked.map((t) => t.title)).toContain("동물등록 여부 확인하기");
  });
  it("등록을 마친 개에게는 등록 확인을 다시 권하지 않는다", () => {
    const picked = pickInitialTemplates({ ...dog, registration_status: "registered" }, careTaskTemplates, NOW, 10);
    expect(picked.map((t) => t.title)).not.toContain("동물등록 여부 확인하기");
  });
  it("고양이에게 개 전용 일정을 주지 않고 고양이 일정을 준다", () => {
    const titles = pickInitialTemplates(cat, careTaskTemplates, NOW, 10).map((t) => t.title);
    expect(titles).not.toContain("외출 전 인식표·목줄·배변봉투 챙기기");
    expect(titles).toContain("화장실 청소하기");
  });
  it("보험 일정은 가입한 경우에만 나온다", () => {
    const tpl = careTaskTemplates.find((t) => t.category === "보험")!;
    expect(matchesTemplate(dog, tpl, NOW)).toBe(false);
    expect(matchesTemplate({ ...dog, insurance_status: "insured" }, tpl, NOW)).toBe(true);
  });
  it("승인되지 않은 템플릿은 쓰지 않는다", () => {
    expect(matchesTemplate(dog, { ...careTaskTemplates[2], status: "draft" }, NOW)).toBe(false);
  });
  it("생애주기와 반복 일정을 계산한다", () => {
    expect(lifeStage({ species: "dog", birth_date: "2026-06-01" }, NOW)).toBe("young");
    expect(lifeStage({ species: "dog", birth_date: "2016-01-01" }, NOW)).toBe("senior");
    expect(lifeStage({ species: "dog", birth_date: null }, NOW)).toBe("unknown");
    expect(nextDue(NOW, "weekly")!.getTime() - NOW.getTime()).toBe(7 * 86400000);
    expect(nextDue(NOW, "none")).toBeNull();
  });
});

describe("보험 3단계 확인", () => {
  it("입력한 조항이 없으면 절대 '보장 가능성 높음'이 나오지 않는다", () => {
    for (const c of ["질병 치료", "수술", "입원", "기타"]) expect(classifyInsurance(c, []).result).toBe("check_terms");
  });
  it("예방·미용 비용은 일반적 제외로 안내한다", () => {
    const v = classifyInsurance("예방접종", []);
    expect(v.result).toBe("generally_excluded");
    expect(v.evidence.type).toBe("general_guide");
  });
  it("내가 입력한 조항이 근거가 된다", () => {
    const v = classifyInsurance("수술", [{ category: "수술", classification: "covered", clause_text: "수술비를 보상한다", clause_reference: "제3조" }]);
    expect(v.result).toBe("likely_covered");
    expect(v.evidence).toEqual({ type: "user_clause", text: "수술비를 보상한다", reference: "제3조" });
  });
  it("조항이 엇갈리면 보수적인 쪽을 따른다", () => {
    const v = classifyInsurance("수술", [
      { category: "수술", classification: "covered", clause_text: "보상", clause_reference: null },
      { category: "수술", classification: "excluded", clause_text: "슬개골 수술은 제외", clause_reference: null },
    ]);
    expect(v.result).toBe("generally_excluded");
  });
  it("고정 면책 문구가 인수인계서와 같다", () => {
    expect(INSURANCE_DISCLAIMER).toBe("본 기능은 보험상품 가입 권유나 보험금 지급 결정을 제공하지 않습니다. 실제 보장 여부와 보험금은 가입 당시 약관 및 보험사의 심사에 따라 결정됩니다.");
  });
});

describe("공식 연락처·콘텐츠 공개", () => {
  it("확인 중이거나 기간이 지난 연락처는 쓰지 않는다", () => {
    expect(isContactUsable({ status: "active", valid_from: null, valid_to: null }, NOW)).toBe(true);
    expect(isContactUsable({ status: "pending", valid_from: null, valid_to: null }, NOW)).toBe(false);
    expect(isContactUsable({ status: "active", valid_from: null, valid_to: "2026-01-01T00:00:00Z" }, NOW)).toBe(false);
    expect(isContactUsable({ status: "active", valid_from: "2027-01-01T00:00:00Z", valid_to: null }, NOW)).toBe(false);
  });
  it("검수 전·기한 지난 글은 공개하지 않는다", () => {
    expect(isContentPublic({ status: "in_review" }, { status: "in_review", reviewed_at: null, expires_at: null }, NOW)).toBe(false);
    expect(isContentPublic({ status: "published" }, { status: "published", reviewed_at: "2026-11-01T00:00:00Z", expires_at: "2027-05-01T00:00:00Z" }, NOW)).toBe(true);
    expect(isContentPublic({ status: "published" }, { status: "published", reviewed_at: "2026-01-01T00:00:00Z", expires_at: "2026-06-01T00:00:00Z" }, NOW)).toBe(false);
    expect(isContentPublic({ status: "published" }, { status: "published", reviewed_at: null, expires_at: null }, NOW)).toBe(false);
    expect(isContentPublic({ status: "published" }, null, NOW)).toBe(false);
  });
  it("초기 감염병 글 4건은 모두 검수 전 상태로 들어간다", () => {
    expect(contentVersions).toHaveLength(4);
    expect(contentVersions.every((v) => v.status === "in_review" && v.reviewed_at === null)).toBe(true);
  });
});

describe("용품·광고 원칙", () => {
  it("체중으로 작은 장난감을 걸러 안내한다", () => {
    const p = { min_mouth: "small" as const };
    expect(fitFor(p, { species: "dog", weight_kg: 3 })).toBe("ok");
    expect(fitFor(p, { species: "dog", weight_kg: 25 })).toBe("too_small");
    expect(fitFor(p, { species: "dog", weight_kg: null })).toBe("unknown");
    expect(fitFor(p, null)).toBe("unknown");
  });
  it("긴급·지도·신고·건강·보험·법무·홈에서는 판매와 광고를 하지 않는다", () => {
    for (const path of ["/", "/emergency", "/map", "/facilities/1", "/reports", "/health/zoonoses/sfts", "/insurance", "/legal/terms"]) expect(commerceAllowedOn(path)).toBe(false);
    for (const path of ["/shop", "/shop/leather-bone", "/today"]) expect(commerceAllowedOn(path)).toBe(true);
  });
  it("법적 기능 플래그 시드는 모두 꺼져 있다", () => {
    expect(featureFlags.map((f) => f.key).sort()).toEqual(["adsEnabled", "insuranceReferralEnabled", "partnerSubscriptionsEnabled", "paymentsEnabled", "preciseLocationStorageEnabled", "publicReviewsEnabled"]);
    expect(featureFlags.every((f) => f.enabled === false)).toBe(true);
  });
  it("예시 상품·시설은 예시로 표시되고 시험 통과를 주장하지 않는다", () => {
    expect(products.every((p) => p.is_example && p.name.startsWith("[예시]"))).toBe(true);
    expect(facilities.every((f) => f.is_example && f.name.startsWith("[예시]") && f.phone === null)).toBe(true);
    expect(productLots.every((l) => l.status === "pending" && l.results_json.length === 0)).toBe(true);
  });
});

describe("파일 검증", () => {
  it("허용 형식과 크기만 통과한다", () => {
    expect(validateFile({ name: "진료.pdf", type: "application/pdf", size: 1000 })).toBeNull();
    expect(validateFile({ name: "a.exe", type: "application/octet-stream", size: 1000 })).not.toBeNull();
    expect(validateFile({ name: "a.pdf", type: "text/html", size: 1000 })).not.toBeNull();
    expect(validateFile({ name: "a.png", type: "image/png", size: 11 * 1024 * 1024 })).not.toBeNull();
    expect(validateFile({ name: "a.png", type: "image/png", size: 0 })).not.toBeNull();
  });
});
