#!/usr/bin/env python3
"""손그림 짚기 표시 → 캔버스에 붙일 <svg> (영상과 같은 모양 · label.mark 로 계산)

  python3 <스킬>/scripts/mark.py arrow 900,1500 640,1000 [--brush] [--col '#E83E34'] [--w 12] [--seed 1] [--size 1080x1920]
  python3 <스킬>/scripts/mark.py circle 540,860 190,230      (가운데 · 가로세로 반지름)
  python3 <스킬>/scripts/mark.py box 380,640 720,1100        (왼위 · 오른아래)
  python3 <스킬>/scripts/mark.py x 860,700 120               (가운데 · 크기)
  python3 <스킬>/scripts/mark.py underline 150,900 1400      (x0,x1 · y)
  python3 <스킬>/scripts/mark.py check 200,700 120           (가운데 · 크기)
  python3 <스킬>/scripts/mark.py bold 900,600 800,350 600,300 --out 재료/bold.png   (질감 덩어리 화살표 PNG · 꼬리 · 휨 · 끝)

나온 <svg> 를 아트보드 루트 div 안 맨 끝에 붙인다(data-mark 에 종류 · 좌표가 남아 영상 코드가 같은 값으로 그려지며 등장시킨다).
⛔ 짚기 표시를 직접 도형(삼각형 머리 · 회전한 사각형 X · 매끈한 원)으로 짓지 않는다 — 이 도구로 만든다 (canvas-rules §4 «짚기 표시»).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import label  # noqa: E402


def _pt(s): return tuple(float(v) for v in s.split(','))


def _col(s):
    s = s.lstrip('#'); return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) < 2: print(__doc__); sys.exit(1)
    opt = {}; pos = []
    i = 0
    while i < len(a):
        if a[i] == '--brush': opt['brush'] = True; i += 1
        elif a[i].startswith('--'): opt[a[i][2:]] = a[i + 1]; i += 2
        else: pos.append(a[i]); i += 1
    kind = pos[0]; col = _col(opt.get('col', '#141414')); w = float(opt.get('w', 12)); seed = int(opt.get('seed', 1))
    size = tuple(int(v) for v in opt.get('size', '1080x1920').split('x'))
    if kind == 'bold':
        cols = [_col(c) for c in opt.get('cols', '#FFC83C,#FF9632,#FF5C5C').split(',')]
        png, org = label.bold_arrow(_pt(pos[1]), _pt(pos[2]), _pt(pos[3]), cols, seed=seed)
        out = opt.get('out', 'bold_arrow.png'); png.save(out)
        print(f'<img data-mark="bold {pos[1]} {pos[2]} {pos[3]} seed={seed}" src="{out}" style="position: absolute; left: {org[0]}px; top: {org[1]}px; width: {png.width}px; height: {png.height}px">')
        sys.exit(0)
    if kind == 'arrow': args = (_pt(pos[1]), _pt(pos[2]))
    elif kind in ('circle', 'box'): args = _pt(pos[1]) + _pt(pos[2])
    elif kind in ('x', 'check'): args = _pt(pos[1]) + (float(pos[2]),)
    elif kind == 'underline': args = _pt(pos[1]) + (float(pos[2]),)
    else: print(__doc__); sys.exit(1)
    kw = {'brush': True} if opt.get('brush') else {}
    st = label.mark(kind, *args, w=w, seed=seed, **kw)
    tag = ' '.join([kind] + pos[1:] + [f'w={w:g}', f'seed={seed}'] + (['brush'] if kw else []))
    print(label.mark_svg(st, col, size=size, tag=tag))
