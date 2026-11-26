// 예시 모드 저장소도 사용자별로 격리되는지 확인한다.
import { describe, expect, it } from "vitest";
import { createLocalRepo, DEMO_ADMIN_EMAIL, type KV } from "@/lib/repo/local";
import { RepoError } from "@/lib/repo/repo";

function kv(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}
const petValues = (owner: string) => ({
  owner_id: owner, species: "dog" as const, name: "콩이", birth_date: null, estimated_birth: false, sex: "unknown" as const, neutered: null,
  weight_kg: 4, registration_status: "unknown" as const, insurance_status: "unknown" as const, indoor: true, deleted_at: null,
});

describe("예시 모드 저장소", () => {
  it("로그인 없이는 개인 데이터를 쓸 수 없다", async () => {
    const repo = createLocalRepo(kv());
    await expect(repo.insert("pets", petValues("x"))).rejects.toBeInstanceOf(RepoError);
  });
  it("저장한 내용이 다시 읽히고, 다른 사용자는 읽지도 고치지도 못한다", async () => {
    const store = kv();
    const repo = createLocalRepo(store);
    await repo.auth.signIn("a@example.com");
    const a = (await repo.auth.getUser())!;
    const pet = await repo.insert("pets", petValues(a.id));
    expect(await createLocalRepo(store).get("pets", pet.id)).toMatchObject({ name: "콩이" });

    await repo.auth.signIn("b@example.com");
    expect(await repo.get("pets", pet.id)).toBeNull();
    expect(await repo.list("pets")).toHaveLength(0);
    await expect(repo.update("pets", pet.id, { name: "탈취" })).rejects.toBeInstanceOf(RepoError);
    await expect(repo.remove("pets", pet.id)).rejects.toBeInstanceOf(RepoError);

    await repo.auth.signIn("a@example.com");
    expect((await repo.get("pets", pet.id))?.name).toBe("콩이");
  });
  it("일반 사용자는 공개 정보를 바꿀 수 없고 체험용 관리자는 바꿀 수 있다", async () => {
    const repo = createLocalRepo(kv());
    await repo.auth.signIn("a@example.com");
    const [flag] = await repo.list("feature_flags", { eq: { key: "paymentsEnabled" } });
    expect(flag.enabled).toBe(false);
    await expect(repo.update("feature_flags", flag.id, { enabled: true })).rejects.toBeInstanceOf(RepoError);
    await repo.auth.signIn(DEMO_ADMIN_EMAIL);
    expect((await repo.update("feature_flags", flag.id, { enabled: true })).enabled).toBe(true);
  });
  it("감사로그는 관리자만 읽는다", async () => {
    const repo = createLocalRepo(kv());
    await repo.auth.signIn("a@example.com");
    const a = (await repo.auth.getUser())!;
    await repo.insert("audit_logs", { actor_id: a.id, action: "t", entity_type: "pets", entity_id: null, metadata_json: {} });
    expect(await repo.list("audit_logs")).toHaveLength(0);
    await repo.auth.signIn(DEMO_ADMIN_EMAIL);
    expect(await repo.list("audit_logs")).toHaveLength(1);
  });
  it("탈퇴하면 내 데이터가 모두 지워진다", async () => {
    const store = kv();
    const repo = createLocalRepo(store);
    await repo.auth.signIn("a@example.com");
    const a = (await repo.auth.getUser())!;
    const pet = await repo.insert("pets", petValues(a.id));
    await repo.auth.deleteAccount();
    expect(await repo.auth.getUser()).toBeNull();
    await repo.auth.signIn("a@example.com");
    expect(await repo.get("pets", pet.id)).toBeNull();
  });
});
