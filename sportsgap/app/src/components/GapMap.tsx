import { MAP } from '../data';
import type { RegionScore } from '../engine/score';
import { project } from '../engine/geo';
import type { Facility } from '../types';

/** 등급은 색 + 숫자(1~5) + 무늬로 함께 구분한다(색만으로 나누지 않음) */
export default function GapMap({ scores, selected, onSelect, compact, points }: {
  scores: RegionScore[];
  selected?: string;
  onSelect?: (name: string) => void;
  compact?: boolean;
  points?: Facility[];
}) {
  const by = new Map(scores.map((s) => [s.name, s]));
  return (
    <svg className={`gapmap ${compact ? 'compact' : ''}`} viewBox={`-6 -6 ${MAP.w + 12} ${MAP.h + 12}`} role={onSelect ? 'group' : 'img'} aria-label="경기도 시군별 생활체육 접근성 지도">
      <defs>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#7a1f12" strokeWidth="2.5" opacity="0.45" />
        </pattern>
      </defs>
      {MAP.regions.map((r) => {
        const s = by.get(r.name);
        const lv = s?.grade.level ?? 3;
        const sel = selected === r.name;
        return (
          <g key={r.name} className={`rg lv${lv} ${sel ? 'sel' : ''}`}
            {...(onSelect ? { role: 'button', tabIndex: 0, 'aria-pressed': sel, 'aria-label': `${r.name} 접근성 지수 ${s?.index ?? '-'}, ${s?.grade.label ?? ''}`,
              onClick: () => onSelect(r.name), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.name); } } } : {})}>
            <title>{`${r.name} · 지수 ${s?.index ?? '-'} (${s?.grade.label ?? ''})`}</title>
            <path d={r.d} />
            {lv === 1 && <path d={r.d} fill="url(#hatch)" className="hatch" />}
          </g>
        );
      })}
      {points?.map((f) => {
        const [x, y] = project(MAP, f.lat, f.lng);
        return <circle key={f.id} cx={x} cy={y} r={f.barrierFree ? 4.5 : 3} className={f.barrierFree ? 'pt bf' : 'pt'} />;
      })}
      {!compact && MAP.regions.map((r) => {
        const s = by.get(r.name);
        return (
          <g key={`l-${r.name}`} className="lbl" aria-hidden="true">
            <text x={r.cx} y={r.cy - 6}>{r.name.replace(/(시|군)$/, '')}</text>
            <text x={r.cx} y={r.cy + 16} className="num">{s?.index ?? ''}</text>
          </g>
        );
      })}
    </svg>
  );
}
