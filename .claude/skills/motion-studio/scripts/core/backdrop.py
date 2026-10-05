"""배경 층 — 비율과 상관없이 빈 곳을 채우는, 천천히 움직이는 빛 (스타일 색으로).

장면 바탕에 깔아 쓴다. ⛔ 글자·그림보다 앞에 나오지 않는다 (밝기 낮게).
"""
import math

from PIL import Image, ImageDraw, ImageFilter


class Backdrop:
    def __init__(self, W, H, bg, cols, strength=0.22, seed=3):
        self.W, self.H, self.bg = W, H, tuple(bg)
        R = int(max(W, H) * 0.55); self.blobs = []
        for i, c in enumerate(cols):
            g = Image.new('L', (2 * R, 2 * R), 0); d = ImageDraw.Draw(g)
            for r in range(R, 0, -6): d.ellipse([R - r, R - r, R + r, R + r], fill=int(255 * strength * (1 - r / R) ** 1.6))
            layer = Image.new('RGBA', (2 * R, 2 * R), tuple(c) + (0,)); layer.putalpha(g.filter(ImageFilter.GaussianBlur(R // 8)))
            ph = seed * 1.7 + i * 2.1
            self.blobs.append((layer, R, ph, 0.05 + 0.02 * i))
        # 아주 옅은 대각 결 (정지) — 평평한 면의 «빈» 느낌을 덜어 준다
        self.grain = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(self.grain)
        for x in range(-H, W, 46): gd.line([(x, H), (x + H, 0)], fill=(255, 255, 255, 6), width=2)

    def frame(self, t):
        img = Image.new('RGBA', (self.W, self.H), self.bg + (255,))
        for i, (layer, R, ph, sp) in enumerate(self.blobs):
            cx = self.W * (0.2 + 0.6 * (0.5 + 0.5 * math.sin(t * sp * 2 * math.pi + ph)))
            cy = self.H * (0.25 + 0.5 * (0.5 + 0.5 * math.cos(t * sp * 1.6 * math.pi + ph * 1.3)))
            img.alpha_composite(layer, (int(cx - R), int(cy - R)))
        img.alpha_composite(self.grain)
        return img.convert('RGB')
