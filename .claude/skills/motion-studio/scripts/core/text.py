"""움직이는 글자 — 튀어 오름(ktext) · 알약 배지(pill) · 타자기 · 카라오케 …

색은 전부 인자로 받는다 (영상마다 정한다). bg = 글자가 놓이는 바탕색 (투명도 대신 색 섞기).
"""
from .ease import seg, eo, back, mix
from .layout import F

WHITE = (255, 255, 255)


def ktext(d, x, y, s, size, t, t0, col, bg, bold=True, center=False, stag=0.035, out=None):
    """키네틱 글자 — 한 글자씩 튀어 오른다 · out=(t1) 이면 미끄러지며 사라진다"""
    f = F(size, bold)
    ws = [f.getlength(ch) for ch in s]; tw = sum(ws)
    x0 = x - tw / 2 if center else x
    o = seg(t, out, out + 0.35) if out else 0
    for i, ch in enumerate(s):
        k = seg(t, t0 + i * stag, t0 + i * stag + 0.35)
        if k <= 0:
            x0 += ws[i]; continue
        yy = y + (1 - back(k)) * size * 0.55 - eo(o) * size * 0.6
        a = min(1, k * 2) * (1 - o)
        d.text((x0 - eo(o) * 80, yy), ch, font=f, fill=mix(col, a, bg))
        x0 += ws[i]


def typewriter(d, x, y, s, size, lt, t0, col, cps=16, cursor=True, bold=True, anchor='la'):
    """타자기 — 한 자씩 (cps = 초당 글자). 끝나면 커서가 깜빡인다 → 진행 0~1"""
    if lt < t0: return 0
    n = min(len(s), int((lt - t0) * cps) + 1)
    f = F(size, bold); d.text((x, y), s[:n], font=f, fill=col, anchor=anchor)
    if cursor and (n < len(s) or int(lt * 2) % 2 == 0):
        wv = f.getlength(s[:n]) if anchor == 'la' else 0
        if anchor == 'la': d.rectangle([x + wv + 6, y + 4, x + wv + 12, y + size], fill=col)
    return n / len(s)


def karaoke(d, W, y, text, lt, t0, hi, bg, cps=7.5, size=46, box=(0, 0, 0), dim=(120, 120, 130)):
    """카라오케 자막 — 상자 고정, 읽은 글자만 hi 색 (cps = 초당 글자 · 폭이 넘치면 글자를 줄인다)"""
    f = F(size); w = f.getlength(text)
    if w > W - 120: f = F(int(size * (W - 140) / w)); w = f.getlength(text)
    k = eo(seg(lt, t0 - 0.3, t0))
    if k <= 0: return
    d.rounded_rectangle([60, y - 50, W - 60, y + 50], 30, fill=mix(box, k, bg))
    n = int(max(0, lt - t0) * cps); x = (W - w) / 2
    d.text((x, y), text, font=f, fill=mix(dim, k, bg), anchor='lm')
    if n > 0: d.text((x, y), text[:n], font=f, fill=hi, anchor='lm')


def pill(d, cx, cy, s, size, col, k, fg=WHITE):
    """튕기며 뜨는 알약 배지 (가운데 cx, cy · k = 0~1 진행)"""
    if k <= 0: return
    sc = back(k)
    tw = F(size).getlength(s) + size * 1.2; th = size * 1.75
    w, h = tw * sc, th * sc
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], h / 2, fill=col)
    if sc > .6:
        d.text((cx, cy), s, font=F(int(size * min(1, sc))), fill=fg, anchor='mm')
