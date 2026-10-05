"""효과 사전 32개 — 검증된 재료 (reference/effects.md). 메뉴가 아니다: 더 나은 움직임은 새로 짜고, 좋으면 여기에 보탠다.

공통 인자
  img   그릴 화면 (PIL RGB) · t = 효과 안 시각(초)
  box   그림 자리 (x, y, w, h) — 그림 재료는 이 크기로 미리 맞춰 넘긴다 (layout.fit)
  pal   색 묶음 dict: bg · txt · dim · white · accent(노랑) · red · panel · blue · green · orange
        (영상마다 정한다 — core 는 이름만 안다)
돌려주는 값 = 그린 화면 (흔들림 등으로 새 화면이 될 수 있다)
각 효과가 어울렸던 자리는 FX 표(아래)와 reference/effects.md.
"""
import math
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

from .ease import cl, seg, eo, eio, back, mix
from .layout import F, fit
from .text import ktext, pill


# ── 공용 ─────────────────────────────────────────
def shake(img, lt, t0, fill, amp=16, dur=0.28):
    """흔들림 — t0 부터 dur 동안 amp 픽셀에서 0으로 (강조 슬램 · 콜백 착지)"""
    if t0 <= lt < t0 + dur:
        a = amp * (1 - (lt - t0) / dur)
        return img.transform(img.size, Image.AFFINE, (1, 0, int(a * math.sin(lt * 95)), 0, 1, int(a * math.cos(lt * 71))), fillcolor=fill)
    return img


def star(d, cx, cy, s, col):
    """여덟 갈래 반짝 별 (s = 반지름)"""
    pts = [(cx + (s if i % 2 == 0 else s * 0.22) * math.cos(i * math.pi / 4), cy + (s if i % 2 == 0 else s * 0.22) * math.sin(i * math.pi / 4)) for i in range(8)]
    d.polygon(pts, fill=col)


def sparkles(d, lt, pts, col=(255, 250, 220)):
    """반짝 — pts = [(x, y, 시작초, 크기), …] · 0.55초 동안 커졌다 작아진다"""
    for (x, y, t0, s) in pts:
        q = seg(lt, t0, t0 + 0.55)
        if 0 < q < 1: star(d, x, y, s * math.sin(math.pi * q), col)


def put(img, box, pic, scale=1.0, dx=0, dy=0, bg=(0, 0, 0)):
    """그림(box 크기)을 box 에 — scale 로 가운데 기준 확대/축소"""
    bx, by, bw, bh = box
    if scale != 1.0:
        w, h = int(bw * scale), int(bh * scale)
        p = pic.resize((w, h), Image.BILINEAR)
        cx, cy = (w - bw) // 2, (h - bh) // 2
        p = p.crop((cx, cy, cx + bw, cy + bh)) if scale > 1 else p
        if scale < 1:
            c = Image.new('RGB', (bw, bh), bg); c.paste(p, ((bw - w) // 2, (bh - h) // 2)); p = c
    else:
        p = pic
    img.paste(p, (bx + dx, by + dy))


def frame_box(d, box, col=(255, 255, 255), w=5):
    bx, by, bw, bh = box; d.rectangle([bx - w, by - w, bx + bw + w, by + bh + w], outline=col, width=w)


def crop_zoom(pic, s, cx, cy):
    """pic 을 (cx, cy) 중심으로 s배 확대해 같은 크기로"""
    bw, bh = pic.size; w, h = bw / s, bh / s; x0 = cl(cx - w / 2, 0, bw - w); y0 = cl(cy - h / 2, 0, bh - h)
    return pic.crop((int(x0), int(y0), int(x0 + w), int(y0 + h))).resize((bw, bh), Image.BILINEAR)


def bubble_mask_box(r, cx, cy, bw, bh):
    """말풍선 모양 마스크 (box 크기 · 2배로 그려 줄여 매끈하게)"""
    big = Image.new('L', (bw * 2, bh * 2), 0); bd = ImageDraw.Draw(big)
    rx, ry = r * 2 * 1.15, r * 2 * 0.85
    bd.ellipse([cx * 2 - rx, cy * 2 - ry, cx * 2 + rx, cy * 2 + ry], fill=255)
    bd.polygon([(cx * 2 - rx * 0.25, cy * 2 + ry * 0.7), (cx * 2 - rx * 0.05, cy * 2 + ry * 0.7), (cx * 2 - rx * 0.45, cy * 2 + ry * 1.35)], fill=255)
    return big.resize((bw, bh), Image.LANCZOS)


def ink_noise(bw, bh, seed=4, grid=(60, 45), blur=18):
    """잉크 번짐용 문턱 지도 (위에서부터 번지게)"""
    n = np.random.default_rng(seed).random(grid)
    nim = Image.fromarray((n * 255).astype('uint8')).resize((bw, bh), Image.BICUBIC).filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(nim).astype(float); a = (a - a.min()) / (a.max() - a.min())
    return 0.65 * a + 0.35 * np.linspace(0, 1, bh)[:, None]


def line_art(pic):
    """그리기 재현용 — 경계 검출 선화 마스크 (L)"""
    return pic.convert('L').filter(ImageFilter.GaussianBlur(1.2)).filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v > 34 else 0)


# ══ 1차 12 ═════════════════════════════════════════
def hook_flash(img, t, box, pic, pal, text, text_xy):
    """1 결과 먼저 훅 + 플래시 — 0.35초에 흰 플래시와 함께 완성 그림이 줌아웃 · 한 줄 (플래시는 한 편에 한 번)"""
    d = ImageDraw.Draw(img); W, H = img.size
    if t > 0.35:
        put(img, box, pic, scale=1.0 + 0.15 * (1 - eo(seg(t, 0.35, 1.3))), bg=pal['bg'])
        frame_box(d, box, pal['white'])
        ktext(d, text_xy[0], text_xy[1], text, 96, t, 1.0, pal['accent'], pal['bg'], center=True)
    fl = 1 - seg(t, 0.35, 0.55) if t >= 0.35 else 0
    if fl > 0: img.paste(Image.blend(img, Image.new('RGB', (W, H), pal['white']), fl))
    return img


def slider(img, t, box, before, after, pal, lab_after, lab_before, col_after):
    """2 비포/애프터 슬라이더 — 같은 그림의 두 판 (차이가 작으면 그 칸만 확대해서 넘긴다)"""
    bx, by, bw, bh = box
    u = eio(seg(t, 0.4, 1.4)) if t < 1.6 else 1 - 0.5 * eio(seg(t, 1.6, 2.4))
    put(img, box, before); x = int(bw * u)
    if x > 0: img.paste(after.crop((0, 0, x, bh)), (bx, by))
    d = ImageDraw.Draw(img); frame_box(d, box, pal['white'])
    d.line([bx + x, by, bx + x, by + bh], fill=pal['white'], width=6)
    d.ellipse([bx + x - 34, by + bh / 2 - 34, bx + x + 34, by + bh / 2 + 34], fill=pal['white'])
    d.text((bx + x, by + bh / 2), '||', font=F(30), fill=pal['bg'], anchor='mm')
    pill(d, bx + 110, by + 50, lab_after, 32, col_after, 1); pill(d, bx + bw - 110, by + 50, lab_before, 32, (90, 95, 105), 1)
    return img


def punch_zoom(img, t, box, pic, pal, focus=(0.72, 0.28), zoom=1.2):
    """3 펀치 줌 — 1.0초에 focus(비율 위치)로 튕기며 확대 + 흔들림 (한 편에 한 번 · 0.15초 들어가고 1초 이상 머묾)"""
    bx, by, bw, bh = box
    k = seg(t, 1.0, 1.14)
    z = 1.0 + zoom * (back(k, 1.6) if k > 0 else 0)
    fx, fy = focus; w, h = int(bw * z), int(bh * z)
    big = pic.resize((w, h), Image.BILINEAR)
    cx = int(cl(fx * w - bw / 2, 0, w - bw)); cy = int(cl(fy * h - bh / 2, 0, h - bh))
    img.paste(big.crop((cx, cy, cx + bw, cy + bh)), (bx, by))
    d = ImageDraw.Draw(img); frame_box(d, box, pal['accent'] if t > 1.0 else pal['white'])
    return shake(img, t, 1.0, pal['bg'], 14)


def word_slam(img, t, pal, word, sub, cy=900):
    """4 단어 슬램 — 0.5초에 큰 단어가 잔상과 함께 꽂히고(0.68 착지) 집중선 · 흔들림 (한 화면에 한 단어 · 숫자는 실제 값만)"""
    d = ImageDraw.Draw(img); W = img.size[0]; BG = pal['bg']
    k = seg(t, 0.5, 0.68)
    if k > 0:
        sc = 1 + 2.4 * (1 - eo(k))
        for j in range(4 if k < 1 else 0):
            s2 = sc + 0.25 * (j + 1)
            d.text((W / 2, cy), word, font=F(int(220 * s2 / 2.4 + 120)), fill=mix(pal['accent'], 0.15, BG), anchor='mm')
        d.text((W / 2, cy), word, font=F(int(220 * sc / 2.4 + 120) if k < 1 else 220), fill=pal['accent'], anchor='mm', stroke_width=6, stroke_fill=BG)
        if t > 0.68:
            for i in range(14):
                a = i / 14 * 2 * math.pi; r0 = 320 + 260 * eo(seg(t, 0.68, 1.1)); r1 = r0 + 60
                d.line([W / 2 + math.cos(a) * r0, cy + math.sin(a) * r0 * 0.5, W / 2 + math.cos(a) * r1, cy + math.sin(a) * r1 * 0.5],
                       fill=mix(pal['white'], 1 - seg(t, 0.9, 1.4), BG), width=6)
        ktext(d, W / 2, cy + 220, sub, 72, t, 1.0, pal['txt'], BG, center=True)
    return shake(img, t, 0.68, BG, 18)


def loop_end(img, t, pal, end_img, start_img, label, col):
    """5 루프 엔딩 — 끝 화면이 줄며 첫 화면이 커져 겹친다 (CTA 있는 편은 콜백 문장만)"""
    W, H = img.size
    k = eio(seg(t, 0.8, 1.8))
    a = end_img.resize((int(W * (1 - 0.45 * k)), int(H * (1 - 0.45 * k))), Image.BILINEAR)
    if k < 1: img.paste(a, ((W - a.width) // 2, (H - a.height) // 2))
    if k > 0:
        b = start_img.resize((int(W * (0.55 + 0.45 * k)), int(H * (0.55 + 0.45 * k))), Image.BILINEAR)
        img.paste(b, ((W - b.width) // 2, (H - b.height) // 2), Image.new('L', b.size, int(255 * k)))
    if t > 2.0:
        d = ImageDraw.Draw(img); pill(d, W / 2, 1450, label, 40, col, seg(t, 2.0, 2.3))
    return img


def card_deck(img, t, pics, center=(540, 950), size=(720, 960), per=0.5, start=0.3):
    """6 카드 덱 넘기기 — 위 장부터 per 초마다 왼쪽으로 날아간다 (넘기는 동안만 회전)"""
    W, H = img.size; cw, ch = size
    base = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for i in range(len(pics) - 1, -1, -1):
        tt = t - start - i * per
        if tt > per: continue
        pic = pics[i].resize((cw, ch), Image.BILINEAR)
        card = Image.new('RGBA', (cw + 20, ch + 20), (255, 255, 255, 255)); card.paste(pic, (10, 10))
        ang = (i - 2) * 3
        if tt > 0:
            e = eio(cl(tt / per)); ang += -25 * e
            ox, oy = -1100 * e, -120 * e
        else:
            ox, oy = (i % 2) * 10, i * 8
        c = card.rotate(ang, expand=True, resample=Image.BICUBIC)
        base.alpha_composite(c, (int(center[0] - c.width / 2 + ox), int(center[1] - c.height / 2 + oy)))
    img.paste(base.convert('RGB'), (0, 0), base)
    return img


def callout(img, t, box, pic, pal, spot, label, reach=(380, 680)):
    """7 콜아웃 선 — 그림 속 한 곳(spot 비율)에 원 → 꺾인 선 → 바깥 배지 (선은 얇게 · 배지는 가장자리)"""
    bx, by, bw, bh = box
    put(img, box, pic); d = ImageDraw.Draw(img); frame_box(d, box, pal['white'])
    px, py = bx + spot[0] * bw, by + spot[1] * bh
    k = seg(t, 0.4, 0.7)
    if k > 0:
        r = 36 * back(k); d.ellipse([px - r, py - r, px + r, py + r], outline=pal['accent'], width=6)
    k2 = eio(seg(t, 0.7, 1.2)); ex, ey = px + reach[0], py + reach[1]
    if k2 > 0:
        mx, my = px, py + (ey - py) * 0.6
        pts = [(px, py + 36), (px, py + 36 + (my - py) * min(1, k2 * 2))]
        if k2 > 0.5: pts.append((px + (ex - px) * (k2 - 0.5) * 2, my))
        d.line(pts, fill=pal['accent'], width=6)
    if t > 1.2: pill(d, px + reach[0], py + (ey - py) * 0.6, label, 40, (0, 0, 0), seg(t, 1.2, 1.5))
    return img


def strike_swap(img, t, pal, old, new, y=800):
    """8 취소선 교체 + 형광펜 — «A 말고 B» (근거 없는 수치 ⛔)"""
    d = ImageDraw.Draw(img); W = img.size[0]; BG = pal['bg']
    f = F(150); w1 = f.getlength(old); x1 = W / 2 - w1 / 2
    k = seg(t, 0.3, 0.6)
    if k > 0: d.text((x1, y), old, font=f, fill=mix(pal['dim'], k, BG))
    s = eio(seg(t, 0.8, 1.1))
    if s > 0: d.line([x1 - 10, y + 95, x1 - 10 + (w1 + 20) * s, y + 95], fill=pal['red'], width=14)
    k2 = seg(t, 1.2, 1.4)
    if k2 > 0:
        w2 = F(190).getlength(new); x2 = W / 2 - w2 / 2; y2 = y + 250
        hm = eio(seg(t, 1.5, 1.9))
        if hm > 0: d.rectangle([x2 - 20, y2 + 110, x2 - 20 + (w2 + 40) * hm, y2 + 200], fill=(120, 95, 10))
        sc = back(k2)
        d.text((W / 2, y2 + 95), new, font=F(int(190 * max(0.3, min(sc, 1.2)))), fill=pal['accent'], anchor='mm')
    return img


def bubble_wipe(img, t, box, a, b, pal, center=(0.5, 0.45)):
    """9 말풍선 모양 마스크 전환 — 결과 공개 직전 한 번 (테두리 없이 모양만)"""
    bx, by, bw, bh = box
    put(img, box, a)
    k = eio(seg(t, 0.6, 1.6))
    if k > 0: img.paste(b, (bx, by), bubble_mask_box(30 + 900 * k, bw * center[0], bh * center[1], bw, bh))
    frame_box(ImageDraw.Draw(img), box, pal['white'])
    return img


def timeline(img, t, pal, steps, x0=200, y0=560, gap=230, t_end=2.4, size=80):
    """10 단계 타임라인 — 점이 차례로 켜지며 노란 줄이 내려간다 (3~4단계) · steps = [(글, 색)]"""
    d = ImageDraw.Draw(img); BG = pal['bg']
    p = eio(seg(t, 0.4, t_end)) * (len(steps) - 1)
    d.line([x0, y0, x0, y0 + gap * (len(steps) - 1)], fill=(60, 64, 72), width=10)
    d.line([x0, y0, x0, y0 + gap * p], fill=pal['accent'], width=10)
    for i, (s, c) in enumerate(steps):
        on = p >= i - 0.02; k = seg(p, i - 0.02, i + 0.25)
        r = 30 + 10 * back(k) if on else 26
        d.ellipse([x0 - r, y0 + gap * i - r, x0 + r, y0 + gap * i + r], fill=c if on else pal['panel'], outline=c, width=5)
        d.text((x0 + 80, y0 + gap * i), s, font=F(size), fill=mix(pal['txt'] if on else pal['dim'], 1 if on else .5, BG), anchor='lm')
    return img


def ink_reveal(img, t, box, pic, ink, pal, under=(8, 8, 10), t0=0.3, t1=2.0):
    """11 잉크 번짐 리빌 — 문턱 지도(ink_noise)를 따라 그림이 번져 나온다 (공개 뒤에는 그대로)"""
    bx, by, bw, bh = box
    thr = 1.15 - 1.3 * eo(seg(t, t0, t1))
    m = Image.fromarray(((ink > thr) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(3))
    ik = Image.new('RGB', (bw, bh), under); ik.paste(pic, (0, 0), m)
    img.paste(ik, (bx, by)); frame_box(ImageDraw.Draw(img), box, pal['white'])
    return img


def whip_box(img, t, box, a, b, pal, t0=0.9, t1=1.25):
    """12 휩 팬 — 상자 안에서 옆으로 빠르게 밀며 모션 블러 (같은 단락 안 A → B)"""
    bx, by, bw, bh = box
    k = seg(t, t0, t1)
    if k <= 0: put(img, box, a)
    elif k >= 1: put(img, box, b)
    else:
        e = eio(k); off = int(-bw * 1.1 * e)
        canvas = Image.new('RGB', (bw, bh), pal['bg'])
        canvas.paste(a, (off, 0)); canvas.paste(b, (off + int(bw * 1.1), 0))
        sp = math.sin(math.pi * k); n = 9; acc = np.zeros((bh, bw, 3), float)
        for j in range(n): acc += np.asarray(ImageChops.offset(canvas, int((j - n / 2) * 18 * sp), 0)).astype(float)
        img.paste(Image.fromarray((acc / n).astype('uint8')), (bx, by))
    frame_box(ImageDraw.Draw(img), box, pal['white'])
    return img


# ══ 2차 20 ═════════════════════════════════════════
def zoom_through(img, t, box, a, b, pal, focus=(0.62, 0.32), t0=0.6, t1=1.25):
    """13 줌 스루 — 한 점으로 빨려 들어가 다음 그림 (한 편에 한 번)"""
    bx, by, bw, bh = box
    if t < t1:
        s = 1 + 7 * eio(seg(t, t0, t1)) ** 2
        p = crop_zoom(a, s, bw * focus[0], bh * focus[1])
        if t > t0: p = p.filter(ImageFilter.GaussianBlur(6 * seg(t, t0, t1)))
        put(img, box, p)
    else:
        s = 1 + 2.5 * (1 - eo(seg(t, t1, t1 + 0.5)))
        put(img, box, crop_zoom(b, s, bw / 2, bh / 2))
    frame_box(ImageDraw.Draw(img), box, pal['white'])
    return img


def iris_box(img, t, box, a, b, pal, ring=None):
    """14 아이리스 와이프 — 원이 열리며 교체 (테두리 링 함께)"""
    bx, by, bw, bh = box
    put(img, box, a); k = eio(seg(t, 0.6, 1.5))
    if k > 0:
        r = 30 + 900 * k; m = Image.new('L', (bw, bh), 0)
        ImageDraw.Draw(m).ellipse([bw / 2 - r, bh / 2 - r, bw / 2 + r, bh / 2 + r], fill=255)
        img.paste(b, (bx, by), m); d = ImageDraw.Draw(img)
        if k < 1: d.ellipse([bx + bw / 2 - r, by + bh / 2 - r, bx + bw / 2 + r, by + bh / 2 + r], outline=ring or pal['bg'], width=10)
    frame_box(ImageDraw.Draw(img), box, pal['white'])
    return img


def split_box(img, t, box, a, b, pal, n=3):
    """15 화면 분할 전환 — 띠 n개가 좌우로 갈라지며 아래 그림 (장 단위)"""
    bx, by, bw, bh = box; W, H = img.size
    put(img, box, b); k = eio(seg(t, 0.6, 1.4))
    if k < 1:
        for i in range(n):
            h = bh // n; strip = a.crop((0, i * h, bw, (i + 1) * h))
            dx = int((1 if i % 2 == 0 else -1) * k * (bw + 40))
            img.paste(strip, (bx + dx, by + i * h))
        d = ImageDraw.Draw(img); d.rectangle([0, 0, bx - 6, H], fill=pal['bg']); d.rectangle([bx + bw + 6, 0, W, H], fill=pal['bg'])
    frame_box(ImageDraw.Draw(img), box, pal['white'])
    return img


def glitch_box(img, t, box, a, b, pal, t0=0.8, t1=1.4, swap=1.15):
    """16 글리치 — RGB 어긋남 + 가로 조각 밀림 (0.5초 이하 · «디지털 · AI» 순간)"""
    bx, by, bw, bh = box
    put(img, box, a if t < swap else b)
    if t0 <= t < t1:
        rnd = random.Random(int(t * 30))
        reg = img.crop((bx, by, bx + bw, by + bh)); r, g, bb = reg.split()
        r = ImageChops.offset(r, rnd.randint(-24, 24), 0); bb = ImageChops.offset(bb, rnd.randint(-24, 24), rnd.randint(-6, 6))
        reg = Image.merge('RGB', (r, g, bb))
        for _ in range(7):
            y = rnd.randint(0, bh - 60); h = rnd.randint(8, 60)
            sl = reg.crop((0, y, bw, y + h)); reg.paste(ImageChops.offset(sl, rnd.randint(-80, 80), 0), (0, y))
        img.paste(reg, (bx, by))
    frame_box(ImageDraw.Draw(img), box, pal['white'])
    return img


def leak_box(img, t, box, a, b, pal, swap=1.2):
    """17 라이트 리크 — 따뜻한 빛이 상자를 쓸고 지나가며 교체 (감성 · 동화)"""
    bx, by, bw, bh = box
    put(img, box, a if t < swap else b)
    k = seg(t, 0.4, 2.0)
    if 0 < k < 1:
        lay = Image.new('RGB', (bw, bh), (0, 0, 0)); ld = ImageDraw.Draw(lay)
        cx = -300 + (bw + 600) * k
        for r, c in [(520, (255, 120, 40)), (360, (255, 170, 90)), (200, (255, 230, 190))]:
            ld.ellipse([cx - r, bh * 0.4 - r * 1.4, cx + r, bh * 0.4 + r * 1.4], fill=c)
        lay = lay.filter(ImageFilter.GaussianBlur(120)); a_ = math.sin(math.pi * k)
        reg = img.crop((bx, by, bx + bw, by + bh)); reg = ImageChops.screen(reg, Image.blend(Image.new('RGB', (bw, bh)), lay, a_))
        img.paste(reg, (bx, by))
    frame_box(ImageDraw.Draw(img), box, pal['white'])
    return img


def slot_number(img, t, pal, target, label, y=860, cw=180, size=260):
    """18 숫자 롤링(슬롯) — 자리마다 굴러가다 차례로 멈춘다 (실제 숫자만)"""
    d = ImageDraw.Draw(img); W = img.size[0]
    f = F(size); x0 = W / 2 - cw * len(target) / 2
    for i, ch in enumerate(target):
        stop = 0.8 + i * 0.45; v = int(ch)
        d.rounded_rectangle([x0 + i * cw + 8, y - 40, x0 + (i + 1) * cw - 8, y + 300], 24, fill=pal['panel'])
        box = Image.new('RGB', (cw - 16, 340), pal['panel']); bd = ImageDraw.Draw(box)
        if t < stop: pos = (t * 26 + i * 3)
        else: pos = v + 10 * 3 - 0.0 + 0.6 * math.exp(-(t - stop) * 9) * math.cos((t - stop) * 30)
        frac = pos % 1; n = int(pos) % 10
        for j, dy in ((n, -frac), ((n + 1) % 10, 1 - frac)):
            bd.text(((cw - 16) / 2, 170 + dy * 300), str(j), font=f, fill=pal['accent'] if t >= stop else pal['txt'], anchor='mm')
        img.paste(box, (int(x0 + i * cw + 8), y - 40))
    d = ImageDraw.Draw(img)
    pill(d, W / 2, 1360, label, 44, pal['blue'], seg(t, 2.0, 2.3))
    return img


def karaoke_words(img, t, pal, words, y=1440, step=0.6, t0=0.4):
    """19 카라오케 자막 (단어형) — 상자 고정 · 말하는 단어만 크게 노랗게"""
    d = ImageDraw.Draw(img); W = img.size[0]
    d.rounded_rectangle([60, y - 80, W - 60, y + 80], 30, fill=(0, 0, 0))
    f = F(64); x = 100
    for i, w in enumerate(words):
        on = t0 + i * step <= t; cur = t0 + i * step <= t < t0 + step + i * step
        ff = F(72) if cur else f
        d.text((x, y), w, font=ff, fill=pal['accent'] if cur else (pal['txt'] if on else (90, 90, 100)), anchor='lm')
        x += ff.getlength(w) + 26
    return img


def blur_in(img, t, pal, line1, line2, y=640):
    """20 블러 인 — 흐릿하게 크게 → 또렷하게 제자리 (조용한 문장)"""
    W = img.size[0]
    k = eo(seg(t, 0.3, 1.3))
    if k <= 0: return img
    lay = Image.new('RGBA', (W, 600), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    ld.text((W / 2, 200), line1, font=F(int(120 * (1.5 - 0.5 * k))), fill=pal['txt'] + (int(255 * k),), anchor='mm')
    ld.text((W / 2, 400), line2, font=F(int(150 * (1.5 - 0.5 * k))), fill=pal['accent'] + (int(255 * k),), anchor='mm')
    lay = lay.filter(ImageFilter.GaussianBlur(28 * (1 - k)))
    img.paste(lay, (0, y), lay)
    return img


def text_window(img, t, pal, pic, word, note, cy=980, pic_y=530, pic_h=900):
    """21 글자 속 그림 — 큰 단어(2~3자) 모양 창으로 그림이 보인다"""
    W, H = img.size
    k = back(seg(t, 0.3, 0.9), 1.4)
    m = Image.new('L', (W, H), 0); md = ImageDraw.Draw(m)
    if k > 0: md.text((W / 2, cy), word, font=F(int(470 * cl(k, 0, 1.15))), fill=255, anchor='mm')
    full = Image.new('RGB', (W, H), pal['bg']); full.paste(fit(pic, W, pic_h, 0.3), (0, pic_y))
    img.paste(full, (0, 0), m)
    d = ImageDraw.Draw(img)
    if t > 1.4: d.text((W / 2, cy + 350), note, font=F(44, False), fill=mix(pal['dim'], seg(t, 1.4, 1.7), pal['bg']), anchor='mm')
    return img


def hand_circle(d, t, cx, cy, rx, ry, col, t0=0.6, t1=1.4, n=90, width=12, wob=0.06):
    """22 손그림 동그라미 — 살짝 삐뚤게 한 바퀴 조금 넘게"""
    k = eio(seg(t, t0, t1)); pts = []
    for i in range(int(n * k) + 1):
        a = -1.9 + i / n * 2 * math.pi * 1.08; w = 1 + wob * math.sin(a * 3)
        pts.append((cx + rx * w * math.cos(a), cy + ry * w * math.sin(a)))
    if len(pts) > 1: d.line(pts, fill=col, width=width, joint='curve')


def arrow_draw(d, t, p0, p1, p2, col, label, label_xy, line=(0.5, 1.3), head=(1.3, 1.6), lab=(1.6, 1.9)):
    """23 화살표 그리기 — 곡선(p0 → p1 굽이 → p2)이 그려지고 머리가 튕기며 붙는다 + 라벨 (line · head · lab = 시각 구간)"""
    k = eio(seg(t, *line))
    pts = [((1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0], (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]) for u in np.linspace(0, k, 40)]
    if k > 0: d.line(pts, fill=col, width=14, joint='curve')
    q = back(seg(t, *head), 2)
    if q > 0:
        (x1, y1), (x2, y2) = pts[-2], pts[-1]; a = math.atan2(y2 - y1, x2 - x1); s = 46 * q
        d.polygon([(x2 + s * math.cos(a), y2 + s * math.sin(a)), (x2 + s * math.cos(a + 2.4), y2 + s * math.sin(a + 2.4)), (x2 + s * math.cos(a - 2.4), y2 + s * math.sin(a - 2.4))], fill=col)
    pill(d, label_xy[0], label_xy[1], label, 40, (0, 0, 0), seg(t, *lab))


def spotlight(img, t, box, rect, pal):
    """24 주변 어둡게 — 한 영역(rect)만 남기고 어둡게 → 노란 테두리"""
    W, H = img.size; k = eio(seg(t, 0.5, 1.1))
    if k > 0:
        m = Image.new('L', (W, H), int(175 * k)); ImageDraw.Draw(m).rounded_rectangle(rect, 30, fill=0)
        img.paste(Image.new('RGB', (W, H), (0, 0, 0)), (0, 0), m)
    d = ImageDraw.Draw(img); frame_box(d, box, pal['white'])
    if k >= 1: d.rounded_rectangle(rect, 30, outline=pal['accent'], width=6)
    return img


def shine(img, t, box, pal, stars):
    """25 반짝 · 빛 한 줄 — 대각선 빛이 쓸고 별이 반짝 (stars = [(x, y, 시작)])"""
    bx, by, bw, bh = box
    k = seg(t, 0.5, 1.3)
    if 0 < k < 1:
        reg = img.crop((bx, by, bx + bw, by + bh)); lay = Image.new('L', (bw, bh), 0); ld = ImageDraw.Draw(lay)
        x = -400 + (bw + 800) * k; ld.polygon([(x, 0), (x + 120, 0), (x - 380, bh), (x - 500, bh)], fill=150)
        lay = lay.filter(ImageFilter.GaussianBlur(30)); reg.paste((255, 255, 240), (0, 0), lay); img.paste(reg, (bx, by))
    d = ImageDraw.Draw(img)
    for x, y, t0 in stars:
        q = seg(t, t0, t0 + 0.5)
        if 0 < q < 1: star(d, x, y, 60 * math.sin(math.pi * q), (255, 255, 230))
    frame_box(d, box, pal['white'])
    return img


def burst(img, t, pal, pic, cx, cy, size=560, seed=3):
    """26 집중선 버스트 — 원 안의 인물/결과 + 바깥으로 뻗는 집중선"""
    d = ImageDraw.Draw(img)
    k = seg(t, 0.5, 0.75); fade = 1 - seg(t, 1.0, 1.8)
    if k > 0 and fade > 0:
        rnd = random.Random(seed)
        for i in range(70):
            a = i / 70 * 2 * math.pi + rnd.random() * 0.05; r0 = 300 + rnd.random() * 80; r1 = r0 + 900 * eo(k)
            rnd.uniform(3, 12)
            d.polygon([(cx + math.cos(a) * r0, cy + math.sin(a) * r0), (cx + math.cos(a + 0.01) * r1, cy + math.sin(a + 0.01) * r1),
                       (cx + math.cos(a - 0.01) * r1, cy + math.sin(a - 0.01) * r1)], fill=mix(pal['white'], fade, pal['bg']))
    c = fit(pic, size, size, 0.25); m = Image.new('L', (size, size), 0); ImageDraw.Draw(m).ellipse([0, 0, size, size], fill=255)
    s = 1 + 0.15 * (1 - eo(seg(t, 0.5, 0.8)))
    c = c.resize((int(size * s), int(size * s))); m = m.resize(c.size)
    img.paste(c, (int(cx - c.width / 2), int(cy - c.height / 2)), m)
    return img


def bar_chart(img, t, pal, vals, labs, note='(견본 데이터)', x0=160, y0=1500, bw=150, step=210, top=760):
    """27 막대 그래프 — 차례로 튕기며 자란다 (근거 없는 수치 ⛔ · 견본이면 표시)"""
    d = ImageDraw.Draw(img); W = img.size[0]
    d.line([120, y0, W - 120, y0], fill=pal['dim'], width=4)
    for i, v in enumerate(vals):
        k = back(seg(t, 0.4 + i * 0.35, 0.9 + i * 0.35), 1.2); h = top * v * cl(k, 0, 1.08)
        x = x0 + i * step; c = pal['accent'] if i == len(vals) - 1 else pal['blue']
        if h > 0: d.rounded_rectangle([x, y0 - h, x + bw, y0], 16, fill=c)
        d.text((x + bw / 2, y0 + 50), labs[i], font=F(40), fill=pal['txt'], anchor='mm')
    if note: d.text((W / 2, 640), note, font=F(34, False), fill=pal['dim'], anchor='mm')
    return img


def donut(img, t, pal, label, cx=540, cy=980, r=300, col=None):
    """28 도넛 링 — 진행 · 완성도 (실제 값만)"""
    d = ImageDraw.Draw(img); k = eio(seg(t, 0.4, 2.0))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(50, 54, 64), width=60)
    if k > 0: d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + 360 * k, fill=col or pal['green'], width=60)
    d.text((cx, cy), f'{int(100 * k)}%', font=F(150), fill=pal['txt'], anchor='mm')
    d.text((cx, cy + r + 110), label, font=F(52), fill=mix(pal['dim'], seg(t, 1.8, 2.2), pal['bg']), anchor='mm')
    return img


def checklist(img, t, pal, items, y0=640, gap=200, x=140):
    """29 체크리스트 — 줄마다 들어오고 체크가 그려진다 (준비물 · 단계 완료)"""
    d = ImageDraw.Draw(img); BG = pal['bg']
    for i, it in enumerate(items):
        y = y0 + i * gap; k = eo(seg(t, 0.3 + i * 0.45, 0.6 + i * 0.45))
        if k <= 0: continue
        xx = x + (1 - k) * 80
        d.rounded_rectangle([xx, y, xx + 90, y + 90], 18, outline=mix(pal['txt'], k, BG), width=6)
        d.text((xx + 140, y + 45), it, font=F(64), fill=mix(pal['txt'], k, BG), anchor='lm')
        c = eio(seg(t, 0.6 + i * 0.45, 0.85 + i * 0.45))
        if c > 0:
            pts = [(xx + 18, y + 48), (xx + 40, y + 70), (xx + 78, y + 22)]
            s1 = min(1, c * 2); s2 = max(0, c * 2 - 1)
            d.line([pts[0], (pts[0][0] + (pts[1][0] - pts[0][0]) * s1, pts[0][1] + (pts[1][1] - pts[0][1]) * s1)], fill=pal['green'], width=12)
            if s2 > 0: d.line([pts[1], (pts[1][0] + (pts[2][0] - pts[1][0]) * s2, pts[1][1] + (pts[2][1] - pts[1][1]) * s2)], fill=pal['green'], width=12)
    return img


def magnifier(img, t, box, pic, pal, r=190, zoom=2.2):
    """30 돋보기 — 렌즈가 그림 위를 지나가며 세부를 크게"""
    bx, by, bw, bh = box
    put(img, box, pic); frame_box(ImageDraw.Draw(img), box, pal['white'])
    k = eio(seg(t, 0.4, 2.6)); cx = bx + 200 + 520 * k; cy = by + 300 + 500 * math.sin(k * math.pi)
    z = crop_zoom(pic, zoom, cx - bx, cy - by).resize((bw, bh))
    lens = z.crop((int(bw / 2 - r), int(bh / 2 - r), int(bw / 2 + r), int(bh / 2 + r)))
    m = Image.new('L', (2 * r, 2 * r), 0); ImageDraw.Draw(m).ellipse([0, 0, 2 * r, 2 * r], fill=255)
    img.paste(lens, (int(cx - r), int(cy - r)), m); d = ImageDraw.Draw(img)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=pal['white'], width=10)
    d.line([cx + r * 0.7, cy + r * 0.7, cx + r * 1.25, cy + r * 1.25], fill=pal['white'], width=24)
    return img


def draw_reveal(img, t, box, pic, lmask, pal):
    """31 그리기 재현 — 선이 위에서부터 그려지고 색이 찬다 (lmask = line_art(pic) · 선이 거칠어 짧게)"""
    bx, by, bw, bh = box
    k = eio(seg(t, 0.3, 1.5)); c = eio(seg(t, 1.6, 2.5))
    base = Image.new('RGB', (bw, bh), (255, 255, 255))
    if k > 0:
        m = Image.new('L', (bw, bh), 0); ImageDraw.Draw(m).rectangle([0, 0, bw, int(bh * k)], fill=255)
        base.paste((30, 30, 34), (0, 0), ImageChops.multiply(m, lmask))
        if 0 < k < 1: ImageDraw.Draw(base).line([0, int(bh * k), bw, int(bh * k)], fill=pal['blue'], width=4)
    if c > 0: base = Image.blend(base, pic, c)
    img.paste(base, (bx, by)); frame_box(ImageDraw.Draw(img), box, pal['white'])
    return img


def page_flip_box(img, t, box, a, b, pal):
    """32 페이지 넘김 — 앞 장(a)이 왼쪽 축으로 접히고 뒷면을 지나 다음 장(b) (책 · 페이지 결과)"""
    bx, by, bw, bh = box
    k = eio(seg(t, 0.6, 1.6))
    put(img, box, b)
    if k < 1:
        ang = k * math.pi; w = int(bw * abs(math.cos(ang)))
        pg = a if ang < math.pi / 2 else b.transpose(Image.FLIP_LEFT_RIGHT)
        if w > 2:
            sk = pg.resize((w, bh)); sh = Image.blend(sk, Image.new('RGB', sk.size, (0, 0, 0)), 0.5 * math.sin(ang))
            if ang < math.pi / 2: img.paste(sh, (bx, by))
            else: img.paste(Image.blend(sh, Image.new('RGB', sh.size, (230, 225, 210)), 0.6), (bx, by))
        d = ImageDraw.Draw(img); d.line([bx, by, bx, by + bh], fill=(60, 60, 60), width=6)
    frame_box(ImageDraw.Draw(img), box, pal['white'])
    return img


# ── 사전 표 (번호 · 이름 · 함수 · 종류) ─────────
FX = [
    (1, '결과 먼저 훅 + 플래시', hook_flash, '훅'), (2, '비포 / 애프터 슬라이더', slider, '비교'),
    (3, '펀치 줌', punch_zoom, '강조'), (4, '단어 슬램', word_slam, '글자'),
    (5, '루프 엔딩', loop_end, '마무리'), (6, '카드 덱 넘기기', card_deck, '결과'),
    (7, '콜아웃 선', callout, '강조'), (8, '하이라이트 · 취소선 교체', strike_swap, '글자'),
    (9, '말풍선 모양 마스크 전환', bubble_wipe, '전환'), (10, '단계 타임라인', timeline, '정보'),
    (11, '잉크 번짐 리빌', ink_reveal, '그림'), (12, '휩 팬', whip_box, '전환'),
    (13, '줌 스루', zoom_through, '전환'), (14, '아이리스 와이프', iris_box, '전환'),
    (15, '화면 분할 전환', split_box, '전환'), (16, '글리치', glitch_box, '전환'),
    (17, '라이트 리크', leak_box, '전환'), (18, '숫자 롤링 (슬롯)', slot_number, '글자'),
    (19, '카라오케 자막', karaoke_words, '글자'), (20, '블러 인', blur_in, '글자'),
    (21, '글자 속 그림', text_window, '글자'), (22, '손그림 동그라미', hand_circle, '강조'),
    (23, '화살표 그리기', arrow_draw, '강조'), (24, '주변 어둡게', spotlight, '강조'),
    (25, '반짝 · 빛 한 줄', shine, '강조'), (26, '집중선 버스트', burst, '강조'),
    (27, '막대 그래프', bar_chart, '정보'), (28, '도넛 링', donut, '정보'),
    (29, '체크리스트', checklist, '정보'), (30, '돋보기', magnifier, '그림'),
    (31, '그리기 재현 (선 → 색)', draw_reveal, '그림'), (32, '페이지 넘김', page_flip_box, '그림'),
]
