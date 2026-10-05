"""글꼴 · 그림 맞추기 — fx.py · text.py 가 쓰는 기본 도구 (Pretendard · 꽉 채워 자르기).

캔버스 요소의 글꼴은 canvas.py 가 따로 찾는다(유저 글꼴 포함).
"""
import os
from PIL import Image, ImageFont

from . import paths

ASPECTS = {'9:16': (1080, 1920), '16:9': (1920, 1080), '1:1': (1080, 1080), '4:5': (1080, 1350), '3:4': (1080, 1440)}

FONT_FILES = {True: 'Pretendard-Bold.otf', False: 'Pretendard-Regular.otf'}   # 굵게 / 보통
_f = {}


def F(n, b=True):
    """글꼴 (크기 n · 굵게 b) — 캐시"""
    if (n, b) not in _f: _f[(n, b)] = ImageFont.truetype(os.path.join(paths.FONTS, FONT_FILES[b]), n)
    return _f[(n, b)]


def fit(im, w, h, focus=0.5):
    """비율을 지키며 꽉 채워 자르기 (focus = 세로로 어디를 남길지 0 위 ~ 1 아래)"""
    r = max(w / im.width, h / im.height)
    im2 = im.resize((int(im.width * r) + 1, int(im.height * r) + 1), Image.LANCZOS)
    x0 = int((im2.width - w) * 0.5); y0 = int((im2.height - h) * focus)
    return im2.crop((x0, y0, x0 + w, y0 + h))
