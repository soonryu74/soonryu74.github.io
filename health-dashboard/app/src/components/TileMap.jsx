import { fmt, seqStep, clientXY } from "../lib";

const TILE_POS = {
  서울: [1, 0], 강원: [3, 0], 인천: [0, 1], 경기: [1, 1], 충북: [2, 1], 경북: [3, 1],
  충남: [0, 2], 세종: [1, 2], 대전: [2, 2], 대구: [3, 2], 울산: [4, 2],
  전북: [1, 3], 경남: [2, 3], 부산: [3, 3], 광주: [0, 4], 전남: [1, 4], 제주: [0, 5],
};
const CELL = 86, GAP = 6, OX = 30, OY = 6, ROWH = 42;

export default function TileMap({ d, sido, region, yearIdx, onSelect, setTip, indName }) {
  const vals = sido.map((s) => d.sido[s][yearIdx]).filter((v) => v != null);
  const min = Math.min(...vals), max = Math.max(...vals);

  return (
    <svg viewBox="0 0 560 300" width="100%" role="img" aria-label="시도별 단계구분 타일맵">
      {sido.map((s) => {
        const [cx, cy] = TILE_POS[s];
        const v = d.sido[s][yearIdx];
        const { step, dark } = v == null ? { step: 0, dark: false } : seqStep(v, min, max);
        const fill = v == null ? "var(--grid)" : `var(--seq-${step}00)`;
        const sel = s === region;
        const onMove = (ev) => {
          const { x, y } = clientXY(ev);
          setTip({ x, y, title: s, rows: [[indName, fmt(v) + d.unit]] });
        };
        return (
          <g key={s} className="tile" transform={`translate(${OX + cx * (CELL + GAP)},${OY + cy * (ROWH + GAP)})`}
             onClick={() => onSelect(s)} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
            <rect width={CELL} height={ROWH} rx="8" style={{ fill, stroke: sel ? "var(--text-primary)" : "var(--border)" }}
              strokeWidth={sel ? 2 : 1} />
            {/* 타일 배경은 테마와 무관한 팔레트라 글자색은 고정 */}
            <text className="tname" x="8" y="17" fill={dark ? "#fff" : "#0b0b0b"}>{s}</text>
            <text className="tval" x="8" y="32" fill={dark ? "rgba(255,255,255,.85)" : "rgba(11,11,11,.72)"}>{fmt(v)}</text>
          </g>
        );
      })}
      {[1, 2, 3, 4, 5, 6, 7].map((n, k) => (
        <rect key={n} x="512" y={40 + k * 24} width="14" height="22" rx="3" style={{ fill: `var(--seq-${n}00)` }} />
      ))}
      <text className="axis" x="534" y="52">낮음</text>
      <text className="axis" x="534" y={40 + 6 * 24 + 14}>높음</text>
    </svg>
  );
}
