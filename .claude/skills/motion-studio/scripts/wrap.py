#!/usr/bin/env python3
"""껍데기 씌우기 — 이미 있는 영상(아무 mp4)을 창에 넣고 위아래 띠를 씌운 9:16 쇼츠 (reference/onetake.md §4)

  python3 <스킬>/scripts/wrap.py 영상.mp4 [--win 1:1|4:5] [--top 타이틀.png | --title "제목"] [--chip "관람기"] [--sub "부제"]
        [--notes "0:첫 줄|5.2:둘째 줄"] [--info "날짜 · 장소 · …"] [--motion 약하게|없음|보통] [--color auto|FFD640] [--out 새.mp4]
결과 = 영상 옆 <이름>_껍데기.mp4 (원본은 그대로 · 소리 그대로 · 같은 이름이 있으면 _2)
★글(제목 · 칩 · 한 줄 · 정보)은 유저가 준 것만 — 지어내지 않는다. 띠 색은 기본 auto(영상 색을 따라 물듦).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import shell, video as V  # noqa: E402


def opt(a, k, d=None):
    return a[a.index(k) + 1] if k in a and a.index(k) + 1 < len(a) else d


def free(p):
    if not os.path.exists(p): return p
    b, e = os.path.splitext(p); i = 2
    while os.path.exists(f'{b}_{i}{e}'): i += 1
    return f'{b}_{i}{e}'


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] in ('-h', '--help'): print(__doc__); sys.exit(0)
    src = a[0]; dur = V.probe(src)['dur']
    notes = [(float(x.split(':', 1)[0]), x.split(':', 1)[1]) for x in (opt(a, '--notes') or '').split('|') if ':' in x]
    col = opt(a, '--color', 'auto')
    colors = 'auto' if col == 'auto' else [(0, tuple(int(col[i:i + 2], 16) for i in (0, 2, 4)))]
    SH = shell.Shell(dur, win=opt(a, '--win', '1:1'), top=opt(a, '--top'), title=opt(a, '--title'), chip=opt(a, '--chip'), sub=opt(a, '--sub'),
                     notes=notes, info=opt(a, '--info'), motion=opt(a, '--motion', '약하게'), colors=colors)
    out = opt(a, '--out') or free(os.path.splitext(src)[0] + '_껍데기.mp4')
    print('  껍데기 씌우는 중 …', flush=True); print('✓', SH.wrap_video(src, out))
