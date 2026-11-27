#!/usr/bin/env python3.13
"""육각형 건강 지도(map/) 자료 만들기 — usaciv(MIT, Andrej Karpathy) 의 화면 자료 규격(docs/DATA_CONTRACTS.md v2)에 맞춘
한국판 world / cities / states / nation / lenses / sources JSON.

실행(python3.13: numpy · tifffile · imagecodecs · matplotlib 필요):
  python3.13 scripts/kmap/build_kmap.py --raw <원자료 폴더> --health <export_health.mjs 산출 JSON> --out map/data

원자료 폴더(<raw>)는 저장소에 넣지 않는다(내려받기 주소는 sources.json 에 기록):
  dem/   Copernicus DEM GLO-90 1°×1° 타일(Copernicus_DSM_COG_30_N{lat}_00_E{lon}_00_DEM.tif)
  wc/    ESA WorldCover 2021 v200 3°×3° 타일(ESA_WorldCover_10m_2021_v200_N{lat}E{lon}_Map.tif) — 80 m 개관 단계만 읽음
  etopo/ etopo_kr.csv(NOAA ETOPO1, ERDDAP etopo180, 바다 깊이)
  ne/    Natural Earth v5.1.2 10m geojson(나라·강·호수)

좌표: Albers 등적원추(표준위선 34°·38°, 중앙경선 127.5°E). 화면 단위 = 0.1 km(SCALE 10) — usaciv 의 그림 크기(육각형 반지름 25
단위)를 그대로 쓰면서 실제 칸 반지름은 2.5 km(칸 넓이 약 16 km²)가 되게 한다. 결측은 null(0 으로 바꾸지 않음).
"""
from __future__ import annotations

import argparse
import csv
import glob
import json
import math
import os
from collections import Counter
from datetime import datetime, timezone

import numpy as np
import shapely
import tifffile
from matplotlib.path import Path as MPath

SCALE = 10.0  # map units per km
R_EARTH = 6371.0088
RADIUS = 25.0  # hex circumradius in map units (= 2.5 km)
BBOX = (124.35, 32.95, 131.95, 38.75)  # lon0, lat0, lon1, lat1 (독도 131.87°E 포함)
MARGIN = 200.0
SQ3 = math.sqrt(3)

# ── projection ────────────────────────────────────────────────────────────────────────────────────────────────────
class Albers:
    def __init__(self, lat1=34.0, lat2=38.0, lat0=36.0, lon0=127.5):
        p1, p2, p0 = map(math.radians, (lat1, lat2, lat0))
        self.lon0 = math.radians(lon0)
        self.n = (math.sin(p1) + math.sin(p2)) / 2
        self.c = math.cos(p1) ** 2 + 2 * self.n * math.sin(p1)
        self.rho0 = R_EARTH * math.sqrt(self.c - 2 * self.n * math.sin(p0)) / self.n

    def fwd(self, lon, lat):
        lon = np.asarray(lon, float); lat = np.asarray(lat, float)
        rho = R_EARTH * np.sqrt(self.c - 2 * self.n * np.sin(np.radians(lat))) / self.n
        th = self.n * (np.radians(lon) - self.lon0)
        return rho * np.sin(th), self.rho0 - rho * np.cos(th)

    def inv(self, x, y):
        dy = self.rho0 - y
        rho = np.hypot(x, dy)
        th = np.arctan2(x, dy)
        s = (self.c - (rho * self.n / R_EARTH) ** 2) / (2 * self.n)
        return np.degrees(self.lon0 + th / self.n), np.degrees(np.arcsin(np.clip(s, -1, 1)))


ALB = Albers()
_bx = np.concatenate([np.linspace(BBOX[0], BBOX[2], 50), np.full(50, BBOX[2]), np.linspace(BBOX[0], BBOX[2], 50), np.full(50, BBOX[0])])
_by = np.concatenate([np.full(50, BBOX[1]), np.linspace(BBOX[1], BBOX[3], 50), np.full(50, BBOX[3]), np.linspace(BBOX[1], BBOX[3], 50)])
_px, _py = ALB.fwd(_bx, _by)
MIN_X, MAX_X, MIN_Y, MAX_Y = _px.min(), _px.max(), _py.min(), _py.max()
WIDTH = (MAX_X - MIN_X) * SCALE + 2 * MARGIN
HEIGHT = (MAX_Y - MIN_Y) * SCALE + 2 * MARGIN


def to_map(lon, lat):
    x, y = ALB.fwd(lon, lat)
    return (x - MIN_X) * SCALE + MARGIN, (MAX_Y - y) * SCALE + MARGIN


def to_lonlat(mx, my):
    return ALB.inv((np.asarray(mx) - MARGIN) / SCALE + MIN_X, MAX_Y - (np.asarray(my) - MARGIN) / SCALE)


# ── hex grid (odd-r, pointy-top; usaciv pipeline/core/hexgrid.py 와 같은 배치) ─────────────────────────────────────────
COLS = math.ceil(WIDTH / (SQ3 * RADIUS)) + 1
ROWS = math.ceil(HEIGHT / (1.5 * RADIUS)) + 1
N = COLS * ROWS
_idx = np.arange(N)
CX = SQ3 * RADIUS * (_idx % COLS + 0.5 * ((_idx // COLS) & 1))
CY = 1.5 * RADIUS * (_idx // COLS)
NB = (((1, 0), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1)), ((1, 0), (1, 1), (0, 1), (-1, 0), (0, -1), (1, -1)))


def neighbours(i):
    c, r = i % COLS, i // COLS
    out = []
    for dc, dr in NB[r & 1]:
        cc, rr = c + dc, r + dr
        if 0 <= cc < COLS and 0 <= rr < ROWS:
            out.append(rr * COLS + cc)
    return out


def cell_at(x, y):
    """Index of the hex containing (x, y), or -1 (usaciv hexgrid.cell_at)."""
    q = (SQ3 / 3 * x - y / 3) / RADIUS
    r = (2 / 3 * y) / RADIUS
    cx, cz = q, r
    cy = -cx - cz
    rx, ry, rz = math.floor(cx + 0.5), math.floor(cy + 0.5), math.floor(cz + 0.5)
    dx, dy, dz = abs(rx - cx), abs(ry - cy), abs(rz - cz)
    if dx > dy and dx > dz:
        rx = -ry - rz
    elif dy <= dz:
        rz = -rx - ry
    row = rz
    col = rx + (row - (row & 1)) // 2
    return row * COLS + col if 0 <= col < COLS and 0 <= row < ROWS else -1


def hex_lattice(step_frac):
    """Offsets of a triangular lattice inside a pointy-top hex of circumradius RADIUS."""
    s = RADIUS * step_frac
    pts = []
    k = int(RADIUS / s) + 2
    for j in range(-k, k + 1):
        for i in range(-k, k + 1):
            x = (i + 0.5 * (j & 1)) * s
            y = j * s * SQ3 / 2
            if abs(x) <= SQ3 / 2 * RADIUS * 0.98 and abs(y) <= (RADIUS - abs(x) / SQ3) * 0.98:
                pts.append((x, y))
    return np.array(pts)


SAMPLE7 = np.array([(0, 0)] + [(0.55 * RADIUS * math.cos(math.radians(30 + 60 * k)), 0.55 * RADIUS * math.sin(math.radians(30 + 60 * k))) for k in range(6)])
LAT = hex_lattice(0.2)  # ~90 points, ~500 m apart


# ── shapely helpers ─────────────────────────────────────────────────────────────────────────────────────────────────
HEXC = np.array([(RADIUS * math.cos(math.radians(30 + 60 * k)), RADIUS * math.sin(math.radians(30 + 60 * k))) for k in range(6)])


def project_geom(g):
    def ring(r):
        a = np.array(r)[:, :2]
        x, y = to_map(a[:, 0], a[:, 1])
        return np.column_stack([x, y])
    polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    return shapely.MultiPolygon([shapely.Polygon(ring(p[0]), [ring(h) for h in p[1:]]) for p in polys])


def rings_flat(geom):
    out = []
    for p in getattr(geom, "geoms", [geom]):
        if p.is_empty or p.geom_type != "Polygon":
            continue
        for r in [p.exterior, *p.interiors]:
            c = np.asarray(r.coords)
            if len(c) >= 4:
                out.append([round(float(v), 1) for v in c.ravel()])
    return out


def lines_flat(geom):
    out = []
    for l in getattr(geom, "geoms", [geom]):
        if l.is_empty:
            continue
        c = np.asarray(l.coords)
        if len(c) >= 2:
            out.append([round(float(v), 1) for v in c.ravel()])
    return out


# ── polygons ──────────────────────────────────────────────────────────────────────────────────────────────────────
def topo_rings(topo):
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
    res = []
    for g in obj["geometries"]:
        polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"] if g["type"] == "MultiPolygon" else []
        res.append((g["properties"], [ring(r) for p in polys for r in p]))
    return res


def geo_rings(geom):
    t, c = geom["type"], geom["coordinates"]
    polys = [c] if t == "Polygon" else c if t == "MultiPolygon" else []
    return [[(p[0], p[1]) for p in r] for poly in polys for r in poly]


class PolySet:
    """Even-odd point-in-polygon over projected rings (matplotlib Path per ring, bbox pre-filter)."""

    def __init__(self, rings_list):
        self.items = []
        for k, rings in enumerate(rings_list):
            for r in rings:
                if len(r) < 3:
                    continue
                a = np.array(r)
                mx, my = to_map(a[:, 0], a[:, 1])
                xy = np.column_stack([mx, my])
                self.items.append((k, MPath(xy), xy[:, 0].min(), xy[:, 1].min(), xy[:, 0].max(), xy[:, 1].max()))

    def locate(self, px, py):
        out = np.full(px.shape, -1, int)
        par = {}
        pts = np.column_stack([px, py])
        for k, path, x0, y0, x1, y1 in self.items:
            m = (px >= x0) & (px <= x1) & (py >= y0) & (py <= y1)
            if not m.any():
                continue
            ins = np.zeros(px.shape, bool)
            ins[m] = path.contains_points(pts[m])
            if ins.any():
                key = par.setdefault(k, np.zeros(px.shape, bool))
                key ^= ins
        for k, inside in par.items():
            out[inside] = k
        return out


# ── rasters ───────────────────────────────────────────────────────────────────────────────────────────────────────
class DEM:
    def __init__(self, folder):
        self.tiles = {}
        for f in glob.glob(os.path.join(folder, "Copernicus_DSM_COG_30_N*_00_E*_00_DEM.tif")):
            b = os.path.basename(f)
            lat = int(b.split("_N")[1][:2]); lon = int(b.split("_E")[1][:3])
            self.tiles[(lat, lon)] = f
        self.cache = {}

    def arr(self, key):
        if key not in self.cache:
            self.cache[key] = tifffile.imread(self.tiles[key]) if key in self.tiles else None
        return self.cache[key]

    def sample(self, lon, lat):
        out = np.full(lon.shape, np.nan)
        flat, flon = np.floor(lat).astype(int), np.floor(lon).astype(int)
        for key in set(zip(flat.tolist(), flon.tolist())):
            a = self.arr(key)
            if a is None:
                continue
            m = (flat == key[0]) & (flon == key[1])
            h, w = a.shape
            r = np.clip(((key[0] + 1 - lat[m]) * h).astype(int), 0, h - 1)
            c = np.clip(((lon[m] - key[1]) * w).astype(int), 0, w - 1)
            out[m] = a[r, c]
        return out


class WorldCover:
    """ESA WorldCover 2021 — reads the overview level nearest 80 m of each 3°×3° tile (nodata 0)."""

    def __init__(self, folder, target_m=80):
        self.tiles = {}
        for f in glob.glob(os.path.join(folder, "ESA_WorldCover_10m_2021_v200_N*E*_Map.tif")):
            b = os.path.basename(f).split("_")[5]
            self.tiles[(int(b[1:3]), int(b[4:7]))] = f
        self.target = target_m
        self.cache = {}

    def arr(self, key):
        if key not in self.cache:
            a = None
            if key in self.tiles:
                with tifffile.TiffFile(self.tiles[key]) as t:
                    s = t.series[0]
                    levels = s.levels
                    full = levels[0].shape[0]
                    best = levels[0]
                    for lv in levels:
                        if 10 * full / lv.shape[0] <= self.target * 1.01:
                            best = lv
                    a = best.asarray()
            self.cache[key] = a
        return self.cache[key]

    def sample(self, lon, lat):
        out = np.zeros(lon.shape, np.uint8)
        tlat = (np.floor((lat - 0) / 3) * 3).astype(int)
        tlon = (np.floor((lon - 0) / 3) * 3).astype(int)
        for key in set(zip(tlat.tolist(), tlon.tolist())):
            a = self.arr(key)
            if a is None:
                continue
            m = (tlat == key[0]) & (tlon == key[1])
            h, w = a.shape
            r = np.clip(((key[0] + 3 - lat[m]) / 3 * h).astype(int), 0, h - 1)
            c = np.clip(((lon[m] - key[1]) / 3 * w).astype(int), 0, w - 1)
            out[m] = a[r, c]
        return out


def load_etopo(path):
    rows = {}
    with open(path) as f:
        rd = csv.reader(f)
        next(rd); next(rd)
        for la, lo, z in rd:
            rows.setdefault(float(la), {})[float(lo)] = float(z) if z not in ("", "NaN") else np.nan
    lats = np.array(sorted(rows))
    lons = np.array(sorted(rows[lats[0]]))
    grid = np.array([[rows[la].get(lo, np.nan) for lo in lons] for la in lats])
    return lats, lons, grid


def etopo_at(E, lon, lat):
    lats, lons, g = E
    i = np.clip(np.searchsorted(lats, lat), 0, len(lats) - 1)
    j = np.clip(np.searchsorted(lons, lon), 0, len(lons) - 1)
    return g[i, j]


# ── main ──────────────────────────────────────────────────────────────────────────────────────────────────────────
FLAT, HILLS, MOUNTAINS, PEAKS = range(4)
# 2.5 km 칸 · 90 m DEM 기준. usaciv(25 km 칸·9 km ETOPO1)의 문턱값(85·260 m)은 칸이 10배 작아 그대로 쓸 수 없어 한국 지형에 맞게 정함.
REL_HILLS_SD, REL_MOUNT_SD, REL_MOUNT_MEAN, REL_PEAK_MEAN = 45, 120, 650, 1300
URBAN_MIN_PCT = 30
EMOJI = {"DT_H_SM": "🚬", "DT_117075_H_DR_HIGH_WH": "🍺", "DT_H_OBE_OBE": "⚖️", "DT_H_EX_WALK": "🚶", "DT_H_MENTAL_STRESS": "😣",
         "DT_H_MENTAL_DEPRESS": "😔", "K_MORT_SUI": "🕯️", "HLE_LE": "⏳", "HLE_HLE": "💚", "CANC_ALL": "🩺", "K_POP_AGED": "👵", "DEP_IDX": "📉"}
WC_PCT = {"forest": (10,), "crop": (40,), "pasture": (), "grass": (30,), "shrub": (20,), "wetland": (90, 95), "developed": (50,)}
WC_GROUP = [("forest", (10,), 3), ("scrub", (20,), 4), ("grassland", (30,), 5), ("cropland", (40,), 7), ("wetland", (90, 95), 8),
            ("barren", (60, 100), 10), ("ice", (70,), 11)]
COVER = [
    (1, "forest_deciduous", "활엽수림", "#4f7a35", "이 지도에서는 쓰지 않음(WorldCover 는 숲 종류를 나누지 않음)."),
    (2, "forest_evergreen", "침엽수림", "#2f5a3a", "이 지도에서는 쓰지 않음."),
    (3, "forest_mixed", "숲", "#43703f", "숲(WorldCover 10)이 가장 큰 무리."),
    (4, "scrub", "관목지", "#c9b07a", "관목(20)이 가장 큰 무리."),
    (5, "grassland", "초지", "#a9b35a", "초지(30)가 가장 큰 무리."),
    (6, "pasture", "목초지", "#8fb04e", "이 지도에서는 쓰지 않음(WorldCover 는 목초지를 따로 나누지 않음)."),
    (7, "cropland", "농경지", "#b3ad6a", "농경지(40, 논·밭)가 가장 큰 무리."),
    (8, "wetland", "습지", "#4f8a6e", "초본 습지(90)·맹그로브(95)가 가장 큰 무리."),
    (9, "urban", "시가지", "#8a8378", f"건물·포장지(50)가 칸 육지의 {URBAN_MIN_PCT}% 이상."),
    (10, "barren", "나지", "#bfae95", "나지(60, 모래·암석·갯벌 일부)·이끼(100)가 가장 큰 무리."),
    (11, "ice", "눈·얼음", "#e8eef2", "눈·얼음(70)이 가장 큰 무리."),
]


def band_label(v, pool_vals, bad, small=False):
    """분포 속 위치를 구간으로만(정확한 순위 대신). bad: True=낮을수록 좋음, False=높을수록 좋음, None=방향 없음."""
    xs = [x for x in pool_vals if x is not None]
    if v is None or not xs:
        return None
    if bad is None:
        hi = sum(1 for x in xs if x > v) + 0.5 * sum(1 for x in xs if x == v)
        u = hi / len(xs)
        if small:
            return "높은 편" if u < 1 / 3 else "낮은 편" if u >= 2 / 3 else "중간"
        return "높은 쪽 25%" if u <= 0.25 else "낮은 쪽 25%" if u >= 0.75 else "중간"
    better = sum(1 for x in xs if (x < v if bad else x > v)) + 0.5 * sum(1 for x in xs if x == v)
    u = better / len(xs)  # 나보다 양호한 지역의 비율
    if small:  # 30곳 이하(17개 시도): 3등분
        return "상위권" if u < 1 / 3 else "하위권" if u >= 2 / 3 else "중위권"
    return "양호한 쪽 25%" if u <= 0.25 else "불리한 쪽 25%" if u >= 0.75 else "중간"


def health_rows(H, code, subs, REG, sido_codes):
    rows = []
    for L in H["lenses"]:
        vals = L["values"]
        v = vals.get(code)
        is_sido = code in sido_codes
        pool = [vals[c] for c in (sido_codes if is_sido else L["pool"]) if c in vals]
        med = float(np.median(pool)) if pool else None
        row = {"id": L["id"].lower(), "name": L["name"], "unit": L["unit"], "year": L["year"], "v": None if v is None else round(v, 2),
               "med": None if med is None else round(med, 2), "n": len(pool), "bad": L["bad"],
               "band": band_label(v, pool, L["bad"], small=is_sido) if (is_sido or code in L["pool"]) else None}
        # 보건소가 여러 곳인 시(수원·창원 등): 조사 비교는 보건소 단위로 하므로 시 전체 값에는 위치를 매기지 않고 보건소별 값을 함께 보인다
        if not is_sido and code not in L["pool"] and subs:
            sv = [(REG[c]["n"], round(vals[c], 2), band_label(vals[c], pool, L["bad"])) for c in subs if c in vals]
            if sv:
                row["subs"] = sv
        rows.append(row)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--health", required=True)
    ap.add_argument("--geo", required=True, help="southkorea-maps kostat 2018 skorea-municipalities-2018-geo.json(원본 해상도)")
    ap.add_argument("--out", default="map/data")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    H = json.load(open(a.health, encoding="utf-8"))
    REG = {r["c"]: r for r in H["regions"]}
    GEOMAP = H["geomap"]
    print(f"grid {COLS}×{ROWS} = {N} cells, map {WIDTH:.0f}×{HEIGHT:.0f} units (1 unit = 100 m)")

    # 시군구 폴리곤(통계청 2018 경계 원본 해상도, 250개, 꼭짓점 44만 개) → KOSIS 코드(geomap 첫 코드 = 가장 세밀한 단위) → 현재 시도
    feats = json.load(open(a.geo, encoding="utf-8"))["features"]
    sidos = [r for r in H["regions"] if r["l"] == "sido"]
    sidos.sort(key=lambda r: (len(r["c"]), r["c"]))
    sido_idx = {r["c"]: k for k, r in enumerate(sidos)}

    def sido_of(code):
        r = REG.get(code)
        while r and r["l"] != "sido":
            r = REG.get(r["p"])
        return r["c"] if r else None

    counties, cgeom = [], []
    for f in feats:
        props = f["properties"]
        kc = GEOMAP.get(props["code"]) or []
        sgg = next((c for c in kc if REG.get(c, {}).get("l") == "sgg"), kc[0] if kc else None)
        counties.append({"geoid": props["code"], "name": props["name"], "kosis": kc, "sgg": sgg, "sido": sido_of(kc[0]) if kc else None})
        cgeom.append(shapely.make_valid(project_geom(f["geometry"])))
    cgeom = np.array(cgeom, dtype=object)
    tree = shapely.STRtree(cgeom)

    ne = os.path.join(a.raw, "ne")
    countries = json.load(open(os.path.join(ne, "ne_10m_admin_0_countries.geojson"), encoding="utf-8"))["features"]
    foreign_rings = [geo_rings(f["geometry"]) for f in countries if f["properties"].get("ADM0_A3") in ("PRK", "CHN", "JPN", "RUS")]
    fr = PolySet(foreign_rings)

    # ① 칸 육각형과 시군구 폴리곤의 실제 겹친 넓이: 겹친 땅이 칸의 0.2% 이상이면 땅(넉넉하게 — 화면에서 실제 해안선으로 잘라 냄),
    #    시군구 = 가장 많이 겹친 시군구, 소유 = 그 시군구의 현재 시도(군위군 → 대구)
    hexes = shapely.polygons(np.stack([np.column_stack([CX + HEXC[k, 0], CY + HEXC[k, 1]]) for k in range(6)], axis=1))
    hi, pj = tree.query(hexes, predicate="intersects")
    area = shapely.area(shapely.intersection(hexes[hi], cgeom[pj]))
    HEX_AREA = 1.5 * SQ3 * RADIUS ** 2
    best = {}
    tot = np.zeros(N)
    for h, c, ar in zip(hi.tolist(), pj.tolist(), area.tolist()):
        tot[h] += ar
        if ar > best.get(h, (-1, 0))[1]:
            best[h] = (c, ar)
    owner = np.full(N, -1, int)
    county = np.full(N, -1, int)
    for h, (c, ar) in best.items():
        if tot[h] >= 0.002 * HEX_AREA and counties[c]["sido"] in sido_idx:
            county[h] = c
            owner[h] = sido_idx[counties[c]["sido"]]
    land_share = tot / HEX_AREA
    px = (CX[:, None] + SAMPLE7[None, :, 0]).ravel()
    py = (CY[:, None] + SAMPLE7[None, :, 1]).ravel()
    fidx = fr.locate(px, py).reshape(N, 7)
    for i in range(N):
        if owner[i] >= 0:
            continue
        fs = (fidx[i] >= 0).sum()
        if fs >= 4 or (fidx[i, 0] >= 0 and fs >= 2):
            owner[i] = -2

    # ①-2 칸 하나보다 작거나 이웃에 넓이를 뺏긴 시군구(부산 중구 2.8 km² 등)도 최소 1칸: 그 시군구가 가장 많이 겹친 칸을 넘겨받는다
    #      (그 칸을 가진 시군구가 2칸 이상일 때만 — 다른 시군구를 지우지 않음)
    hit = Counter(county[county >= 0].tolist())
    for k in range(len(counties)):
        if hit.get(k):
            continue
        m = pj == k
        order = [h for _, h in sorted(zip((-area[m]).tolist(), hi[m].tolist()))]
        ring1 = [j for c in list(order) for j in neighbours(c) if j not in order and owner[j] >= 0]
        ring2 = [j for c in ring1 for j in neighbours(c) if j not in order and j not in ring1 and owner[j] >= 0]
        order += ring1 + ring2
        for cell in order:
            prev = county[cell]
            if prev >= 0 and hit[prev] < 2:
                continue
            if prev >= 0:
                hit[prev] -= 1
            county[cell] = k; owner[cell] = sido_idx[counties[k]["sido"]]; hit[k] = 1
            break

    # ①-3 화면에서 칸을 잘라 낼 실제 경계: 전국 해안선(육지 전체) · 시도 경계(현재 시도로 다시 묶음). 50 m 단순화.
    land_all = shapely.union_all(cgeom).simplify(0.5)
    shapely.prepare(land_all)
    sido_geoms = {}
    for k, c in enumerate(counties):
        sido_geoms.setdefault(c["sido"], []).append(cgeom[k])
    sido_lines = [shapely.union_all(g).simplify(0.5).boundary for code, g in sido_geoms.items() if code in sido_idx]
    outline = {"land": rings_flat(land_all), "sido": lines_flat(shapely.union_all(sido_lines))}

    # ② 고도·피복: 칸마다 ~90개 격자점
    dem = DEM(os.path.join(a.raw, "dem"))
    wc = WorldCover(os.path.join(a.raw, "wc"))
    land = np.where(owner >= 0)[0]
    elev = np.zeros(N, int); elev_max = np.zeros(N, int); relief = np.zeros(N, int); cover = np.zeros(N, int)
    pct = {k: np.zeros(N, int) for k in WC_PCT}
    water = np.where(owner == -1, 1, 0)
    lakes = 0
    CH = 2000
    for s in range(0, len(land), CH):
        ids = land[s:s + CH]
        lx = (CX[ids, None] + LAT[None, :, 0]).ravel(); ly = (CY[ids, None] + LAT[None, :, 1]).ravel()
        lon, lat = to_lonlat(lx, ly)
        z = dem.sample(lon, lat).reshape(len(ids), -1)
        cl = wc.sample(lon, lat).reshape(len(ids), -1)
        inland = shapely.contains_xy(land_all, lx, ly).reshape(len(ids), -1)  # 실제 해안선 안쪽 표본만 고도·피복에 씀
        for k, i in enumerate(ids):
            cls = cl[k]
            valid = (cls != 0) & (cls != 80) & inland[k]
            if not valid.any():
                valid = (cls != 0) & (cls != 80)
            nland = int(valid.sum())
            nwater = int(((cls == 80) & inland[k]).sum())
            if land_share[i] >= 0.9 and nwater >= 0.7 * len(cls):
                # 칸 대부분이 물(저수지·하구·간척 수면): 호수로 둔다(시도 경계는 이웃이 이어받음)
                water[i] = 3; owner[i] = -1; county[i] = -1; lakes += 1
                zz = z[k][~np.isnan(z[k])]
                elev[i] = min(0, int(round(float(zz.mean())))) if len(zz) else 0
                continue
            zz = z[k][valid & ~np.isnan(z[k])]
            if len(zz) == 0:
                zz = z[k][inland[k] & ~np.isnan(z[k])]
            if len(zz) == 0:
                zz = z[k][~np.isnan(z[k])]
            if len(zz):
                zz = np.maximum(zz, 0)
                m, sd = float(zz.mean()), float(zz.std())
                elev[i] = int(round(m)); elev_max[i] = int(round(float(zz.max())))
                rel = PEAKS if m >= REL_PEAK_MEAN else MOUNTAINS if (sd >= REL_MOUNT_SD or m >= REL_MOUNT_MEAN) else HILLS if sd >= REL_HILLS_SD else FLAT
                if rel in (HILLS, MOUNTAINS) and len(zz) >= 6:
                    v = np.sort(zz); lo = v[: max(3, int(len(v) * 0.6))]
                    if lo[-1] < 200 and lo[-1] - lo[0] < 30:
                        rel -= 1  # 들판이 대부분이고 가장자리에만 산이 걸친 칸
                relief[i] = rel
            if nland:
                cnt = Counter(cls[valid].tolist())
                for key, codes in WC_PCT.items():
                    pct[key][i] = round(100 * sum(cnt[c] for c in codes) / nland)
                if pct["developed"][i] >= URBAN_MIN_PCT:
                    cover[i] = 9
                else:
                    best = max(WC_GROUP, key=lambda g: sum(cnt[c] for c in g[1]))
                    cover[i] = best[2] if sum(cnt[c] for c in best[1]) else 0

    # ③ 바다: 깊이(ETOPO1), 해안 = 땅에 닿은 칸 또는 50 m 보다 얕은 칸
    E = load_etopo(os.path.join(a.raw, "etopo", "etopo_kr.csv"))
    wi = np.where(owner == -1)[0]
    sx = (CX[wi, None] + SAMPLE7[None, :, 0]).ravel(); sy = (CY[wi, None] + SAMPLE7[None, :, 1]).ravel()
    lon, lat = to_lonlat(sx, sy)
    dz = etopo_at(E, lon, lat).reshape(len(wi), 7)
    for k, i in enumerate(wi):
        if water[i] == 3:
            continue
        under = dz[k][dz[k] < 0]
        elev[i] = int(round(float(under.mean()))) if len(under) else -10
        near_land = any(owner[j] != -1 for j in neighbours(i))
        water[i] = 2 if near_land else 1  # 연안 = 땅에 닿은 칸만(깊이로 나누면 얕은 서해 전체가 밝게 칠해짐)
    for i in np.where(owner == -2)[0]:
        lon, lat = to_lonlat(np.array([CX[i]]), np.array([CY[i]]))
        zz = etopo_at(E, lon, lat)
        elev[i] = max(0, int(zz[0])) if not np.isnan(zz[0]) else 0
        relief[i] = HILLS if elev[i] > 300 else FLAT

    # ④ 강(Natural Earth 10m — 한강·남한강·낙동강만 들어 있음)
    rivers = []
    rv = json.load(open(os.path.join(ne, "ne_10m_rivers_lake_centerlines.geojson"), encoding="utf-8"))["features"]
    KO = {"Han": "한강", "Namhan": "남한강", "Nakdong": "낙동강", "Bukhan": "북한강", "Imjin": "임진강", "Geum": "금강", "Yeongsan": "영산강"}
    for f in rv:
        g = f["geometry"]
        lines = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"] if g["type"] == "MultiLineString" else []
        for ln in lines:
            arr = np.array(ln)
            if not ((arr[:, 0] > BBOX[0]) & (arr[:, 0] < BBOX[2]) & (arr[:, 1] > BBOX[1]) & (arr[:, 1] < BBOX[3])).any():
                continue
            mx, my = to_map(arr[:, 0], arr[:, 1])
            nm = f["properties"].get("name") or ""
            rivers.append({"name": KO.get(nm, nm), "rank": int(f["properties"].get("scalerank") or 9),
                           "pts": [round(float(v), 1) for xy in zip(mx, my) for v in xy]})

    # ⑤ world.json
    states_out = [{"fips": s["c"], "abbr": s["s"], "name": s["n"]} for s in sidos]
    world = {
        "version": 2, "grid": {"radius": RADIUS, "cols": COLS, "rows": ROWS},
        "width": round(WIDTH, 1), "height": round(HEIGHT, 1), "margin": MARGIN,
        "owner": owner.tolist(), "county": county.tolist(), "elev": elev.tolist(), "elev_max": elev_max.tolist(),
        "water": water.tolist(), "relief": relief.tolist(), "cover": cover.tolist(),
        "pct": {k: v.tolist() for k, v in pct.items()},
        "tables": {
            "water": [{"id": 0, "name": "땅"}, {"id": 1, "name": "바다", "color": "#1b4266", "rule": "땅에 닿지 않은 바다."},
                      {"id": 2, "name": "연안", "color": "#1b4266", "rule": "땅에 닿은 바다 칸(바다와 같은 색 — 육각형 띠가 해안선을 가리지 않게)."},
                      {"id": 3, "name": "호수·저수지", "color": "#3d7fa6", "rule": "칸 표본점 60% 이상이 물(WorldCover 80)."}],
            "relief": [{"id": FLAT, "name": "평지", "rule": f"칸 안 고도 표준편차 {REL_HILLS_SD} m 미만."},
                       {"id": HILLS, "name": "구릉", "rule": f"표준편차 {REL_HILLS_SD} m 이상."},
                       {"id": MOUNTAINS, "name": "산지", "rule": f"표준편차 {REL_MOUNT_SD} m 이상 또는 평균 고도 {REL_MOUNT_MEAN} m 이상."},
                       {"id": PEAKS, "name": "고산", "rule": f"평균 고도 {REL_PEAK_MEAN} m 이상."}],
            "cover": [{"id": i, "key": k, "name": n, "color": c, "rule": r} for i, k, n, c, r in COVER],
            "notes": {
                "water": "땅·바다는 통계청 2018 시군구 경계(원본 해상도)로 정한다: 칸과 겹친 땅이 칸 넓이의 0.2% 이상이면 땅이고, 화면에서는 실제 해안선(50 m 단순화)으로 잘라 그린다. 북한·중국·일본은 Natural Earth 10m 국경. 바다 깊이는 NOAA ETOPO1.",
                "relief": f"Copernicus DEM GLO-90(90 m) 표본 약 90점(약 500 m 간격). 2.5 km 칸에 맞춰 문턱값을 새로 정함(구릉 {REL_HILLS_SD} m · 산지 {REL_MOUNT_SD} m). 아래 60%가 낮은 들판인 칸은 한 단계 낮춤.",
                "cover": "ESA WorldCover 2021(80 m 개관 단계) 표본 약 90점. 물(80)·무자료는 빼고 남은 땅의 비율(정수 %). 숲 종류(활엽·침엽)는 원자료에 없어 「숲」 하나로 그림.",
            },
        },
        "states": states_out,
        "counties": [{"geoid": c["geoid"], "name": c["name"]} for c in counties],
        "rivers": rivers,
        "outline": outline,
    }
    dump(os.path.join(a.out, "world.json"), world)

    # ⑥ 도시(배너) = 시군구(행정 시·군·구, KOSIS sgg). 자리 = 폴리곤 표본점이 가장 많은 칸 중 중심에 가까운 칸
    cells_of = {}
    for i in np.where(county >= 0)[0]:
        cells_of.setdefault(counties[county[i]]["sgg"], []).append(int(i))
    used = set()
    cities = []
    sido_codes = [x["c"] for x in sidos]
    for code, cells in cells_of.items():
        r = REG.get(code)
        if not r or not cells:
            continue
        mx = float(np.mean(CX[cells])); my = float(np.mean(CY[cells]))
        order = sorted(cells, key=lambda i: (CX[i] - mx) ** 2 + (CY[i] - my) ** 2)
        cell = next((i for i in order if i not in used), order[0])
        used.add(cell)
        sido = REG.get(sido_of(code), {})
        metro_gu = sido.get("n", "").endswith(("특별시", "광역시")) and r["n"].endswith("구")
        subs = [c for c in (counties[k]["kosis"][0] for k in set(county[cells].tolist())) if REG.get(c, {}).get("l") == "sub"]
        cities.append({
            "id": code, "name": f"{sido.get('s', '')} {r['n']}" if metro_gu else r["n"], "full": f"{sido.get('n', '')} {r['n']}".strip(),
            "sido": sido.get("c"), "health": health_rows(H, code, subs, REG, sido_codes),
            "states": [sido.get("s", "")], "metro": False, "capital": False,
            "x": round(float(CX[cell]), 1), "y": round(float(CY[cell]), 1), "cell": int(cell),
            "population": r.get("pop"), "yields": {}, "footprint": sorted(cells), "subs": subs,
        })
    cities.sort(key=lambda c: -(c["population"] or 0))
    dump(os.path.join(a.out, "cities.json"), cities)

    # ⑦ 렌즈: 칸 값 = 그 칸 시군구 폴리곤의 KOSIS 코드 중 값이 있는 가장 세밀한 단위(조사 단위 → 시군구 → 시도 순)
    group_names = {"behavior": "건강행태", "mind": "마음 건강", "life": "수명", "care": "검진", "context": "맥락"}
    ramps = {True: ["#f7f0d8", "#f2c58a", "#e8915a", "#cf5a3c", "#9c2f2b", "#5e1a1f"],
             False: ["#eef3f8", "#bcd3e6", "#7fadd1", "#4a83b8", "#2a5d93", "#173d66"],
             None: ["#f3eef8", "#d4c3e6", "#ad94cf", "#8566b3", "#5e4291", "#3b2866"]}
    lenses = []
    for L in H["lenses"]:
        vals = L["values"]
        poly_val = []
        for c in counties:
            v = next((vals[k] for k in c["kosis"] if k in vals), None)
            if v is None and c["sido"] in vals:
                v = None  # 시도 값으로 채우지 않는다(지역 차이를 지우므로)
            poly_val.append(v)
        cellv = [None if county[i] < 0 else poly_val[county[i]] for i in range(N)]
        xs = sorted(v for v in cellv if v is not None)
        lo, hi = (xs[int(0.02 * (len(xs) - 1))], xs[int(0.98 * (len(xs) - 1))]) if xs else (0, 1)
        dec = 2 if abs(hi) < 10 else 1
        bad = L["bad"]
        lenses.append({
            "id": L["id"].lower(), "group": L["group"], "name": L["name"], "icon": "l-" + L["id"].lower(), "emoji": EMOJI.get(L["id"], "•"),
            "unit": L["unit"], "format": "float", "decimals": dec, "scale": "linear", "domain": [round(lo, dec), round(hi, dec)],
            "ramp": ramps[bad], "higher_is": "bad" if bad is True else "good" if bad is False else "neutral",
            "source": "kmap_" + L["group"], "year": L["year"], "item": L["item"],
            "description": f"{L['year']}년 {'표준화율' if L['item'] == 'std' and L['survey'] else '값'}. 출처: {L['src']}",
            "note": ("지역사회건강조사 표본 추정치(조사 단위 약 900명) — 칸 색 차이는 표본오차 범위일 수 있음." if L["survey"] else None),
            "values": [None if v is None else round(v, 3) for v in cellv],
        })
    groups = [{"id": g, "name": group_names[g]} for g in dict.fromkeys(L["group"] for L in H["lenses"])]
    dump(os.path.join(a.out, "lenses.json"), {"vintage": "health-profile.kr 대시보드 자료", "groups": groups, "lenses": lenses})

    # ⑧ 시도·전국 요약
    states_json = []
    for k, s in enumerate(sidos):
        cells = np.where(owner == k)[0]
        landshare = {key: round(float(np.mean(pct[key][cells][cover[cells] > 0])) / 100, 3) if (cover[cells] > 0).any() else None for key in WC_PCT}
        states_json.append({"fips": s["c"], "abbr": s["s"], "name": s["n"], "population": s.get("pop"), "yields": {}, "jobs": None,
                            "label": None, "land": landshare, "health": health_rows(H, s["c"], [], REG, [x["c"] for x in sidos])})
    dump(os.path.join(a.out, "states.json"), states_json)
    pop_total = sum(s.get("pop") or 0 for s in sidos)
    dump(os.path.join(a.out, "nation.json"), {"vintage": "주민등록 인구 " + str(json.load(open("data/risk.json"))["pop_year"]), "year": None,
                                             "nation": {"population": pop_total, "yields": {}}, "yields": [], "industries": {}})

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    sources = [
        {"id": "kostat_bnd", "title": "시군구 경계(2018)", "publisher": "통계청(가공: southkorea-maps)", "homepage": "https://github.com/southkorea/southkorea-maps", "license": "출처 표시", "used_for": ["땅·바다", "시도·시군구 경계"], "vintage": "2018"},
        {"id": "copdem", "title": "Copernicus DEM GLO-90", "publisher": "European Space Agency / Copernicus", "homepage": "https://registry.opendata.aws/copernicus-dem/", "license": "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved (무료 사용 허가)", "used_for": ["고도·산지 구분"], "vintage": "2021 release"},
        {"id": "worldcover", "title": "ESA WorldCover 10 m 2021 v200", "publisher": "ESA / VITO", "homepage": "https://esa-worldcover.org/", "license": "CC BY 4.0 — © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium", "used_for": ["토지피복(숲·농경지·시가지)"], "vintage": "2021"},
        {"id": "etopo", "title": "ETOPO1 global relief model", "publisher": "NOAA NCEI (ERDDAP)", "homepage": "https://www.ncei.noaa.gov/products/etopo-global-relief-model", "license": "Public domain (U.S. Government work)", "used_for": ["바다 깊이"], "vintage": "ETOPO1"},
        {"id": "natural_earth", "title": "Natural Earth 10m (countries, rivers)", "publisher": "Natural Earth", "homepage": "https://www.naturalearthdata.com/", "license": "Public domain", "used_for": ["이웃 나라 땅", "강(한강·남한강·낙동강)"], "vintage": "v5.1.2"},
        {"id": "usaciv", "title": "usaciv (지도 그리기 코드)", "publisher": "Andrej Karpathy", "homepage": "https://karpathy.ai/usaciv/", "license": "MIT License, Copyright (c) 2026 Andrej Karpathy", "used_for": ["육각형 지도 그리기·카메라·렌즈 화면"], "vintage": "2026-11"},
    ] + [{"id": "kmap_" + g, "title": f"{group_names[g]} 지표", "publisher": "health-profile.kr 대시보드(원 출처는 지표 설명에)", "homepage": "https://health-profile.kr/", "license": "공공누리 등 원 출처 조건", "used_for": [L["name"] for L in H["lenses"] if L["group"] == g], "vintage": ""} for g in dict.fromkeys(L["group"] for L in H["lenses"])]
    for s in sources:
        s.setdefault("description", ""); s["retrieved"] = now
    dump(os.path.join(a.out, "sources.json"), sources)

    # 요약
    nl = int((owner >= 0).sum())
    print(f"land {nl} · foreign {int((owner == -2).sum())} · lakes {lakes} · counties hit {len(set(county[county >= 0].tolist()))}/{len(counties)}")
    print("relief", Counter(relief[owner >= 0].tolist()), "cover", Counter(cover[owner >= 0].tolist()))
    print(f"cities {len(cities)} · rivers {len(rivers)}")
    missing = [c["name"] + "(" + c["geoid"] + ")" for k, c in enumerate(counties) if k not in set(county[county >= 0].tolist())]
    print("polygons without a hex:", missing)


def dump(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  wrote {path} ({os.path.getsize(path) / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
