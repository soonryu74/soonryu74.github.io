import { describe, expect, it } from "vitest";
import { isContactStale, isContactVisible, telHref } from "@/lib/contacts";
import { canTransition, isVersionPublic } from "@/lib/content-rules";
import { validateUpload } from "@/lib/files";
import { DEFAULT_FLAGS, resolveFlags } from "@/lib/flags";
import { petSchema } from "@/lib/validation";
import { OFFICIAL_CONTACTS } from "@/content/official-contacts";
import { RED_FLAGS } from "@/content/emergency";
import { ZOONOSES } from "@/content/zoonoses";
import { seedContent } from "@/lib/seed";
import type { ContentVersion } from "@/lib/types";

describe("공식 연락처", () => {
  it("유효기간 밖이면 숨긴다", () => {
    expect(isContactVisible({ status: "active", valid_from: null, valid_to: "2020-01-01" }, "2026-09-24")).toBe(false);
    expect(isContactVisible({ status: "active", valid_from: "2027-01-01", valid_to: null }, "2026-09-24")).toBe(false);
    expect(isContactVisible({ status: "retired", valid_from: null, valid_to: null }, "2026-09-24")).toBe(false);
    expect(isContactVisible({ status: "active", valid_from: null, valid_to: null }, "2026-09-24")).toBe(true);
  });
  it("확인일이 없거나 오래되면 stale", () => {
    expect(isContactStale({ verified_at: null })).toBe(true);
    expect(isContactStale({ verified_at: "2026-08-31" }, new Date("2026-09-24"))).toBe(false);
    expect(isContactStale({ verified_at: "2025-01-01" }, new Date("2026-09-24"))).toBe(true);
  });
  it("검증 전 연락처에는 전화번호를 넣지 않는다(지어내지 않기)", () => {
    for (const c of OFFICIAL_CONTACTS.filter((x) => x.status === "pending_verification")) expect(c.phone).toBeNull();
  });
  it("전화 링크", () => expect(telHref("1577-0954")).toBe("tel:15770954"));
});

describe("콘텐츠 공개 규칙", () => {
  const card = { status: "published" as const, current_version_id: "v1" };
  const v: ContentVersion = { id: "v1", content_id: "c", version: 1, title: "t", summary: "s", body_json: {}, source_json: [], author_name: null, reviewer_name: "홍수의", reviewer_credential: "수의사", reviewed_at: "2026-09-01", next_review_at: "2027-09-01", expires_at: "2027-09-01", status: "published", change_reason: null, created_at: "" };
  it("검수·승인·만료 전인 현재 버전만 공개", () => {
    expect(isVersionPublic(card, v, "2026-09-24")).toBe(true);
    expect(isVersionPublic(card, { ...v, reviewer_name: null }, "2026-09-24")).toBe(false);
    expect(isVersionPublic(card, { ...v, status: "in_review" }, "2026-09-24")).toBe(false);
    expect(isVersionPublic(card, v, "2027-09-02")).toBe(false);
    expect(isVersionPublic({ ...card, status: "in_review" }, v, "2026-09-24")).toBe(false);
  });
  it("초기 시드 4종은 검수 전(비공개) 상태", () => {
    const { cards, versions } = seedContent();
    expect(cards.map((c) => c.slug).sort()).toEqual(["canine-brucellosis", "rabies", "sfts", "toxoplasmosis"]);
    for (const c of cards) expect(isVersionPublic(c, versions.find((v2) => v2.id === c.current_version_id))).toBe(false);
  });
  it("상태 전이", () => {
    expect(canTransition("draft", "published")).toBe(false);
    expect(canTransition("in_review", "approved")).toBe(true);
    expect(canTransition("approved", "published")).toBe(true);
    expect(canTransition("archived", "published")).toBe(false);
  });
  it("모든 감염병 글은 사람/동물 행동을 분리하고 공식 출처가 있다", () => {
    for (const z of ZOONOSES) {
      expect(z.body.humanSeekCare.length).toBeGreaterThan(0);
      expect(z.body.animalSeekVet.length).toBeGreaterThan(0);
      expect(z.sources.every((s) => s.url.startsWith("https://"))).toBe(true);
    }
  });
});

describe("긴급 콘텐츠는 진단·약·용량을 제시하지 않는다", () => {
  it("금지 표현 없음", () => {
    const text = JSON.stringify(RED_FLAGS);
    for (const w of ["mg", "투여하세요", "진단:", "먹이세요", "처방"]) expect(text).not.toContain(w);
  });
});

describe("업로드 검증", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pdf = new TextEncoder().encode("%PDF-1.7\n");
  it("정상 파일 허용", () => {
    expect(validateUpload("a.png", "image/png", png)).toMatchObject({ ok: true, ext: "png" });
    expect(validateUpload("a.pdf", "application/pdf", pdf)).toMatchObject({ ok: true });
  });
  it("확장자·MIME·내용 불일치 거부", () => {
    expect(validateUpload("a.exe", "application/octet-stream", png).ok).toBe(false);
    expect(validateUpload("a.png", "application/pdf", png).ok).toBe(false);
    expect(validateUpload("a.pdf", "application/pdf", png).ok).toBe(false);
    expect(validateUpload("a.png", "image/png", new Uint8Array(0)).ok).toBe(false);
    expect(validateUpload("a.png", "image/png", new Uint8Array(11 * 1024 * 1024)).ok).toBe(false);
  });
});

describe("법무 기능 플래그", () => {
  it("기본값 모두 false", () => {
    expect(Object.values(DEFAULT_FLAGS).every((v) => v === false)).toBe(true);
  });
  it("DB에 없는 키·알 수 없는 키는 무시", () => {
    const f = resolveFlags([{ key: "publicReviewsEnabled", enabled: true }, { key: "hack", enabled: true }]);
    expect(f.publicReviewsEnabled).toBe(true);
    expect(f.paymentsEnabled).toBe(false);
    expect("hack" in f).toBe(false);
  });
});

describe("입력 검증", () => {
  it("필수: 종·이름", () => {
    expect(petSchema.safeParse({ species: "dog", name: "" }).success).toBe(false);
    expect(petSchema.safeParse({ species: "lion", name: "a" }).success).toBe(false);
    expect(petSchema.safeParse({ species: "cat", name: "나비" }).success).toBe(true);
  });
  it("미래 생일·이상 체중·잘못된 전화 거부", () => {
    expect(petSchema.safeParse({ species: "cat", name: "a", birth_date: "2999-01-01" }).success).toBe(false);
    expect(petSchema.safeParse({ species: "cat", name: "a", weight_kg: "500" }).success).toBe(false);
    expect(petSchema.safeParse({ species: "cat", name: "a", primary_vet_phone: "<script>" }).success).toBe(false);
  });
});
