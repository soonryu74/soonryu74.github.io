import type { Metadata } from "next";
import { getStore } from "@/lib/session";
import { getActivePet } from "@/lib/guard";
import { RED_FLAGS, EMERGENCY_DISCLAIMER } from "@/content/emergency";
import { EmergencyTool } from "./emergency-tool";

export const metadata: Metadata = { title: "긴급 도움" };

export default async function EmergencyPage() {
  const store = await getStore();
  let pets: { id: string; name: string; vetName: string | null; vetPhone: string | null }[] = [];
  let activeId: string | null = null;
  if (store.user) {
    try {
      const r = await getActivePet(store);
      pets = r.pets.map((p) => ({ id: p.id, name: p.name, vetName: p.primary_vet_name, vetPhone: p.primary_vet_phone }));
      activeId = r.active?.id ?? null;
    } catch { /* 긴급 화면은 데이터 오류가 있어도 항상 열려야 한다 */ }
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="h1 text-danger">긴급 도움</h1>
        <p className="mt-1 font-bold">{EMERGENCY_DISCLAIMER}</p>
      </div>
      <EmergencyTool flags={RED_FLAGS} pets={pets} activeId={activeId} loggedIn={!!store.user} />
    </div>
  );
}
