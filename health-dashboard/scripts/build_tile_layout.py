#!/usr/bin/env python3.13
"""「시군구 1칸」 타일 지도 배치 — 지역사회건강조사 조사 단위 258곳을 같은 크기 육각형 칸에 하나씩 놓는다.

실행(한 번 만들고 결과 JSON 을 커밋한다 — build_dashboard.py 는 이 스크립트를 부르지 않음):
  python3.13 scripts/build_tile_layout.py [--preview out.png]      # numpy · scipy 필요(matplotlib 은 미리보기만)

방법: 통계청 2018 시군구 경계(data/geo/sigungu_2018_topo.json) 폴리곤 중심을 단위 위치로 쓰고(자기 폴리곤이 없는 19곳은 상위 시
폴리곤 중심 둘레에 벌려 둠), 위치를 육각 격자(pointy-top, odd-r: 홀수 행이 반 칸 오른쪽) 크기로 늘린 뒤 헝가리안 최소 비용 배정
(scipy.optimize.linear_sum_assignment, 비용 = 위치–칸 중심 거리²)으로 단위마다 칸 하나를 준다. 결과가 어색한 곳은
scripts/tile_overrides.json {"코드": [col, row]} 로 고정한다(고정 칸은 배정에서 빠짐).
산출: data/tile_layout.json {version, grid, cols, rows, units:{코드:[col,row]}, sido:{시도코드:[col,row]}}
"""
from __future__ import annotations

import argparse
import json
import math
import os

import numpy as np
from scipy.optimize import linear_sum_assignment

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQ3 = math.sqrt(3)

# 「전국 시도」 범위용 17칸(손으로 정함, 실제 위치 순서). [col, row], odd-r.
SIDO_TILES = {
    # odd-r: 홀수 행은 반 칸 오른쪽 — 가로 위치 x = col + 0.5·(row 홀수)
    "004": [0, 0], "001": [1, 0], "009": [2, 0],                 # 행0: 인천 x0 · 서울 x1 · 강원 x2
    "008": [0, 1], "010": [1, 1], "014": [2, 1],                 # 행1: 경기 x0.5 · 충북 x1.5 · 경북 x2.5
    "011": [0, 2], "0071": [1, 2], "006": [2, 2], "003": [3, 2],  # 행2: 충남 x0 · 세종 x1 · 대전(006) x2 · 대구 x3
    "005": [0, 3], "012": [1, 3], "015": [2, 3], "007": [3, 3],  # 행3: 광주(005) x0.5 · 전북 x1.5 · 경남 x2.5 · 울산 x3.5
    "013": [1, 4], "002": [3, 4],                                # 행4: 전남 x1 · 부산 x3
    "016": [1, 6],                                               # 행6: 제주 x1
}


def topo_polys(topo):
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx; y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(ids):
        out = []
        for a in ids:
            seg = arcs[a] if a >= 0 else arcs[~a][::-1]
            out.extend(seg if not out else seg[1:])
        return out

    obj = list(topo["objects"].values())[0]
    for g in obj["geometries"]:
        polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"] if g["type"] == "MultiPolygon" else []
        yield g["properties"]["code"], [ring(p[0]) for p in polys]  # 바깥 고리만


def ring_centroid(r):
    """넓이 가중 중심(경도·위도, 위도 36° 기준 경도 축소)과 넓이."""
    k = math.cos(math.radians(36))
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1]):
        x0 *= k; x1 *= k
        c = x0 * y1 - x1 * y0
        a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    if abs(a) < 1e-12:
        return None, 0.0
    return (cx / (3 * a), cy / (3 * a)), abs(a) / 2


def poly_centroid(rings):
    """멀티폴리곤 중심 = 가장 큰 조각의 중심(섬이 중심을 바다로 끌지 않게)."""
    best = None
    for r in rings:
        c, a = ring_centroid(r)
        if c and (best is None or a > best[1]):
            best = (c, a)
    return best[0] if best else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spacing", type=float, default=0.25, help="칸 간격(축소 경도·위도 도 단위). 작을수록 실제 위치에 가깝고 칸이 많아짐")
    ap.add_argument("--cohesion", type=float, default=0.5, help="시도 중심 쪽으로 당기는 힘(클수록 시도가 한 덩어리)")
    ap.add_argument("--preview", default=None)
    a = ap.parse_args()

    ds = json.load(open(os.path.join(ROOT, "data/dataset.json"), encoding="utf-8"))
    R = {r["c"]: r for r in ds["regions"]}
    gm = ds["geo"]["map"]
    units = [u["c"] for u in json.load(open(os.path.join(ROOT, "data/chs2025_units.json"), encoding="utf-8"))["units"]]
    topo = json.load(open(os.path.join(ROOT, "data/geo/sigungu_2018_topo.json"), encoding="utf-8"))
    cent = {code: poly_centroid(rings) for code, rings in topo_polys(topo)}

    # 폴리곤 코드 앞 2자리(통계청) → KOSIS 시도 코드(ChoroplethMap.jsx TOPO_SIDO 와 같음). 이름이 같은 구·군(강서구·중구·고성군)이
    # 다른 시도 폴리곤에 후보로 함께 올라 있어, 같은 시도의 폴리곤만 쓴다.
    TOPO_SIDO = {"11": "001", "21": "002", "22": "003", "23": "004", "24": "005", "25": "006", "26": "007", "29": "0071",
                 "31": "008", "32": "009", "33": "010", "34": "011", "35": "012", "36": "013", "37": "014", "38": "015", "39": "016"}
    sido_code = lambda c: c[:4] if c.startswith("0071") else c[:3]

    def polys_of(code):
        same = [p for p, lst in gm.items() if code in lst and TOPO_SIDO.get(p[:2]) == sido_code(code)]
        # 시도가 바뀐 곳(군위군: 2018 경계는 경북 37310, 현재 대구 00309)은 그 코드가 첫 후보인 폴리곤
        return same or [p for p, lst in gm.items() if lst and lst[0] == code]

    pos = {}
    pending = {}
    for c in units:
        ps = polys_of(c)
        if ps:
            xs = [cent[p] for p in ps if cent.get(p)]
            pos[c] = (sum(x for x, _ in xs) / len(xs), sum(y for _, y in xs) / len(xs))
        else:
            pending.setdefault(R[c]["p"], []).append(c)
    # 자기 폴리곤이 없는 단위: 상위 시 폴리곤 중심 둘레(반지름 = 칸 간격 0.6배)에 고르게 벌려 둔다. 「동부·동탄」은 동쪽, 「서부」는 서쪽부터.
    for parent, kids in pending.items():
        ps = polys_of(parent)
        xs = [cent[p] for p in ps if cent.get(p)]
        cx, cy = sum(x for x, _ in xs) / len(xs), sum(y for _, y in xs) / len(xs)
        def ang(c):
            n = R[c]["n"]
            return 0.0 if ("동" in n and n.index("동") <= 1) else math.pi if n.startswith("서") else None
        free = [c for c in kids if ang(c) is None]
        for k, c in enumerate(kids):
            t = ang(c)
            if t is None:
                t = math.pi / 2 + 2 * math.pi * free.index(c) / max(1, len(free))
            pos[c] = (cx + 0.6 * a.spacing * math.cos(t), cy + 0.6 * a.spacing * math.sin(t))
    assert len(pos) == len(units), (len(pos), len(units))

    over = {}
    op = os.path.join(ROOT, "scripts/tile_overrides.json")
    if os.path.exists(op):
        over = {k: v for k, v in json.load(open(op, encoding="utf-8")).items() if not k.startswith("_")}

    # 격자: 칸 중심 x = W*(col + 0.5*(row&1)), y = H*row (y 아래로), W = spacing, H = spacing*√3/2
    Wd = a.spacing
    Hd = a.spacing * SQ3 / 2
    xs = np.array([pos[c][0] for c in units]); ys = np.array([pos[c][1] for c in units])
    x0, y1 = xs.min() - 3 * Wd, ys.max() + 3 * Hd
    gx = (xs - x0) / Wd
    gy = (y1 - ys) / Hd
    cols = int(math.ceil(gx.max())) + 4
    rows = int(math.ceil(gy.max())) + 4
    cells = [(c, r) for r in range(rows) for c in range(cols)]
    fixed = {tuple(v) for v in over.values()}
    cand = [cr for cr in cells if cr not in fixed]
    ccx = np.array([c + 0.5 * (r & 1) for c, r in cand]); ccy = np.array([r for _, r in cand], float) * 1.0
    todo = [k for k, c in enumerate(units) if c not in over]
    ux = gx[todo]; uy = gy[todo]
    # 거리는 격자 단위(가로 1 = 칸 간격, 세로 1 = 한 행 = √3/2 칸 간격)를 실제 비율로 되돌려 계산
    cost = (ux[:, None] - ccx[None, :]) ** 2 + ((uy[:, None] - ccy[None, :]) * SQ3 / 2) ** 2
    # 시도 응집: 같은 시도 단위들의 중심과 칸 사이 거리²를 더해, 광역시 구가 이웃 도 사이에 흩어지지 않게 한다
    sido_of = lambda c: c[:4] if c.startswith("0071") else c[:3]
    sg = {}
    for k in todo:
        sg.setdefault(sido_of(units[k]), []).append(k)
    smx = {sd: (gx[ks].mean(), gy[ks].mean()) for sd, ks in sg.items()}
    sx = np.array([smx[sido_of(units[k])][0] for k in todo]); sy = np.array([smx[sido_of(units[k])][1] for k in todo])
    cost += a.cohesion * ((sx[:, None] - ccx[None, :]) ** 2 + ((sy[:, None] - ccy[None, :]) * SQ3 / 2) ** 2)
    ri, ci = linear_sum_assignment(cost)
    out = {c: list(v) for c, v in over.items() if c in units}
    for k, j in zip(ri, ci):
        out[units[todo[k]]] = [int(cand[j][0]), int(cand[j][1])]

    # 섬 당기기: 제주·울릉·옹진처럼 본토에서 3칸 넘게 떨어진 무리는 본토 가장 가까운 칸과 2칸 거리가 되도록 통째로 옮긴다
    def xy(v):
        return (v[0] + 0.5 * (v[1] & 1), v[1] * SQ3 / 2)
    groups = {"016": [c for c in out if c.startswith("016")], "ull": [c for c in out if R[c]["n"] == "울릉군"], "ong": [c for c in out if R[c]["n"] == "옹진군"]}
    for gname, members in groups.items():
        if not members:
            continue
        rest = [xy(v) for c, v in out.items() if c not in members]
        for _ in range(60):
            dist = min(math.dist(xy(out[m]), r) for m in members for r in rest)
            if dist <= 2.05:
                break
            # 가장 가까운 본토 칸 쪽으로 한 칸(가로) 또는 두 행(세로, 홀짝 유지) 이동
            m0, r0 = min(((m, r) for m in members for r in rest), key=lambda t: math.dist(xy(out[t[0]]), t[1]))
            dx = r0[0] - xy(out[m0])[0]; dy = r0[1] - xy(out[m0])[1]
            step = [int(np.sign(dx)), 0] if abs(dx) > abs(dy) else [0, -2 if dy < 0 else 2]
            new = {m: [out[m][0] + step[0], out[m][1] + step[1]] for m in members}
            occupied = {tuple(v) for c, v in out.items() if c not in members}
            if any(tuple(v) in occupied for v in new.values()):
                break
            out.update(new)

    # 제주는 본토와 한 칸 이상 띄운다(붙어 있으면 바다 건너인 줄 모름): 가장 가까운 본토 칸과의 거리가 1.9칸 이상이 될 때까지 두 행씩 내린다
    jeju = groups["016"]
    rest = [xy(v) for c, v in out.items() if c not in jeju]
    while jeju and min(math.dist(xy(out[m]), r) for m in jeju for r in rest) < 1.9:
        for m in jeju:
            out[m] = [out[m][0], out[m][1] + 2]

    # 쓰지 않는 바깥 행·열을 잘라 0 부터 시작하게(odd-r 홀짝을 지키려고 행은 짝수만큼만 민다)
    mc = min(v[0] for v in out.values()); mr = min(v[1] for v in out.values())
    mr -= mr % 2
    for v in out.values():
        v[0] -= mc; v[1] -= mr
    cols = max(v[0] for v in out.values()) + 1
    rows = max(v[1] for v in out.values()) + 1
    assert len({tuple(v) for v in out.values()}) == len(out) == 258
    res = {"version": 1, "grid": "hex-oddr", "cols": cols, "rows": rows,
           "note": "조사 단위 258곳(지역사회건강조사) 1칸씩. 위치는 대략 — 통계청 2018 경계 중심을 헝가리안 배정으로 육각 격자에 옮김(scripts/build_tile_layout.py).",
           "units": {c: out[c] for c in units}, "sido": SIDO_TILES}
    with open(os.path.join(ROOT, "data/tile_layout.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, separators=(",", ":"))
    print(f"grid {cols}×{rows}, 258 units")

    if a.preview:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from matplotlib import font_manager as fm
        for f in fm.findSystemFonts():
            if "Nanum" in f:
                fm.fontManager.addfont(f)
        plt.rcParams["font.family"] = "NanumGothic"
        cmap = plt.get_cmap("tab20")
        sidos = sorted({sido_of(c) for c in units})
        fig, ax = plt.subplots(figsize=(cols * 0.42, rows * 0.38))
        for c in units:
            col, row = out[c]
            x = col + 0.5 * (row & 1); y = -row * SQ3 / 2
            hexagon = plt.Polygon([(x + 0.577 * math.cos(math.radians(30 + 60 * k)) * 0.98, y + 0.577 * math.sin(math.radians(30 + 60 * k)) * 0.98) for k in range(6)],
                                  color=cmap(sidos.index(sido_of(c)) % 20), alpha=0.8)
            ax.add_patch(hexagon)
            n = R[c]["n"]
            ax.text(x, y, n[:3], ha="center", va="center", fontsize=5)
        ax.set_xlim(-1, cols + 1); ax.set_ylim(-rows * SQ3 / 2, 1); ax.set_aspect("equal"); ax.axis("off")
        fig.savefig(a.preview, dpi=150, bbox_inches="tight")
        print("preview", a.preview)


if __name__ == "__main__":
    main()
