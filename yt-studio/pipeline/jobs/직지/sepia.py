"""archive/*.jpg → 재료/ph_<키>.jpg : 종이 전단에 붙인 옛 사진 느낌(따뜻한 세피아 · 살짝 바램) · 긴 변 1600"""
from PIL import Image, ImageOps, ImageEnhance
import glob, os
for f in sorted(glob.glob('재료/archive/*.jpg')):
    k = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert('RGB'); im = ImageOps.exif_transpose(im)
    im.thumbnail((1600, 1600), Image.LANCZOS)
    g = ImageOps.grayscale(im)
    sep = ImageOps.colorize(g, black=(38, 26, 18), white=(238, 226, 200), mid=(150, 118, 84))
    out = Image.blend(im, sep, 0.72)                       # 색을 조금 남긴다
    out = ImageEnhance.Contrast(out).enhance(0.92)
    out.save(f'재료/ph_{k}.jpg', quality=90)
    print(k, out.size)
