"""참조 이미지 → 색 목록 (상위색 + 작은 면적의 강조색). 비전 판단과 맞춰 보는 재료.
  python3 style_colors.py ref.png [--n 8] [--accent 4] → JSON stdout"""
import colorsys, json, sys
from collections import Counter
from PIL import Image

def hexs(c): return '#%02X%02X%02X' % c

def main(path, n=8, na=4):
    im = Image.open(path).convert('RGB'); im.thumbnail((480, 480))
    q = im.quantize(n, method=Image.Quantize.MEDIANCUT).convert('RGB')
    tot = im.width * im.height
    dom = [(hexs(c), round(v / tot, 3)) for c, v in Counter(q.getdata()).most_common(n)]
    # 강조색: 채도 · 밝기가 높은 픽셀만 따로 모아 묶는다 (면적이 작아도 잡히게)
    px = [p for p in im.getdata() if (lambda h, s, v: s > 0.45 and v > 0.45)(*colorsys.rgb_to_hsv(*(x / 255 for x in p)))]
    acc = []
    if px:
        sub = Image.new('RGB', (len(px), 1)); sub.putdata(px)
        qa = sub.quantize(na, method=Image.Quantize.MEDIANCUT).convert('RGB')
        acc = [(hexs(c), round(v / tot, 3)) for c, v in Counter(qa.getdata()).most_common(na)]
    print(json.dumps({'dominant': dom, 'accent': acc}, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    a = sys.argv[1:]
    main(a[0], int(a[a.index('--n') + 1]) if '--n' in a else 8, int(a[a.index('--accent') + 1]) if '--accent' in a else 4)
