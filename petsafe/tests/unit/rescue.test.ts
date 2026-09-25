import { describe, expect, it } from "vitest";
import { daysLeft, detailUrl, extractItems, isNewSince, matchesFilter, normalizeRescue } from "@/lib/rescue/normalize";
import { rescueFixture } from "@/content/rescue-fixture";

const v2 = {
  desertionNo: "448567202600123", happenDt: "20260920", happenPlace: "○○동 공원", upKindCd: "417000", upKindNm: "개", kindNm: "말티즈",
  colorCd: "흰색", age: "2020(년생)", weight: "3(Kg)", noticeNo: "서울-강남-2026-00123", noticeSdt: "20260921", noticeEdt: "20261001",
  popfile1: "http://openapi.animal.go.kr/openapi/service/rest/fileDownloadSrvc/files/shelter/2026/09/a.jpg",
  processState: "보호중", sexCd: "F", neuterYn: "Y", specialMark: "분홍 옷", careNm: "강남구 보호소", careTel: "02-123-4567", careAddr: "서울 강남구", orgNm: "서울특별시 강남구",
};

describe("구조동물 정규화", () => {
  it("v2 필드", () => {
    const a = normalizeRescue(v2)!;
    expect(a).toMatchObject({ id: "448567202600123", species: "dog", breed: "말티즈", sex: "F", neuter: "Y", foundDate: "2026-09-20", noticeEnd: "2026-10-01", shelterTel: "02-123-4567", isExample: false });
    expect(a.photo).toMatch(/^https:\/\//); // 혼합 콘텐츠 방지
    expect(detailUrl(a)).toContain("desertionNo=448567202600123");
  });
  it("v1 필드(kindCd '[고양이] 코리안 숏헤어', popfile)", () => {
    const a = normalizeRescue({ desertionNo: "1", kindCd: "[고양이] 코리안 숏헤어", popfile: "https://x/y.jpg", sexCd: "x", neuterYn: "", careTel: "<b>" })!;
    expect(a).toMatchObject({ species: "cat", speciesLabel: "고양이", breed: "코리안 숏헤어", sex: "Q", neuter: "U", shelterTel: null, photo: "https://x/y.jpg" });
  });
  it("유기번호 없으면 버린다, 잘못된 사진 주소는 비운다", () => {
    expect(normalizeRescue({ kindNm: "x" })).toBeNull();
    expect(normalizeRescue({ desertionNo: "2", popfile1: "javascript:alert(1)" })!.photo).toBeNull();
  });
});

describe("API 응답 꺼내기", () => {
  it("여러 건·한 건·빈 결과·인증 오류", () => {
    expect(extractItems({ response: { header: { resultCode: "00" }, body: { items: { item: [v2, v2] }, totalCount: 2 } } }).items).toHaveLength(2);
    expect(extractItems({ response: { header: { resultCode: "00" }, body: { items: { item: v2 }, totalCount: 1 } } }).items).toHaveLength(1);
    expect(extractItems({ response: { header: { resultCode: "00" }, body: { items: "", totalCount: 0 } } }).items).toHaveLength(0);
    expect(extractItems({ OpenAPI_ServiceResponse: { cmmMsgHeader: { errMsg: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR" } } }).error).toBe("SERVICE_KEY_IS_NOT_REGISTERED_ERROR");
    expect(extractItems({ response: { header: { resultCode: "22", resultMsg: "LIMITED" } } }).error).toBe("LIMITED");
  });
});

describe("필터·날짜", () => {
  const a = normalizeRescue(v2)!;
  it("키워드는 모든 단어가 포함돼야 한다", () => {
    expect(matchesFilter(a, { keyword: "흰색 말티즈" })).toBe(true);
    expect(matchesFilter(a, { keyword: "흰색 푸들" })).toBe(false);
    expect(matchesFilter(a, { keyword: "분홍옷" })).toBe(true); // 띄어쓰기 무시
    expect(matchesFilter(a, { species: "cat" })).toBe(false);
    expect(matchesFilter(a, { sex: "M" })).toBe(false);
    expect(matchesFilter(a, { region: "강남구" })).toBe(true);
  });
  it("공고 남은 날", () => {
    expect(daysLeft("2026-10-01", "2026-09-28")).toBe(3);
    expect(daysLeft("2026-10-01", "2026-10-01")).toBe(0);
    expect(daysLeft("2026-10-01", "2026-10-03")).toBe(-2);
    expect(daysLeft(null, "2026-10-01")).toBeNull();
  });
  it("새 공고 판정은 기준일 '이후'만", () => {
    expect(isNewSince(a, "2026-09-20")).toBe(true);
    expect(isNewSince(a, "2026-09-21")).toBe(false);
    expect(isNewSince(a, null)).toBe(false);
  });
  it("예시 공고는 모두 '예시'로 표시되고 전화번호가 가짜 형식이다", () => {
    const rows = rescueFixture("2026-09-25").map((r) => normalizeRescue(r, true)!);
    expect(rows.every((r) => r.isExample && r.shelterName.includes("예시") && r.shelterTel!.startsWith("02-000-"))).toBe(true);
  });
});
