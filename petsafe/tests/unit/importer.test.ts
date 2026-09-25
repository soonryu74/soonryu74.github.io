import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mapStatus, mergeCandidates, normalizeHospital, planUpsert } from "@/lib/importers/animal-hospital";

const items = JSON.parse(readFileSync("tests/fixtures/animal-hospitals.sample.json", "utf8")).items as Record<string, unknown>[];

describe("동물병원 수집기", () => {
  const results = items.map((r) => normalizeHospital(r, { isExample: true }));
  const rows = results.flatMap((r) => (r.ok ? [r.row] : []));

  it("정규화: 좌표 변환·상태·빈 전화·오류 행", () => {
    expect(rows).toHaveLength(4);
    expect(results.filter((r) => !r.ok)).toHaveLength(1);
    const a = rows.find((r) => r.source_id === "EX-0001")!;
    expect(a.lat).toBeCloseTo(37.5665, 3);
    expect(a.coord_source).toBe("epsg5174_converted");
    expect(a.business_status).toBe("open");
    expect(a.is_example).toBe(true);
    const b = rows.find((r) => r.source_id === "EX-0002")!;
    expect(b.lat).toBeNull();
    expect(b.phone).toBeNull();
    expect(b.business_status).toBe("closed");
    expect(rows.find((r) => r.source_id === "EX-0003")!.business_status).toBe("suspended");
  });

  it("상태 매핑", () => {
    expect(mapStatus("취소/말소/만료/정지/중지", null)).toBe("closed");
    expect(mapStatus(null, null)).toBe("unknown");
  });

  it("upsert 계획: 신규·변경·상태 이력·중복 제외", () => {
    const first = planUpsert(rows, []);
    expect(first.insert).toHaveLength(4);
    const existing = rows.map((r) => ({ ...r }));
    // 같은 데이터로 다시 돌리면 변경 없음
    const again = planUpsert(rows, existing);
    expect(again.insert).toHaveLength(0);
    expect(again.update).toHaveLength(0);
    // EX-0001 폐업 전환
    const changed = rows.map((r) => (r.source_id === "EX-0001" ? { ...r, business_status: "closed" as const, source_updated_at: "2026-09-20T00:00:00.000Z" } : r));
    const third = planUpsert(changed, existing);
    expect(third.update.map((r) => r.source_id)).toEqual(["EX-0001"]);
    expect(third.statusChanges).toEqual([{ source_id: "EX-0001", from: "open", to: "closed" }]);
    // 배치 안 중복
    const dup = planUpsert([rows[0], rows[0]], []);
    expect(dup.insert).toHaveLength(1);
    expect(dup.skipped[0]).toMatch(/duplicate/);
  });

  it("중복 병합 후보(자동 병합 안 함)", () => {
    expect(mergeCandidates(rows)).toEqual([["EX-0001", "EX-0004"]]);
  });
});
