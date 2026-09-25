// 예시 모드 저장소 통합 테스트: 사용자 간 격리, 반려동물·할 일·기록·문서·보험 흐름, 탈퇴.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("server-only", () => ({}));
const dir = mkdtempSync(path.join(tmpdir(), "petsafe-demo-"));
process.env.PETSAFE_DEMO_DIR = dir;

const { createDemoStore, demoUpsertUser } = await import("@/lib/store/demo");
const { generateInitialTasks } = await import("@/lib/rules");
const { CARE_TASK_TEMPLATES } = await import("@/content/care-task-templates");
const { NotFoundError, ForbiddenError, AuthRequiredError } = await import("@/lib/store/types");

type U = Awaited<ReturnType<typeof demoUpsertUser>>;
let alice: U, bob: U, admin: U;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const petInput = { species: "dog" as const, name: "초코", sex: "unknown" as const, registration_status: "unknown" as const, insurance_status: "unknown" as const };

beforeAll(async () => {
  alice = await demoUpsertUser("alice@example.test", "admin@example.test");
  bob = await demoUpsertUser("bob@example.test", "admin@example.test");
  admin = await demoUpsertUser("admin@example.test", "admin@example.test");
});

describe("예시 모드 저장소", () => {
  it("관리자 부트스트랩 이메일만 admin 역할", () => {
    expect(alice.role).toBe("guardian");
    expect(admin.role).toBe("admin");
  });

  it("반려동물·할 일·기록·문서·보험은 소유자에게만 보인다", async () => {
    const a = createDemoStore(alice);
    const b = createDemoStore(bob);
    const pet = await a.createPet(petInput, [{ type: "allergy", name: "닭고기", note: null }]);
    await a.createTasks(pet.id, generateInitialTasks(pet, CARE_TASK_TEMPLATES));
    await a.createEvent(pet.id, { event_type: "weight", occurred_at: new Date().toISOString(), value_json: { weight_kg: 5 }, note: null });
    const doc = await a.uploadDocument(pet.id, { document_type: "receipt", original_name: "r.png", mime_type: "image/png", ext: "png" }, PNG);
    const pol = await a.createPolicy({ pet_id: pet.id, insurer: "예시", product_name: "예시", terms_version: null, joined_at: null, renewal_at: null, coverage_json: {}, deductible_json: {}, customer_center: null });

    const range = { from: "2000-01-01T00:00:00Z", to: "2100-01-01T00:00:00Z" };
    expect(await a.listTasks(pet.id, range)).toHaveLength(3);
    expect(await a.listConditions(pet.id)).toHaveLength(1);

    // bob은 alice의 pet_id를 알아도 접근할 수 없다
    expect(await b.getPet(pet.id)).toBeNull();
    expect(await b.listPets()).toHaveLength(0);
    await expect(b.listTasks(pet.id, range)).rejects.toBeInstanceOf(NotFoundError);
    await expect(b.listEvents(pet.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(b.listDocuments(pet.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(b.getDocumentDownload(doc.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(b.createTasks(pet.id, [])).rejects.toBeInstanceOf(NotFoundError);
    await expect(b.updatePet(pet.id, { ...petInput, name: "탈취" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(b.deletePet(pet.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await b.getPolicy(pol.id)).toBeNull();
    await expect(b.listTerms(pol.id)).rejects.toBeInstanceOf(NotFoundError);
    const task = (await a.listTasks(pet.id, range))[0];
    expect(await b.getTask(task.id)).toBeNull();
    await expect(b.updateTask(task.id, { status: "done" })).rejects.toBeInstanceOf(NotFoundError);

    // alice 자신은 문서를 받을 수 있다
    const dl = await a.getDocumentDownload(doc.id);
    expect(dl.kind).toBe("bytes");
    expect((await a.getPet(pet.id))?.name).toBe("초코");
  });

  it("할 일 상태는 저장 후 다시 읽어도 유지된다(새로고침·재로그인 대체)", async () => {
    const a = createDemoStore(alice);
    const pet = (await a.listPets())[0];
    const range = { from: "2000-01-01T00:00:00Z", to: "2100-01-01T00:00:00Z" };
    const t = (await a.listTasks(pet.id, range))[0];
    await a.updateTask(t.id, { status: "done", completed_at: new Date().toISOString() });
    const again = createDemoStore(alice); // 새 요청
    expect((await again.getTask(t.id))?.status).toBe("done");
  });

  it("비회원은 개인 데이터에 접근할 수 없고 공개 데이터만 본다", async () => {
    const anon = createDemoStore(null);
    await expect(anon.listPets()).rejects.toBeInstanceOf(AuthRequiredError);
    expect((await anon.listContacts()).length).toBeGreaterThan(0);
    expect(await anon.listPublicContent()).toHaveLength(0); // 검수 전 비공개
    expect((await anon.listFacilities({})).every((f) => f.is_example)).toBe(true);
    expect((await anon.getFlags()).every((f) => !f.enabled)).toBe(true);
  });

  it("검수 없이 승인할 수 없고, 검수 후 게시하면 공개된다", async () => {
    const g = createDemoStore(alice);
    await expect(g.admin.listContentWithVersions()).rejects.toBeInstanceOf(ForbiddenError);
    const ad = createDemoStore(admin);
    const [first] = await ad.admin.listContentWithVersions();
    const v = first.versions[0];
    await expect(ad.admin.setVersionStatus(v.id, "approved")).rejects.toBeInstanceOf(ForbiddenError);
    await ad.admin.reviewVersion(v.id, { reviewer_name: "홍수의", reviewer_credential: "수의사", reviewed_at: "2026-09-24", next_review_at: "2099-01-01", expires_at: "2099-01-01" });
    await ad.admin.setVersionStatus(v.id, "approved");
    await ad.admin.setVersionStatus(v.id, "published");
    const pub = await createDemoStore(null).getPublicContent(first.card.slug);
    expect(pub?.version.reviewer_name).toBe("홍수의");
  });

  it("감사로그는 관리자만 읽는다", async () => {
    await createDemoStore(alice).audit("test.action", "pet", null);
    await expect(createDemoStore(alice).admin.listAudit()).rejects.toBeInstanceOf(ForbiddenError);
    const logs = await createDemoStore(admin).admin.listAudit();
    expect(logs.some((l) => l.action === "test.action")).toBe(true);
  });

  it("구조동물 관심 조건: 본인만, 최대 5개", async () => {
    const a = createDemoStore(alice);
    const b = createDemoStore(bob);
    for (let i = 0; i < 5; i++) await a.createRescueWatch({ label: `조건${i}`, sido_code: null, sido_name: null, sigungu_code: null, sigungu_name: null, species: "dog", keyword: null });
    await expect(a.createRescueWatch({ label: "여섯", sido_code: null, sido_name: null, sigungu_code: null, sigungu_name: null, species: "dog", keyword: null })).rejects.toBeInstanceOf(ForbiddenError);
    const mine = await a.listRescueWatches();
    expect(mine).toHaveLength(5);
    expect(await b.listRescueWatches()).toHaveLength(0);
    await b.deleteRescueWatch(mine[0].id); // 남의 것은 지워지지 않는다
    expect(await a.listRescueWatches()).toHaveLength(5);
    await a.deleteRescueWatch(mine[0].id);
    expect(await a.listRescueWatches()).toHaveLength(4);
  });

  it("탈퇴하면 개인 데이터가 모두 삭제된다", async () => {
    const a = createDemoStore(alice);
    const before = await a.exportMyData();
    expect((before.pets as unknown[]).length).toBe(1);
    expect(await a.deleteMyAccount()).toBe("deleted");
    const again = await demoUpsertUser("alice@example.test", "");
    expect(again.id).not.toBe(alice.id);
    expect(await createDemoStore(again).listPets()).toHaveLength(0);
  });
});
