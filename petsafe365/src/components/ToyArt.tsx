import type { Product } from "@/lib/types";

const LEATHER = "#B5763A";
const LEAF = "#4E8A4A";
const LABEL: Record<Product["material"], string> = {
  leather: "가죽으로 만든 뼈 모양 장난감 그림",
  wool_felt: "울 펠트로 만든 잎 모양 장난감 그림",
  set: "가죽 뼈 장난감과 울 펠트 잎 장난감 세트 그림",
};

function Bone({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <circle cx="38" cy="46" r="15" fill={LEATHER} />
      <circle cx="38" cy="74" r="15" fill={LEATHER} />
      <circle cx="162" cy="46" r="15" fill={LEATHER} />
      <circle cx="162" cy="74" r="15" fill={LEATHER} />
      <rect x="38" y="44" width="124" height="32" rx="12" fill={LEATHER} />
      {/* 손바느질 실밥 */}
      <path d="M52 52 H148 M52 68 H148" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" />
    </g>
  );
}

function Leaf({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <path d="M30 60 C55 12 135 8 176 54 C140 108 60 108 30 60 Z" fill={LEAF} />
      <path d="M30 60 L14 66" fill="none" stroke={LEAF} strokeWidth="7" strokeLinecap="round" />
      <path d="M40 60 C80 54 125 54 164 55 M78 57 L64 40 M78 57 L66 76 M110 55 L98 34 M110 55 L100 80 M140 55 L132 38 M140 55 L134 74" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

/** 상품 재질에 맞는 간단한 그림. 실제 사진이 아니므로 과장하지 않는다. */
export function ToyArt({ material, className = "" }: { material: Product["material"]; className?: string }) {
  return (
    <svg viewBox="0 0 200 120" role="img" aria-label={LABEL[material]} className={`h-auto w-full text-ink ${className}`}>
      {material === "leather" ? <Bone /> : null}
      {material === "wool_felt" ? <Leaf /> : null}
      {material === "set" ? (
        <>
          <Bone transform="translate(4 -6) scale(0.62) rotate(-8 100 60)" />
          <Leaf transform="translate(72 44) scale(0.62) rotate(10 100 60)" />
        </>
      ) : null}
    </svg>
  );
}
