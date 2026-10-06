"""글자 쓰기 — 캔버스의 보통 글자(어떤 글꼴이든)를 «손으로 쓰듯» 획 순서대로 드러낸다.

끝 모습은 글꼴 글자 그대로다(새로 그리지 않는다). 엔진이 글자 모양에서 뼈대(획의 가운데 선)를 찾고,
그 뼈대를 따라 굵은 붓으로 «가리개를 걷어 내듯» 글자를 드러낸다.

  strokes(e)                  글자 요소 → 획 목록 [(점들, 글자 번호)] (쓰는 순서 · 요소 조각 좌표) · 한 번 계산해 저장
  reveal(e, k)                k 0→1 만큼 쓴 모습 RGBA (canvas.layer 와 같은 크기 · 자리)
  motion.write(img, e, k)     장면 코드에서 부르는 것 (motion.py)

쓰는 순서(한글 기준 · 어림): 글자 하나씩 → 글자 안에서는 위에서 아래 · 왼쪽에서 오른쪽 · 가로획은 왼→오 · 세로획은 위→아래 ·
  ㅇ 같은 고리는 맨 위에서 시작해 왼쪽으로(시계 반대). 획 사이에는 펜을 드는 짧은 틈.
한계: 회전 · 기울인 글자는 «쓰기» 대신 왼쪽부터 걷히기로 대신한다 · 아주 가는 글꼴(1~2px)은 뼈대가 끊길 수 있다.
"""
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from . import canvas as C


# ── 뼈대 (Zhang-Suen 가늘게 만들기 · numpy) ──
def _thin(m):
    m = np.pad(m.astype(np.uint8), 1)
    while True:
        changed = False
        for step in (0, 1):
            P = m
            p2, p3, p4 = P[:-2, 1:-1], P[:-2, 2:], P[1:-1, 2:]
            p5, p6, p7 = P[2:, 2:], P[2:, 1:-1], P[2:, :-2]
            p8, p9 = P[1:-1, :-2], P[:-2, :-2]
            nb = [p2, p3, p4, p5, p6, p7, p8, p9]
            B = sum(x.astype(int) for x in nb)
            seq = nb + [p2]
            A = sum(((seq[i] == 0) & (seq[i + 1] == 1)).astype(int) for i in range(8))
            c = P[1:-1, 1:-1] == 1
            if step == 0: d = (p2 * p4 * p6 == 0) & (p4 * p6 * p8 == 0)
            else: d = (p2 * p4 * p8 == 0) & (p2 * p6 * p8 == 0)
            rm = c & (B >= 2) & (B <= 6) & (A == 1) & d
            if rm.any():
                m = m.copy(); m[1:-1, 1:-1][rm] = 0; changed = True
        if not changed: break
    return m[1:-1, 1:-1].astype(bool)


_N8 = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]


def _trace(sk):
    """뼈대 픽셀 → 선들 (끝점 · 갈림점에서 끊는다 · 고리는 맨 위에서 시작)"""
    ys, xs = np.nonzero(sk); pix = set(zip(ys.tolist(), xs.tolist()))
    def nbr(p):   # m-이웃: 가로세로 이웃 먼저 · 대각선은 사이 칸이 비었을 때만 (두 겹 계단을 한 줄로)
        y, x = p; out = []
        for dy, dx in _N8:
            q = (y + dy, x + dx)
            if q not in pix: continue
            if dy and dx and ((y + dy, x) in pix or (y, x + dx) in pix): continue
            out.append(q)
        return out
    deg = {p: len(nbr(p)) for p in pix}
    nodes = {p for p in pix if deg[p] != 2}
    used = set(); lines = []
    def walk(a, b):
        line = [a, b]; used.add(frozenset((a, b))); prev, cur = a, b
        while cur not in nodes:
            nx = [q for q in nbr(cur) if q != prev and frozenset((cur, q)) not in used]
            if not nx: break
            nxt = min(nx, key=lambda q: abs(q[0] - cur[0]) + abs(q[1] - cur[1]))   # 곧은 이웃 먼저
            used.add(frozenset((cur, nxt))); line.append(nxt); prev, cur = cur, nxt
            if cur == a: break
        return line
    for a in sorted(nodes):
        for b in nbr(a):
            if frozenset((a, b)) not in used: lines.append(walk(a, b))
    for p in sorted(pix):   # 남은 것 = 고리 (ㅇ) — 맨 위 · 왼쪽으로
        nb = [q for q in nbr(p) if frozenset((p, q)) not in used]
        if nb:
            b = min(nb, key=lambda q: (q[1], q[0]))
            lines.append(walk(p, b))
    return [[(x, y) for y, x in ln] for ln in lines]


def _join_short(lines, minlen):
    return [ln for ln in lines if len(ln) >= minlen]


def _merge_through(lines, th):
    """획이 만나는 자리에서 끊긴 조각을 다시 잇는다 — 같은 방향으로 «지나가는» 두 조각을 한 획으로.
    (뼈대는 만나는 자리마다 끊겨서 ㅗ 의 가로획이 세로획 양옆으로 갈라지고, 그 조각들이 위 먼저 순서로 섞여 쓰였다)"""
    rad = max(3.0, th * 0.7); reach = max(5.0, th * 1.3)

    def outdir(ln, at_start):
        P = ln if at_start else ln[::-1]
        x0, y0 = P[0]; acc = 0.0; q = P[-1]
        for i in range(1, len(P)):
            acc += math.dist(P[i - 1], P[i])
            if acc >= reach: q = P[i]; break
        dx, dy = q[0] - x0, q[1] - y0; n = math.hypot(dx, dy) or 1.0
        return dx / n, dy / n
    lines = [list(ln) for ln in lines]
    while True:
        ends = []
        for i, ln in enumerate(lines):
            if len(ln) < 2 or ln[0] == ln[-1]: continue
            ends.append((i, True, ln[0])); ends.append((i, False, ln[-1]))
        best = None
        for a in range(len(ends)):
            for b in range(a + 1, len(ends)):
                ia, sa, pa = ends[a]; ib, sb, pb = ends[b]
                if ia == ib or math.dist(pa, pb) > rad: continue
                # 그 자리에 조각이 셋 이상 모일 때만 (갈림점) — 꺾인 한 획(ㄱ)은 그대로
                if sum(1 for e in ends if math.dist(e[2], pa) <= rad) < 3: continue
                da, db = outdir(lines[ia], sa), outdir(lines[ib], sb)
                dot = da[0] * db[0] + da[1] * db[1]
                if dot < -0.82 and (best is None or dot < best[0]): best = (dot, ia, sa, ib, sb)
        if not best: break
        _, ia, sa, ib, sb = best
        A = lines[ia] if not sa else lines[ia][::-1]          # A 는 갈림점에서 끝나게
        Bn = lines[ib] if sb else lines[ib][::-1]             # B 는 갈림점에서 시작하게
        lines[ia] = A + Bn; lines[ib] = []
        lines = [ln for ln in lines if ln]
    return lines


def _orient(ln):
    """가로획은 왼→오 · 세로 · 비스듬한 획은 위→아래 (고리는 그대로)"""
    if ln[0] == ln[-1]: return ln
    (x0, y0), (x1, y1) = ln[0], ln[-1]
    if abs(x1 - x0) > abs(y1 - y0) * 1.7: return ln if x0 <= x1 else ln[::-1]
    return ln if y0 <= y1 else ln[::-1]


def _char_boxes(e, ox, oy):
    """글자마다 가로 범위 (조각 좌표) → [(줄 번호, x0, x1, 위, 아래)]"""
    f = C.font(e); ls = e.get('ls', 0); out = []; lh = C.line_h(e)
    for li, (ln, x, base, anc) in enumerate(C.text_lines(e)):
        w = C.tlen(f, ln, ls)
        x0 = x - (w / 2 if anc[0] == 'm' else w if anc[0] == 'r' else 0)
        for i, ch in enumerate(ln):
            a = x0 + C.tlen(f, ln[:i], ls); b = x0 + C.tlen(f, ln[:i + 1], ls)
            if ch.strip(): out.append((li, a - ox, b - ox, base - lh * 0.85 - oy, base + lh * 0.25 - oy))
    return out


def _glyph_mask(e, size, ox, oy):
    """글자 잉크만 (조각 좌표 · 흰 L) — canvas 가 그리는 것과 같은 자리"""
    m = Image.new('L', size, 0); d = ImageDraw.Draw(m); f = C.font(e)
    for ln, x, base, anc in C.text_lines(e):
        C.draw_text(d, (x - ox, base - oy), ln, f, 255, anchor=anc, ls=e.get('ls', 0), stroke=e.get('stroke') or 0, stroke_c=(255,) if e.get('stroke') else None)
    return m


def _rng(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; return min(xs), max(xs), min(ys), max(ys)


def _cmp(a, b):
    """쓰는 순서 비교 — 옆으로 나란하면 왼쪽 먼저 · 아니면 위 먼저 (한글 낱자 배치)"""
    ax0, ax1, ay0, ay1 = a; bx0, bx1, by0, by1 = b
    ov = min(ay1, by1) - max(ay0, by0); hmin = max(1e-6, min(ay1 - ay0, by1 - by0))
    if ov > 0.4 * hmin and (ax1 <= bx0 + (bx1 - bx0) * 0.5 or bx1 <= ax0 + (ax1 - ax0) * 0.5):
        return -1 if (ax0 + ax1) < (bx0 + bx1) else 1
    if abs(ay0 - by0) > 1e-6: return -1 if ay0 < by0 else 1
    return -1 if ax0 < bx0 else 1


def _order(S):
    """글자 → 낱자 덩어리(서로 닿은 획) → 획 순서"""
    import functools
    par = list(range(len(S)))
    def f(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    ends = {}
    for i, (pts, ci, L) in enumerate(S):
        for p in (pts[0], pts[-1]):
            key = (ci, round(p[0] / 2), round(p[1] / 2))
            if key in ends: par[f(i)] = f(ends[key])
            else: ends[key] = i
    groups = {}
    for i in range(len(S)): groups.setdefault(f(i), []).append(i)
    out = []
    chars = _chars(E_CUR[0]) if E_CUR else []
    for ci in sorted({s[1] for s in S}):
        gs = [g for g in groups.values() if S[g[0]][1] == ci]
        box = {id(g): _rng([p for i in g for p in S[i][0]]) for g in gs}
        gs.sort(key=functools.cmp_to_key(lambda a, b: _cmp(box[id(a)], box[id(b)])))
        mine = []
        for g in gs:
            g.sort(key=functools.cmp_to_key(lambda a, b: _cmp(_rng(S[a][0]), _rng(S[b][0]))))
            mine += [S[i] for i in _after_host(g, S)]
        ch = chars[ci] if ci < len(chars) else ''
        out += _by_jamo(mine, ch)
    return out


E_CUR = []      # strokes() 가 지금 다루는 글자 요소 (순서 정할 때 글자를 알아야 해서)

# 한글 가운데 소리(모음) 모양 — 세로(오른쪽에 선다) · 가로(아래에 눕는다) · 겹(가로 다음 세로)
_V_VERT = {0, 1, 2, 3, 4, 5, 6, 7, 20}          # ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅣ
_V_HORI = {8, 12, 13, 17, 18}                    # ㅗ ㅛ ㅜ ㅠ ㅡ


def _chars(e):
    """_char_boxes 와 같은 순서의 글자들 (빈칸 빼고)"""
    return [ch for ln, x, base, anc in C.text_lines(e) for ch in ln if ch.strip()]


def _by_jamo(strokes_, ch):
    """한글 한 글자 = 첫소리 → 가운데 소리 → 끝소리 순서로 (자리로 가른다 · 같은 자리 안은 앞에서 정한 순서 그대로).
    획이 이어 쓰인 글꼴(ㅅ 과 ㅓ 가 붙은 것)도 ㅓ 가 ㅅ 보다 먼저 써지지 않게"""
    if not ch or not ('가' <= ch <= '힣') or len(strokes_) < 2: return strokes_
    code = ord(ch) - 0xAC00; jung = (code % 588) // 28; jong = code % 28
    xs = [p[0] for s_ in strokes_ for p in s_[0]]; ys = [p[1] for s_ in strokes_ for p in s_[0]]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys); w = max(1.0, x1 - x0); h = max(1.0, y1 - y0)

    def rank(s_):
        P = s_[0]; u = (sum(p[0] for p in P) / len(P) - x0) / w; v = (sum(p[1] for p in P) / len(P) - y0) / h
        if jong and v > (0.55 if jung in _V_VERT else 0.66): return 2   # 끝소리 — 아래 (세로 모음 글자는 끝소리가 더 위에서 시작)
        if jung in _V_VERT: return 1 if u > 0.58 else 0                # 세로 모음 — 오른쪽
        if jung in _V_HORI: return 1 if v > (0.42 if jong else 0.5) else 0     # 가로 모음 — 첫소리 아래
        if u > 0.66: return 1.5                                        # 겹모음 — 가로 부분 다음 세로 부분
        return 1 if v > (0.42 if jong else 0.5) else 0
    return sorted(strokes_, key=rank)                                  # 안정 정렬 — 같은 자리 안 순서는 그대로


def _after_host(g, S):
    """다른 획의 «중간»에서 시작하는 획은 그 획 다음에 쓴다 (ㅅ · ㅆ 의 둘째 획 · ㅓ ㅏ 의 짧은 가로획)"""
    order = list(g)
    for _ in range(len(order)):
        moved = False
        for bi, b in enumerate(order):
            x, y = S[b][0][0]
            for ai in range(bi + 1, len(order)):
                a = order[ai]; P = S[a][0]
                if len(P) < 6: continue
                rad = 5.0                                                    # 뼈대 위 몇 픽셀 안
                inner = P[len(P) // 6: len(P) - len(P) // 6]                     # 끝 쪽은 빼고 가운데 구간
                if any(abs(px - x) <= rad and abs(py - y) <= rad for px, py in inner[::2]):
                    order.insert(ai, order.pop(bi)); moved = True; break      # b 를 a 바로 뒤로
            if moved: break
        if not moved: break
    return order


def strokes(e):
    """→ (획 목록 [(점들, 글자 번호, 길이)], 붓 굵기, 글자 잉크 마스크) · 요소에 저장"""
    if '_write' in e: return e['_write']
    lay, lx, ly = C.layer(e); size = lay.size
    gm = _glyph_mask(e, size, lx, ly); g = np.asarray(gm) > 100
    # 뼈대는 살짝 뭉갠 모양에서 — 붓결 구멍 · 거친 가장자리가 잔가지를 만들어 획 순서가 조각나지 않게 (잉크 자체는 그대로)
    r0 = max(1.0, min(6.0, e.get('size', 16) / 120))
    sk = _thin(np.asarray(gm.filter(ImageFilter.GaussianBlur(r0))) > 110)
    area, slen = g.sum(), max(1, sk.sum())
    th = max(2.0, area / slen)                                       # 획 굵기 어림 = 넓이 ÷ 뼈대 길이
    lines = _merge_through(_join_short(_trace(sk), max(3, int(th * 0.5))), th)
    boxes = _char_boxes(e, lx, ly)

    def which(ln):
        xs = [p[0] for p in ln]; ys = [p[1] for p in ln]; cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
        best, bd = 0, 1e9
        for i, (li, a, b, t, bt) in enumerate(boxes):
            dx = 0 if a <= cx <= b else min(abs(cx - a), abs(cx - b)); dy = 0 if t <= cy <= bt else min(abs(cy - t), abs(cy - bt))
            if dx + dy * 2 < bd: bd, best = dx + dy * 2, i
        return best
    out = []
    for ln in lines:
        ln = _orient(ln); ci = which(ln)
        L = sum(math.dist(ln[i], ln[i + 1]) for i in range(len(ln) - 1))
        out.append((ln, ci, L))
    E_CUR[:] = [e]; out = _order(out); E_CUR[:] = []
    e['_write'] = (out, th, gm)
    return e['_write']


def _inv_ease(u):
    """획 안 속도(누르고 → 빠르게 →멈추기 · smoothstep) 의 거꾸로 — 길이 비율 u 에 붓이 닿는 시각"""
    t = np.clip(np.asarray(u, np.float64), 0, 1)
    x = t.copy()
    for _ in range(8): x = np.clip(x - (x * x * (3 - 2 * x) - t) / np.maximum(6 * x * (1 - x), 1e-3), 0, 1)
    return x


def _time_map(e, pause=0.25):
    """글자 잉크 픽셀마다 «붓이 닿는 시각»(0~1) — 가장 가까운 뼈대 지점의 시각을 물려받는다.
    굵기가 들쭉날쭉한 붓글씨도 빈틈 없이 드러나고, 앞머리가 획 방향과 직각으로 지나간다(둥근 도장이 아니라 붓이 쓸고 간다)"""
    key = ('_wtm', pause)
    if key in e: return e[key]
    S, th, gm = strokes(e)
    g = np.asarray(gm)
    H, W = g.shape
    gap = th * (2 + 6 * pause)
    tot = sum(L + gap for _, _, L in S) or 1.0
    T = np.full((H, W), np.inf, np.float32)
    t0 = 0.0
    for pts, ci, L in S:
        P = np.asarray(pts, np.float64)
        if len(P) > 1:
            seg = np.hypot(*(P[1:] - P[:-1]).T); cum = np.concatenate([[0], np.cumsum(seg)])
        else: cum = np.zeros(1)
        u = cum / max(L, 1e-6)
        tt = (t0 + _inv_ease(u) * L) / tot
        for j in range(len(P)):                                        # 점 사이도 채운다 (뼈대는 이웃 픽셀이라 거의 그대로)
            x, y = int(round(P[j][0])), int(round(P[j][1]))
            if 0 <= x < W and 0 <= y < H and tt[j] < T[y, x]: T[y, x] = tt[j]
        t0 += L + gap
    # 가장 가까운 뼈대 점을 찾아 그 시각을 물려받는다 — 점 좌표를 한 겹씩 넘기며 «실제 거리»로 비교
    # (시각을 그냥 퍼뜨리면 대각선으로 더 빨리 퍼져 앞 획 시각이 다음 획 안으로 가는 선처럼 샌다)
    ink = g > 100                                                      # 진한 잉크에서 먼저 · 흐린 가장자리는 아래에서
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    seed = np.isfinite(T)
    SX = np.where(seed, xx, np.nan).astype(np.float32); SY = np.where(seed, yy, np.nan).astype(np.float32)
    D = np.where(seed, 0.0, np.inf).astype(np.float32)
    dom = ink | seed
    for _ in range(int(th * 3) + 16):
        changed = False
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            sx = np.full_like(SX, np.nan); sy = np.full_like(SY, np.nan)
            ys0, ys1 = max(0, dy), H + min(0, dy); xs0, xs1 = max(0, dx), W + min(0, dx)
            sx[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx] = SX[ys0:ys1, xs0:xs1]
            sy[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx] = SY[ys0:ys1, xs0:xs1]
            d = (sx - xx) ** 2 + (sy - yy) ** 2
            better = dom & np.isfinite(d) & (d < D - 1e-3)
            if better.any():
                SX[better] = sx[better]; SY[better] = sy[better]; D[better] = d[better]; changed = True
        if not changed: break
    A = np.isfinite(D)
    Ts = T.copy()
    T[A] = Ts[SY[A].astype(int), SX[A].astype(int)]
    # 흐린 가장자리(글자 테두리 부드러운 픽셀) = 붙어 있는 진한 잉크 중 «가장 늦은» 시각 — 안 쓴 획 가장자리가 가는 선으로 미리 비치지 않게
    edge = (g > 0) & ~ink
    Tf = np.where(np.isfinite(T), T, -1.0).astype(np.float32)
    Tp = np.pad(Tf, 1, constant_values=-1.0); late = np.full_like(Tf, -1.0)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): late = np.maximum(late, Tp[1 + dy:1 + dy + H, 1 + dx:1 + dx + W])
    put = edge & (late >= 0); T[put] = late[put]; A |= put
    T[(g > 0) & ~A] = 1.0                                              # 끝까지 못 닿은 부스러기는 맨 끝에
    e[key] = (T, th / tot)
    return e[key]


def reveal(e, k, pause=0.25, ease=True, mode='brush'):
    """k 만큼 쓴 글자 → (RGBA 조각, x, y) — 획마다 길이에 비례한 시간 + 펜 드는 틈(pause = 굵기 몇 배만큼의 길이)"""
    lay, lx, ly = C.layer(e)
    if k >= 1: return lay, lx, ly
    if k <= 0 or e.get('rot'):
        if k <= 0: return None
        # 회전한 글자 — 왼쪽부터 걷히기로 대신
        w = max(1, int(lay.width * k)); part = Image.new('RGBA', lay.size, (0, 0, 0, 0)); part.paste(lay.crop((0, 0, w, lay.height)), (0, 0)); return part, lx, ly
    S, th, gm = strokes(e)
    if not S: return lay, lx, ly
    if mode == 'brush':
        T, soft = _time_map(e, pause)
        rv = np.clip((k - T) / max(soft * 0.5, 1e-4), 0, 1)              # 앞머리는 붓 굵기 반쯤만 부드럽게 (길면 번져 보인다)
        rv[~np.isfinite(T)] = 0
        a = np.asarray(lay.getchannel('A'), np.float32)
        ink = np.asarray(gm) > 0
        near = np.asarray(gm.filter(ImageFilter.MaxFilter(7)), np.float32) / 255
        rvn = np.asarray(Image.fromarray((rv * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)), np.float32) / 255
        # 잉크 안 = 붓이 닿은 만큼 그대로 (안 쓴 획 가장자리가 미리 비치지 않게) · 잉크 둘레(테두리 · 그림자) = 닿은 곳 가까이 · 그 밖(상자 바탕) = 서서히
        show = np.where(ink, rv, np.maximum(rvn * near, (1 - near) * min(1.0, k * 5)))
        out = lay.copy(); out.putalpha(Image.fromarray(np.clip(a * show, 0, 255).astype(np.uint8)))
        return out, lx, ly
    gap = th * (2 + 6 * pause)
    tot = sum(L + gap for _, _, L in S); want = tot * k
    m = Image.new('L', lay.size, 0); d = ImageDraw.Draw(m); r = th * 0.85 + 1.5
    for pts, ci, L in S:
        if want <= 0: break
        f = min(1.0, want / max(L, 1e-6)); want -= L + gap
        if ease and f < 1: f = f * f * (3 - 2 * f)
        n = max(2, int(len(pts) * f)); part = pts[:n]
        if len(part) > 1: d.line(part, fill=255, width=int(r * 2), joint='curve')
        for x, y in (part[0], part[-1]): d.ellipse([x - r, y - r, x + r, y + r], fill=255)
    a = np.asarray(lay.getchannel('A'), np.float32); g = np.asarray(gm, np.float32) / 255; rv = np.asarray(m, np.float32) / 255
    near = np.asarray(gm.filter(ImageFilter.MaxFilter(7)), np.float32) / 255      # 글자 둘레(테두리 · 그림자 가장자리 포함)
    other = 1 - near                              # 글자 아닌 부분(상자 바탕)은 쓰기 시작하면 서서히
    rvn = np.asarray(m.filter(ImageFilter.MaxFilter(3)), np.float32) / 255
    show = np.maximum(rvn * near, other * min(1.0, k * 5))
    out = lay.copy(); out.putalpha(Image.fromarray(np.clip(a * show, 0, 255).astype(np.uint8)))
    return out, lx, ly
