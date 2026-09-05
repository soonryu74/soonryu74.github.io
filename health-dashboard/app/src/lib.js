// 공용 헬퍼: 값 포맷, 순위 정렬, 색상 스케일

export const fmt = (v) => (v == null ? "–" : v.toFixed(1));

// "양호한 순" 정렬: bad(낮을수록 양호)면 오름차순. 결측 지역 제외.
export function rankSorted(sido, d, yearIdx) {
  return sido
    .map((s) => [s, d.sido[s][yearIdx]])
    .filter(([, v]) => v != null)
    .sort((a, b) => (d.bad ? a[1] - b[1] : b[1] - a[1]));
}

// 단계구분 색: seq 팔레트 7단계 인덱스(1~7)와 어두운 배경 여부
export function seqStep(v, min, max) {
  const t = max === min ? 0.5 : (v - min) / (max - min);
  return { step: Math.min(7, Math.floor(t * 7) + 1), dark: t > 0.45 };
}

// 결측 구간을 건너뛰는 SVG path
export function pathOf(arr, x, y) {
  let out = "", pen = false;
  arr.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    out += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1);
    pen = true;
  });
  return out;
}

// 포인터 좌표 → 가장 가까운 연도 인덱스
export function nearestIndex(ev, svgEl, W, L, R, n) {
  const pt = ev.touches ? ev.touches[0] : ev;
  const box = svgEl.getBoundingClientRect();
  const px = ((pt.clientX - box.left) / box.width) * W;
  return Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1))));
}

export function clientXY(ev) {
  const pt = ev.touches ? ev.touches[0] : ev;
  return { x: pt.clientX, y: pt.clientY };
}
