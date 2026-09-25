import { describe, expect, it } from "vitest";
import { epsg5174ToWgs84, haversineKm, kakaoDirectionsUrl } from "@/lib/geo";

describe("좌표 변환", () => {
  it("EPSG:5174 → WGS84 (서울시청 인근)", () => {
    // 서울시청(37.5665, 126.9780)을 같은 정의로 정변환한 값을 되돌려 1m 이내로 일치하는지
    const r = epsg5174ToWgs84(197986.727, 451579.894);
    expect(r).not.toBeNull();
    expect(r!.lat).toBeCloseTo(37.5665, 4);
    expect(r!.lng).toBeCloseTo(126.978, 4);
  });

  it("0·비정상 좌표는 null", () => {
    expect(epsg5174ToWgs84(0, 0)).toBeNull();
    expect(epsg5174ToWgs84(Number.NaN, 1)).toBeNull();
    expect(epsg5174ToWgs84(9_000_000, 9_000_000)).toBeNull();
  });

  it("거리 계산", () => {
    const d = haversineKm({ lat: 37.5665, lng: 126.978 }, { lat: 37.4979, lng: 127.0276 });
    expect(d).toBeGreaterThan(8);
    expect(d).toBeLessThan(9.5);
  });

  it("길찾기 링크", () => {
    expect(kakaoDirectionsUrl("예시 병원", 37.5, 127)).toBe("https://map.kakao.com/link/to/%EC%98%88%EC%8B%9C%20%EB%B3%91%EC%9B%90,37.5,127");
  });
});
