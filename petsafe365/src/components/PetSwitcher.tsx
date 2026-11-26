"use client";
import type { usePets } from "@/lib/hooks";

type PetsState = Pick<ReturnType<typeof usePets>, "pets" | "current" | "select">;

const SPECIES: Record<string, string> = { dog: "강아지", cat: "고양이" };

/**
 * 여러 아이 사이를 오가는 전환기. usePets() 의 결과를 그대로 넘겨 쓴다.
 * (usePets 는 호출한 곳마다 선택 상태를 따로 갖기 때문에, 화면이 가진 상태를 받아야 화면과 함께 바뀐다.)
 */
export function PetSwitcher({ pets, current, select, label = "어느 아이를 볼까요?" }: PetsState & { label?: string }) {
  if (pets.length === 0 || !current) return null;
  if (pets.length === 1) {
    return (
      <p className="text-muted">
        <span className="font-semibold text-ink">{current.name}</span> · {SPECIES[current.species] ?? ""}
      </p>
    );
  }
  if (pets.length > 4) {
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor="pet-switcher" className="text-sm font-medium text-muted">
          {label}
        </label>
        <select id="pet-switcher" value={current.id} onChange={(e) => select(e.target.value)} className="min-h-12 w-full rounded-[12px] border border-line bg-card px-3 text-base text-ink">
          {pets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({SPECIES[p.species] ?? ""})
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {pets.map((p) => {
        const on = p.id === current.id;
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            onClick={() => select(p.id)}
            className={`inline-flex min-h-12 max-w-full items-center gap-1.5 rounded-full border px-4 font-semibold ${on ? "border-brand bg-tint text-brand" : "border-line bg-card text-muted hover:text-ink"}`}
          >
            <span className="truncate">{p.name}</span>
            <span className="shrink-0 text-sm font-normal">{SPECIES[p.species] ?? ""}</span>
          </button>
        );
      })}
    </div>
  );
}
