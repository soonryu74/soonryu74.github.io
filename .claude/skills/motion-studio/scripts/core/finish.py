"""화면 겹 — 다 찍은 화면 위에 영상 전체로 한 겹 (키트의 finish 가 고른다 · 등급 β).

  apply(img, spec, t)     spec = {'grain': 0.05, 'vignette': 0.35, 'scan': 0.12, 'paper': 0.08, 'grade': 'warm', 'glow': 0.25}
  grain(img, amt, t)      필름 입자 (프레임마다 다르게 · amt 0.03~0.08)
  vignette(img, amt)      가장자리 어둡게 (0.2~0.5)
  scan(img, amt)          스캔선 (디지털 · 0.08~0.18)
  paper(img, amt)         종이 질감 (손그림 · 0.05~0.12)
  grade(img, kind)        색 보정: warm · cool · fade(바랜) · punch(진하게) · mono
  glow(img, amt)          밝은 곳 빛 번짐 (0.15~0.35)
쓰는 자리: 장면 함수가 찍은 뒤(camera.shoot 다음) 한 번 · 전환 중에도 같은 겹이 걸리게 frame(t) 끝에서 거는 게 가장 깔끔하다.
"""
import numpy as np
from PIL import Image, ImageFilter

_C = {}


def _cached(key, fn):
    if key not in _C: _C[key] = fn()
    return _C[key]


def grain(img, amt=0.05, t=0.0):
    w, h = img.size; seed = int(t * 30) % 24
    n = _cached(('grain', w, h, seed), lambda: (np.random.default_rng(seed).normal(0, 1, (h // 2, w // 2)).astype(np.float32)))
    n = np.asarray(Image.fromarray(n).resize((w, h), Image.BILINEAR), dtype=np.float32)[..., None]
    a = np.asarray(img.convert('RGB'), dtype=np.float32) + n * 255 * amt
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def vignette(img, amt=0.35):
    w, h = img.size
    m = _cached(('vig', w, h), lambda: np.clip(1 - (((np.linspace(-1, 1, w)[None, :] ** 2) * 0.8 + (np.linspace(-1, 1, h)[:, None] ** 2) * 0.8)), 0, 1).astype(np.float32))
    k = (1 - amt * (1 - m))[..., None]
    return Image.fromarray(np.clip(np.asarray(img.convert('RGB'), dtype=np.float32) * k, 0, 255).astype(np.uint8))


def scan(img, amt=0.12):
    a = np.asarray(img.convert('RGB'), dtype=np.float32).copy(); a[::3] *= (1 - amt)
    return Image.fromarray(a.astype(np.uint8))


def paper(img, amt=0.08):
    w, h = img.size
    tex = _cached(('paper', w, h), lambda: np.asarray(Image.fromarray((np.random.default_rng(9).random((h // 3, w // 3)) * 255).astype(np.uint8))
                                                      .resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.5)), dtype=np.float32)[..., None] / 255)
    a = np.asarray(img.convert('RGB'), dtype=np.float32) * (1 - amt + amt * 2 * tex)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def grade(img, kind='warm'):
    a = np.asarray(img.convert('RGB'), dtype=np.float32)
    if kind == 'warm': a = a * np.array([1.06, 1.0, 0.92])
    elif kind == 'cool': a = a * np.array([0.93, 1.0, 1.07])
    elif kind == 'fade': a = a * 0.86 + 28
    elif kind == 'punch': a = (a - 128) * 1.15 + 128
    elif kind == 'mono': g = a.mean(axis=2, keepdims=True); a = np.repeat(g, 3, axis=2)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def glow(img, amt=0.25):
    src = img.convert('RGB'); a = np.asarray(src, dtype=np.float32)
    bright = np.clip(a - 170, 0, 255) * 1.6
    small = Image.fromarray(bright.astype(np.uint8)).resize((src.width // 4, src.height // 4), Image.BILINEAR).filter(ImageFilter.GaussianBlur(8))
    b = np.asarray(small.resize(src.size, Image.BILINEAR), dtype=np.float32)
    return Image.fromarray(np.clip(a + b * amt, 0, 255).astype(np.uint8))


def apply(img, spec, t=0.0):
    """spec 순서대로: grade → glow → paper → scan → vignette → grain"""
    if not spec: return img
    if spec.get('grade'): img = grade(img, spec['grade'])
    if spec.get('glow'): img = glow(img, spec['glow'])
    if spec.get('paper'): img = paper(img, spec['paper'])
    if spec.get('scan'): img = scan(img, spec['scan'])
    if spec.get('vignette'): img = vignette(img, spec['vignette'])
    if spec.get('grain'): img = grain(img, spec['grain'], t)
    return img
