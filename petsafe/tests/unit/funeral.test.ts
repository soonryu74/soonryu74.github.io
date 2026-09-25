import { describe, expect, it } from "vitest";
import { findByName, normalizeName, parseFuneralList, sidoOf } from "@/lib/funeral/parse";
import data from "@/content/funeral-businesses.json";

const HTML = `<table><tbody>
<tr>
  <th scope="row" data-title="번호">88</th>
  <td data-title="취급업종">장례, 화장, 봉안</td>
  <td data-title="업체명">포포즈 반려동물 장례식장 세종점</td>
  <td data-title="전화번호"><a href='tel:1588-2888'>1588-2888</a></td>
  <td data-title="소재지" class="text-left">
    세종시 부강로 시목부강로
  </td>
  <td data-title="홈페이지" class="text-left"><a href="http://fourpaws.co.kr" target="_blank">http://fourpaws.co.kr</a></td>
</tr>
<tr>
  <th scope="row" data-title="번호">79</th>
  <td data-title="취급업종">장례, 건조, 봉안</td>
  <td data-title="업체명">㈜하늘정원</td>
  <td data-title="전화번호"></td>
  <td data-title="소재지" class="text-left">안산시 상록구 예시길</td>
  <td data-title="홈페이지" class="text-left">-</td>
</tr>
</tbody></table>`;

describe("장묘업 목록 파싱", () => {
  const list = parseFuneralList(HTML);
  it("행·필드", () => {
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ no: 88, facilities: ["장례", "화장", "봉안"], phone: "1588-2888", address: "세종시 부강로 시목부강로", homepage: "http://fourpaws.co.kr", sido: "세종특별자치시" });
    expect(list[1]).toMatchObject({ phone: null, homepage: null, sido: "경기도", facilities: ["장례", "건조", "봉안"] });
  });
  it("시·도 판정", () => {
    expect(sidoOf("서울 마포구 성지5길")).toBe("서울특별시");
    expect(sidoOf("충북 음성군")).toBe("충청북도");
    expect(sidoOf("전남광주통합특별시 목포시")).toBe("전남광주통합특별시");
    expect(sidoOf("어딘가")).toBe("주소 확인 필요");
  });
  it("이름 확인은 (주)·공백 차이를 무시", () => {
    expect(normalizeName("(주) 하늘 정원")).toBe("하늘정원");
    expect(findByName(list, "하늘정원")).toHaveLength(1);
    expect(findByName(list, "포포즈")).toHaveLength(1);
    expect(findByName(list, "없는업체")).toHaveLength(0);
    expect(findByName(list, "   ")).toHaveLength(0);
  });
  it("수집 스냅숏은 원문 전체 건수와 일치하고 출처가 있다", () => {
    expect(data.items.length).toBe(data.total);
    expect(data.items.length).toBeGreaterThan(50);
    expect(data.sourceUrl).toMatch(/^https:\/\/www\.animal\.go\.kr\//);
    expect(data.items.every((b) => b.name && b.address)).toBe(true);
  });
});
