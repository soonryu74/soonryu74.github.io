"""카메라 · 편집 — 장면을 «찍는» 움직임과 장면 · 화면 사이를 «잇는» 편집 (reference/camera.md).

장면 함수는 아트보드 크기 그대로 화면을 그리고(canvas · appear · fx), 마지막에 카메라로 찍는다:
    img = …그린 화면…                       # 아트보드 크기 (화면보다 큰 아트보드도 된다 — 훑기용 무대)
    c = camera.keys(lt, [(0, camera.full(img)), (2.0, camera.on(e, img))])
    return camera.shoot(img, c, (W, H))

카메라 = Cam(cx, cy, z, rot)  — 아트보드의 (cx, cy)를 화면 가운데에 · z 배 확대 · rot 도 기울기(시계 방향 +)

찍기 (장면 안)
  full(img|size)                 아트보드 전체가 화면에 맞게
  on(e|box, img|size, fill=0.62) 요소(또는 상자)가 화면의 fill 만큼 차게 — 다가가기 · 시선 옮기기의 목표
  at(cx, cy, z, rot)             직접
  keys(lt, [(t, Cam), …])        시각마다 카메라 · 사이는 부드럽게 · 같은 시각을 두 번 적으면 그 순간 «컷»(점프 컷 · 펀치 인 컷)
                                   항목을 (t, Cam, '선형'|'부드럽게'|'빠르게'|'튕김')으로 쓰면 그 구간 느낌을 바꾼다
  drift(c, lt, dur, amt=0.035, dir=1)   머무는 동안 아주 천천히 다가가며 흐르기 (멈춘 화면을 살린다)
  handheld(c, lt, amp=4)         손에 든 카메라처럼 살짝 흔들림 (다큐 · 현장감)
  shoot(img, c, out, fill=None, mblur=None, n=3)   찍기 → 화면 크기(out). mblur = 직전 프레임 카메라 → 빠른 이동에 움직임 흐림
  blurred(img, amt)              화면 전체 흐림 (줄여서 흐려 빠르다)
  defocus(img, keep, amt=10)     초점 — keep(요소 · 상자 목록)만 또렷, 나머지 흐리게 (초점 옮기기 · 시선 모으기)
  parallax(c, depth, size)       깊이 — depth<1 먼 층(덜 움직임) · >1 가까운 층 → appear.put(…, off=…) 에 넘길 (dx, dy)

잇기 (화면 a → b · u = 0~1)
  cut · dissolve · dip(색) · flash · push(밀어내기, dir) · cover(덮기, dir) · reveal(걷어내기, dir)
  zoom_cut(빨려 들어가며 바뀜) · blur_cut(흐려졌다 바뀜) · spin_cut(돌며 바뀜) · slice(가로 띠로 갈라짐)
  센 전환: rgb_split(색 갈라짐) · impact(쾅 착지) · zoom_blur(방사형 흐림) · cube(정육면체) · blinds(블라인드) ·
  pixelate(모자이크) · burn(불타듯 번짐) · clock(시계 바늘) · stretch(늘어나며 밀기) · tiles(타일 뒤집기) · drop(떨어져 튀기)
  EDITS = 이름 → 함수 (장면 경계마다 다른 편집을 고를 때). 효과 사전의 전환(whip_box · iris_box · split_box ·
  glitch_box · leak_box · bubble_wipe · zoom_through · page_flip_box)도 같은 자리에 쓴다 — fx 쪽은 box=(0,0,W,H) · t0=0 · t1=1.
"""
import math
from collections import namedtuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .ease import cl, eo, eio, back

Cam = namedtuple('Cam', 'cx cy z rot')
EASE = {'선형': lambda u: u, '부드럽게': eio, '빠르게': eo, '튕김': back}


# ── 찍기 ─────────────────────────────────────────
def _size(x):
    if hasattr(x, 'size'): return x.size
    return tuple(x)


def at(cx, cy, z=1.0, rot=0.0): return Cam(float(cx), float(cy), float(z), float(rot))


def full(img_or_size, out=None):
    """아트보드 전체가 화면(out, 기본 = 아트보드 크기)에 꼭 맞게"""
    w, h = _size(img_or_size); ow, oh = out or (w, h)
    return Cam(w / 2, h / 2, min(ow / w, oh / h), 0.0)


def _box(e):
    if isinstance(e, dict):
        from .canvas import box_h
        return (e['x'], e['y'], e['w'], box_h(e))
    return tuple(e)


def on(e, img_or_size, fill=0.62, out=None, dx=0.0, dy=0.0, rot=0.0):
    """요소(또는 (x, y, w, h))가 화면의 fill 만큼 차게 — dx · dy 는 화면 비율로 살짝 비켜 두기(삼분할 자리 등)"""
    x, y, w, h = _box(e); ow, oh = out or _size(img_or_size)
    z = fill * min(ow / max(1, w), oh / max(1, h))
    return Cam(x + w / 2 - dx * ow / z, y + h / 2 - dy * oh / z, z, rot)


def lerp(a, b, u):
    return Cam(a.cx + (b.cx - a.cx) * u, a.cy + (b.cy - a.cy) * u,
               math.exp(math.log(a.z) + (math.log(b.z) - math.log(a.z)) * u),   # 확대는 비율로 섞어야 속도가 고르다
               a.rot + (b.rot - a.rot) * u)


def keys(lt, ks):
    """[(t, Cam[, 느낌]), …] — 시각 순서대로. 같은 t 가 두 번이면 그 순간 컷."""
    if lt <= ks[0][0]: return ks[0][1]
    for i in range(len(ks) - 1):
        t0, c0 = ks[i][0], ks[i][1]; t1, c1 = ks[i + 1][0], ks[i + 1][1]
        if lt < t1:
            if t1 <= t0: return c1
            f = EASE.get(ks[i + 1][2] if len(ks[i + 1]) > 2 else '부드럽게', eio)
            return lerp(c0, c1, f(cl((lt - t0) / (t1 - t0))))
    return ks[-1][1]


def drift(c, lt, dur, amt=0.035, dir=0, side=18):
    """머무는 동안 천천히 — dur 동안 amt 만큼 «가운데로 곧게» 다가간다(끝 화면이 비대칭이 되지 않게).
    옆으로 흐르기는 고를 때만: dir=±1 → side px 만큼 그쪽으로 (훑듯이 · 이유가 있을 때)"""
    u = cl(lt / max(0.1, dur))
    if not dir: return Cam(c.cx, c.cy, c.z * (1 + amt * u), c.rot)
    return Cam(c.cx + dir * side * u / c.z, c.cy - 8 * u / c.z, c.z * (1 + amt * u), c.rot)


def handheld(c, lt, amp=4.0, seed=0):
    """손에 든 카메라 — 느린 사인파 몇 개를 섞은 작은 흔들림 (amp = 화면 px)"""
    s = seed * 1.7
    dx = amp * (math.sin(lt * 1.3 + s) * 0.6 + math.sin(lt * 2.9 + s * 2) * 0.4)
    dy = amp * (math.sin(lt * 1.1 + s * 3) * 0.6 + math.sin(lt * 3.4 + s) * 0.4)
    return Cam(c.cx + dx / c.z, c.cy + dy / c.z, c.z, c.rot + 0.25 * math.sin(lt * 0.9 + s))


def _affine(c, out):
    ow, oh = out; r = math.radians(c.rot); co, si = math.cos(r) / c.z, math.sin(r) / c.z
    a, b, d, e = co, -si, si, co
    return (a, b, c.cx - a * ow / 2 - b * oh / 2, d, e, c.cy - d * ow / 2 - e * oh / 2)


def _fill_of(img):
    px = img.convert('RGB').getpixel((0, 0)); return px


def _one(src, c, out, fill, hq=False):
    """한 장 찍기 — 기울기 없고 아트보드 안쪽이면 잘라서 늘리기(빠름) · 아니면 아핀 변환"""
    ow, oh = out
    if abs(c.rot) < 1e-3:
        w, h = ow / c.z, oh / c.z; x0, y0 = c.cx - w / 2, c.cy - h / 2
        if x0 >= -0.5 and y0 >= -0.5 and x0 + w <= src.width + 0.5 and y0 + h <= src.height + 0.5:
            x0, y0 = max(0.0, x0), max(0.0, y0); x1, y1 = min(src.width, x0 + w), min(src.height, y0 + h)
            if abs(w - ow) < .5 and abs(h - oh) < .5 and abs(x0 - round(x0)) < .01 and abs(y0 - round(y0)) < .01:
                return src.crop((round(x0), round(y0), round(x0) + ow, round(y0) + oh))
            return src.resize(out, Image.BICUBIC if hq else Image.BILINEAR, box=(x0, y0, x1, y1))
    return src.transform(out, Image.AFFINE, _affine(c, out), resample=Image.BICUBIC if hq else Image.BILINEAR, fillcolor=fill)


TRACE = None   # 점검 때만 list — shoot 할 때마다 (카메라, 아트보드 크기, 화면 크기)


def shoot(img, c, out=None, fill=None, mblur=None, n=3, hq=False):
    """카메라 c 로 찍어 out 크기 화면으로. mblur = 직전 카메라(빠른 이동 · 휙 줌에 움직임 흐림, n 장 겹침) · hq = 더 곱게(느림)"""
    out = out or img.size; fill = fill if fill is not None else _fill_of(img)
    if TRACE is not None: TRACE.append((c, img.size, out))   # 점검 보고가 실제 카메라 움직임을 잰다 (kit.check)
    src = img.convert('RGB')
    if mblur is not None:
        acc = None
        for i in range(n):
            a = np.asarray(_one(src, lerp(mblur, c, (i + 1) / n), out, fill), dtype=np.uint16)
            acc = a if acc is None else acc + a
        return Image.fromarray((acc // n).astype(np.uint8))
    return _one(src, c, out, fill, hq)


def blurred(img, amt):
    """화면 전체 흐림 — 4분의 1로 줄여 흐리고 다시 키운다(크게 흐릴수록 차이가 안 보이고 몇 배 빠르다)"""
    src = img.convert('RGB')
    if amt < 4: return src.filter(ImageFilter.GaussianBlur(amt))
    small = src.resize((max(1, src.width // 4), max(1, src.height // 4)), Image.BILINEAR)
    return small.filter(ImageFilter.GaussianBlur(amt / 4)).resize(src.size, Image.BILINEAR)


def defocus(img, keep, amt=10, feather=40):
    """keep(요소 dict 또는 (x, y, w, h) 목록)만 또렷하게, 나머지는 amt 만큼 흐리게 — 초점 옮기기"""
    src = img.convert('RGB'); blur = blurred(src, amt)
    m = Image.new('L', src.size, 0); d = ImageDraw.Draw(m)
    for k in keep:
        x, y, w, h = _box(k); d.rounded_rectangle([x - 10, y - 10, x + w + 10, y + h + 10], 24, fill=255)
    if feather: m = m.filter(ImageFilter.GaussianBlur(feather / 2))
    return Image.composite(src, blur, m)


def parallax(c, depth, size):
    """깊이 층 — 카메라가 움직인 만큼 이 층을 (1-depth) 배 거꾸로 밀어 덜(먼 층) / 더(가까운 층) 움직이게. appear.put(off=…) 에"""
    w, h = _size(size)
    return ((c.cx - w / 2) * (1 - depth), (c.cy - h / 2) * (1 - depth))


# ── 잇기 (a → b, u 0~1) ─────────────────────────────
def _rgb(x): return x.convert('RGB')


def cut(a, b, u): return _rgb(b if u >= 0.5 else a)


def dissolve(a, b, u): return Image.blend(_rgb(a), _rgb(b), eio(cl(u)))


def dip(a, b, u, col=(0, 0, 0)):
    """검정(또는 col)으로 잠깐 꺼졌다 켜지기 — 시간 · 단락이 바뀔 때"""
    u = cl(u); base = Image.new('RGB', a.size, col)
    return Image.blend(_rgb(a), base, eio(u * 2)) if u < 0.5 else Image.blend(base, _rgb(b), eio(u * 2 - 1))


def flash(a, b, u):
    """흰 번쩍과 함께 바뀜 (한 번에 0.2초 안쪽 · 깜빡임 안전: 1초 3번 이하)"""
    return dip(a, b, u, (255, 255, 255))


_DIR = {'left': (-1, 0), 'right': (1, 0), 'up': (0, -1), 'down': (0, 1)}


def push(a, b, u, dir='left'):
    """밀어내기 — b 가 들어오며 a 를 밀어낸다 (dir = 화면이 움직이는 쪽)"""
    w, h = a.size; vx, vy = _DIR[dir]; k = eio(cl(u)); o = Image.new('RGB', a.size)
    o.paste(_rgb(a), (int(vx * w * k), int(vy * h * k))); o.paste(_rgb(b), (int(vx * w * (k - 1)), int(vy * h * (k - 1))))
    return o


def cover(a, b, u, dir='left', shadow=True):
    """덮기 — a 는 그대로, b 가 그 위로 미끄러져 덮는다"""
    w, h = a.size; vx, vy = _DIR[dir]; k = eo(cl(u)); o = _rgb(a).copy()
    x, y = int(vx * w * (k - 1)), int(vy * h * (k - 1))
    if shadow and 0 < k < 1:
        s = Image.new('L', a.size, 0); ImageDraw.Draw(s).rectangle([x, y, x + w, y + h], fill=110)
        s = s.filter(ImageFilter.GaussianBlur(30)); o = Image.composite(Image.new('RGB', a.size), o, s)
    o.paste(_rgb(b), (x, y)); return o


def reveal(a, b, u, dir='left'):
    """걷어내기 — a 가 dir 쪽으로 빠지며 밑에 있던 b 가 드러난다"""
    w, h = a.size; vx, vy = _DIR[dir]; k = eio(cl(u)); o = _rgb(b).copy()
    o.paste(_rgb(a), (int(vx * w * k), int(vy * h * k))); return o


def zoom_cut(a, b, u, focus=None, amt=2.2):
    """빨려 들어가며 바뀜 — a 가 focus 로 확 다가가며 흐려지고, b 가 살짝 큰 데서 제자리로 (줌 전환)"""
    w, h = a.size; fx_, fy_ = focus or (w / 2, h / 2); u = cl(u)
    if u < 0.5:
        k = (u * 2) ** 2; c0 = Cam(w / 2, h / 2, 1, 0); c1 = Cam(fx_, fy_, amt, 0)
        return shoot(a, lerp(c0, c1, k), mblur=lerp(c0, c1, max(0, k - 0.12)), n=4)
    k = eo(u * 2 - 1); c = Cam(w / 2, h / 2, 1.0 + 0.5 * (1 - k), 0)
    return shoot(b, c, mblur=Cam(w / 2, h / 2, 1.0 + 0.5 * (1 - max(0, k - 0.25)), 0) if k < 0.9 else None, n=3)


def blur_cut(a, b, u, amt=24):
    """흐려졌다 바뀜 — 초점이 나갔다 다른 화면으로 돌아온다 (생각 · 회상 · 부드러운 단락)"""
    u = cl(u); s = math.sin(math.pi * u) * amt
    m = Image.blend(_rgb(a), _rgb(b), eio(cl((u - 0.35) / 0.3)))
    return blurred(m, s) if s > 0.5 else m


def spin_cut(a, b, u, deg=90):
    """돌며 바뀜 — a 가 돌며 빠지고 b 가 반대로 돌며 들어온다 (빠르게 · 경쾌)"""
    w, h = a.size; u = cl(u)
    if u < 0.5:
        k = (u * 2) ** 2; return shoot(a, Cam(w / 2, h / 2, 1 + 0.6 * k, deg * k))
    k = 1 - eo(u * 2 - 1); return shoot(b, Cam(w / 2, h / 2, 1 + 0.6 * k, -deg * k))


def slice(a, b, u, n=6, dir='left'):
    """가로 띠 n 개가 차례로 밀려 바뀜"""
    w, h = a.size; o = _rgb(a).copy(); bb = _rgb(b); vx = -1 if dir == 'left' else 1; bh = math.ceil(h / n)
    for i in range(n):
        k = eio(cl(u * (1 + 0.5) - i * 0.5 / n)); y = i * bh
        strip = bb.crop((0, y, w, min(h, y + bh))); o.paste(strip, (int(-vx * w * (1 - k)), y))
    return o


# ── 센 전환 (영상 편집 프로그램의 단골들) ─────────────────
def rgb_split(a, b, u, amp=48):
    """색이 갈라졌다 바뀜 — 빨강 · 파랑이 좌우로 찢어지며 흔들리고 가운데에서 바뀐다 (디지털 · 강렬)"""
    u = cl(u); src = np.asarray(_rgb(a if u < 0.5 else b)); d = int(amp * math.sin(math.pi * u))
    if d == 0: return Image.fromarray(src)
    o = src.copy(); o[..., 0] = np.roll(src[..., 0], d, axis=1); o[..., 2] = np.roll(src[..., 2], -d, axis=1)
    j = int(d * 0.25 * math.sin(u * 40)); o = np.roll(o, j, axis=0)
    return Image.fromarray(o)


def impact(a, b, u, amp=26):
    """쾅 착지 — a 가 확 다가가며 흐려지고 → 번쩍 → b 가 살짝 큰 데서 흔들리며 내려앉는다"""
    w, h = a.size; u = cl(u)
    if u < 0.4:
        k = (u / 0.4) ** 2; c0 = Cam(w / 2, h / 2, 1, 0); c1 = Cam(w / 2, h / 2, 1.25, 0)
        return shoot(a, lerp(c0, c1, k), mblur=lerp(c0, c1, max(0, k - 0.3)), n=3)
    k = (u - 0.4) / 0.6; z = 1 + 0.12 * (1 - eo(k)); s = amp * (1 - k) ** 2
    img = shoot(b, Cam(w / 2 + s * math.sin(k * 60) / z, h / 2 + s * math.cos(k * 47) / z, z, 0))
    if k < 0.18: img = Image.blend(img, Image.new('RGB', a.size, (255, 255, 255)), 0.75 * (1 - k / 0.18))
    return img


def zoom_blur(a, b, u, amt=0.25, n=9, focus=None):
    """빨려 드는 흐림 — 화면 가운데(focus)로 방사형 흐림이 커졌다 줄며 바뀐다"""
    w, h = a.size; u = cl(u); src = _rgb(a if u < 0.5 else b); s = amt * math.sin(math.pi * u)
    if s < 0.01: return src.copy()
    fx_, fy_ = focus or (w / 2, h / 2); acc = None
    for i in range(n):
        z = 1 + s * i / (n - 1); arr = np.asarray(_one(src, Cam(fx_, fy_, z, 0) if i else Cam(w / 2, h / 2, 1, 0), a.size, None), dtype=np.uint16)
        acc = arr if acc is None else acc + arr
    return Image.fromarray((acc // n).astype(np.uint8))


def _persp(dst, w, h):
    """출력 사각형 dst(4점: 왼위 · 오위 · 오아래 · 왼아래) ← 원본 (0,0)-(w,h) 의 원근 계수"""
    src = [(0, 0), (w, 0), (w, h), (0, h)]; A = []; B_ = []
    for (x, y), (X, Y) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -X * x, -X * y], [0, 0, 0, x, y, 1, -Y * x, -Y * y]]; B_ += [X, Y]
    return np.linalg.solve(np.array(A, float), np.array(B_, float)).tolist()


def cube(a, b, u, dir='left', bg=(10, 10, 12)):
    """정육면체 돌리기 — 화면이 상자의 한 면처럼 돌아가며 옆면(b)이 앞으로 (경쾌 · 다음 장)"""
    w, h = a.size; phi = math.radians(90 * eio(cl(u))); sg = 1 if dir == 'left' else -1; D = 2.4 * w
    o = Image.new('RGB', a.size, bg)
    def proj(x, z):
        xr = x * math.cos(phi) + sg * z * math.sin(phi); zr = -sg * x * math.sin(phi) + z * math.cos(phi)
        sc = (D - w / 2) / (D + zr); return w / 2 + xr * sc, sc, zr
    side = [(w / 2, -w / 2), (w / 2, w / 2)] if sg > 0 else [(-w / 2, w / 2), (-w / 2, -w / 2)]   # b 면의 왼쪽 → 오른쪽 모서리
    faces = [(_rgb(a), [(-w / 2, -w / 2), (w / 2, -w / 2)]), (_rgb(b), side)]
    drawn = []
    for img, ((x0, z0), (x1, z1)) in faces:
        X0, s0, zz0 = proj(x0, z0); X1, s1, zz1 = proj(x1, z1)
        if X1 - X0 < 2: continue
        quad = [(X0, h / 2 - h / 2 * s0), (X1, h / 2 - h / 2 * s1), (X1, h / 2 + h / 2 * s1), (X0, h / 2 + h / 2 * s0)]
        drawn.append(((zz0 + zz1) / 2, img, quad))
    for _, img, quad in sorted(drawn, key=lambda t: -t[0]):
        face = img.transform(a.size, Image.PERSPECTIVE, _persp(quad, w, h), Image.BILINEAR)
        m = Image.new('L', a.size, 0); ImageDraw.Draw(m).polygon(quad, fill=255)
        shade = 1 - 0.45 * abs((quad[1][0] - quad[0][0]) / w - 1)
        if shade < 0.99: face = Image.eval(face, lambda v, s=shade: int(v * s))
        o.paste(face, (0, 0), m)
    return o


def blinds(a, b, u, n=10, vertical=True):
    """블라인드 — 세로(또는 가로) 띠 n 개가 차례로 열리며 b 가 드러난다"""
    w, h = a.size; o = _rgb(a).copy(); bb = _rgb(b); L = w if vertical else h; bw = math.ceil(L / n)
    m = Image.new('L', a.size, 0); d = ImageDraw.Draw(m)
    for i in range(n):
        k = eio(cl(u * 1.5 - i * 0.5 / n)); c = i * bw + bw / 2; half = bw / 2 * k
        if half <= 0: continue
        d.rectangle([c - half, 0, c + half, h] if vertical else [0, c - half, w, c + half], fill=255)
    o.paste(bb, (0, 0), m); return o


def pixelate(a, b, u, size=64):
    """모자이크 — 화면이 큰 네모로 뭉개졌다 가운데에서 바뀌고 다시 또렷해진다 (게임 · 디지털)"""
    w, h = a.size; u = cl(u); src = _rgb(a if u < 0.5 else b); s = max(1, int(size * math.sin(math.pi * u)))
    if s <= 1: return src.copy()
    return src.resize((max(1, w // s), max(1, h // s)), Image.BILINEAR).resize(a.size, Image.NEAREST)


_NOISE = {}


def _noise(size, seed=3):
    if size not in _NOISE:
        rng = np.random.default_rng(seed); w, h = size
        n = Image.fromarray((rng.random((max(2, h // 40), max(2, w // 40))) * 255).astype(np.uint8)).resize(size, Image.BICUBIC)
        _NOISE[size] = np.asarray(n.filter(ImageFilter.GaussianBlur(20)), dtype=np.float32) / 255
    return _NOISE[size]


def burn(a, b, u, edge=(255, 150, 40), width=0.06):
    """불타듯 번짐 — 얼룩진 경계가 번져 나가며 b 가 드러나고 경계는 빛난다 (필름 번 · 감성 · 강렬)"""
    nz = _noise(a.size); nz = (nz - nz.min()) / (nz.max() - nz.min() + 1e-6); t = cl(u) * (1 + 2 * width) - width
    A = np.asarray(_rgb(a), dtype=np.float32); Bm = np.asarray(_rgb(b), dtype=np.float32)
    k = np.clip((t - nz) / width, 0, 1)[..., None]; glow = np.clip(1 - np.abs(t - nz) / width, 0, 1)[..., None]
    o = A * (1 - k) + Bm * k; o = o * (1 - glow * 0.8) + np.array(edge, np.float32) * glow * 0.8
    return Image.fromarray(np.clip(o, 0, 255).astype(np.uint8))


def clock(a, b, u):
    """시계 바늘 — 12시부터 시계 방향으로 쓸며 b 가 드러난다"""
    w, h = a.size; o = _rgb(a).copy(); k = eio(cl(u))
    if k <= 0: return o
    r = math.hypot(w, h); m = Image.new('L', a.size, 0)
    ImageDraw.Draw(m).pieslice([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], -90, -90 + 360 * k, fill=255)
    o.paste(_rgb(b), (0, 0), m); return o


def stretch(a, b, u, dir='left'):
    """늘어나며 밀기 — a 가 dir 쪽으로 납작하게 눌려 빠지고 b 가 길게 늘어났다 제 모양으로 (고무줄 · 경쾌)"""
    w, h = a.size; k = eio(cl(u)); o = Image.new('RGB', a.size); left = dir == 'left'
    wa = max(1, int(w * (1 - k))); wb = max(1, w - wa)
    A = _rgb(a).resize((wa, h), Image.BILINEAR); Bi = _rgb(b).resize((wb, h), Image.BILINEAR)
    if left: o.paste(A, (0, 0)); o.paste(Bi, (wa, 0))
    else: o.paste(Bi, (0, 0)); o.paste(A, (wb, 0))
    return o


def tiles(a, b, u, cols=6, rows=None):
    """타일 뒤집기 — 바둑판 칸이 대각선 순서로 하나씩 뒤집히며 b 로 (정보 전환 · 경쾌)"""
    w, h = a.size; rows = rows or max(2, round(cols * h / w)); tw, th = math.ceil(w / cols), math.ceil(h / rows)
    o = _rgb(a).copy(); A = _rgb(a); Bi = _rgb(b); span = cols + rows - 2
    for r in range(rows):
        for c in range(cols):
            k = cl(u * 1.6 - (r + c) / max(1, span) * 0.6); box = (c * tw, r * th, min(w, (c + 1) * tw), min(h, (r + 1) * th))
            src = A if k < 0.5 else Bi; s = abs(math.cos(math.pi * k)); bw = box[2] - box[0]
            nw = max(1, int(bw * s)); piece = src.crop(box).resize((nw, box[3] - box[1]), Image.BILINEAR)
            o.paste((20, 20, 24), box); o.paste(piece, (box[0] + (bw - nw) // 2, box[1]))
    return o


def drop(a, b, u):
    """떨어져 튀기 — b 가 위에서 떨어져 바닥에 튕기며 자리 잡고, 밑의 a 는 어두워진다"""
    w, h = a.size; k = cl(u); o = Image.blend(_rgb(a), Image.new('RGB', a.size), 0.5 * k)
    if k < 0.6: y = -h * (1 - (k / 0.6) ** 2)                                        # 점점 빨라지며 떨어지고
    else: q = (k - 0.6) / 0.4; y = -h * 0.07 * math.sin(math.pi * q) * (1 - q)        # 바닥에서 한 번 튕긴다
    o.paste(_rgb(b), (0, int(y))); return o


EDITS = {'cut': cut, 'dissolve': dissolve, 'dip': dip, 'flash': flash, 'push': push, 'cover': cover,
         'reveal': reveal, 'zoom_cut': zoom_cut, 'blur_cut': blur_cut, 'spin_cut': spin_cut, 'slice': slice,
         'rgb_split': rgb_split, 'impact': impact, 'zoom_blur': zoom_blur, 'cube': cube, 'blinds': blinds,
         'pixelate': pixelate, 'burn': burn, 'clock': clock, 'stretch': stretch, 'tiles': tiles, 'drop': drop}
