import { selectPetAction } from "@/app/actions/pets";
import type { Pet } from "@/lib/types";

/** 여러 마리 전환 (서버 액션 폼 — JS 없이도 동작) */
export function PetSwitcher({ pets, activeId, next }: { pets: Pet[]; activeId: string | null; next: string }) {
  if (pets.length < 2) return null;
  return (
    <nav aria-label="반려동물 선택" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {pets.map((p) => (
        <form key={p.id} action={selectPetAction}>
          <input type="hidden" name="pet_id" value={p.id} />
          <input type="hidden" name="next" value={next} />
          <button type="submit" aria-pressed={p.id === activeId}
            className={`btn btn-sm whitespace-nowrap ${p.id === activeId ? "btn-primary" : "btn-outline"}`}>
            <span aria-hidden="true">{p.species === "dog" ? "🐶" : "🐱"}</span> {p.name}
          </button>
        </form>
      ))}
    </nav>
  );
}
