#!/usr/bin/env python3
"""캔버스 손 선 — 아트보드의 `<svg data-hand="…">` 를 손으로 그은 선으로 바꾼다 (캔버스에 올리기 전에 · 제자리 고침).

  python3 <스킬>/scripts/handline.py canvas_src/project/*.dc.html

data-hand 꼬리표만 있으면 캔버스엔 매끈한 벡터 선이 보인다 — 이걸 돌려야 캔버스에서도 손맛이 보인다(캔버스 = 영상 마지막 화면).
이미 바꾼 svg(data-handline)는 건너뛴다 — 여러 번 돌려도 된다. 자세히 = reference/style-ref.md §5-B.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import handline  # noqa: E402

if __name__ == '__main__':
    if len(sys.argv) < 2: print(__doc__); sys.exit(1)
    for p in sys.argv[1:]:
        print(f'{p}: 손 선으로 바꾼 svg {handline.board(p)}개')
