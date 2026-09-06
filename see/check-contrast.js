// 대비비 자동 검증 — CLAUDE.md 6장. 실패 시 exit 1.
// 실행: node see/check-contrast.js
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

const tokens = {};
for (const m of html.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) tokens[m[1]] = m[2];

function lum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (h + 0.05) / (l + 0.05);
}

// [전경, 배경, 최소, 설명]
const checks = [
  ['ink',    'bg',        7,   '본문 (WCAG 1.4.6 AAA 목표)'],
  ['ink-2',  'bg',        4.5, '보조 텍스트 (WCAG 1.4.3 AA)'],
  ['btn-ink','btn-bg',    7,   '버튼 글자'],
  ['btn-ink','btn-on-bg', 4.5, '선택된 토글 글자'],
  ['line',   'bg',        3,   'UI 테두리 (WCAG 1.4.11)'],
  ['btn-on-bg','bg',      3,   '선택된 토글 배경 vs 페이지'],
  ['focus',  'bg',        3,   '포커스 링'],
];

let fail = 0;
for (const [fg, bg, min, why] of checks) {
  if (!tokens[fg] || !tokens[bg]) { console.log(`✗ 토큰 없음: ${fg} / ${bg}`); fail++; continue; }
  const r = ratio(tokens[fg], tokens[bg]);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${why}: ${fg} on ${bg} = ${r.toFixed(2)}:1 (최소 ${min}:1)`);
}
if (fail) { console.log(`\n${fail}건 실패`); process.exit(1); }
console.log('\n모든 대비 기준 통과');
