#!/usr/bin/env python3
"""굽기 뒤 피드백 도구 (reference/feedback.md)

  python3 <스킬>/scripts/feedback.py viewer out/영상.mp4 [--srt 자막.srt] [--work 폴더]
        → 작업 폴더에 피드백뷰어.html (굽기 --bake 끝에 자동으로도 만들어진다)
          --work = 뷰어를 둘 폴더(기본 = out/ 의 부모 · ★그 자리의 피드백뷰어.html 은 새로 쓴다)
          자막이 있으면 대사 줄을 함께 심는다 — 안 주면 out/영상이름.srt · out/자막.srt · 작업 폴더/자막.srt 순으로 찾는다
  python3 <스킬>/scripts/feedback.py sheet out/영상.mp4 19.7 24.3 [--span 1 --step 0.25 --out 살펴보기/피드백1]
        → 짚은 시각마다 앞뒤 프레임 한 줄 시트 (가운데 = 짚은 시각 · 노란 테두리)
  python3 <스킬>/scripts/feedback.py sheet out/영상.mp4 --paste 피드백.txt --out 살펴보기/피드백1
        → «[피드백]» 붙여 넣은 글을 파일로 주면 항목마다 한 줄씩 (범위는 시작 · 끝 둘) · 위치 핀도 표시
  python3 <스킬>/scripts/feedback.py loud out/영상.mp4 12 18
        → 0.25초마다 소리 크기 막대 (외침 · 박수 · 대사 시작 자리)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import feedback as FB  # noqa: E402


def opt(a, k, d=None):
    return a[a.index(k) + 1] if k in a and a.index(k) + 1 < len(a) else d


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) < 2: print(__doc__); sys.exit(1)
    cmd, vid = a[0], a[1]
    if cmd == 'viewer':
        print(FB.viewer(vid, work=opt(a, '--work'), srt=opt(a, '--srt')))
    elif cmd == 'sheet':
        out = opt(a, '--out', '살펴보기/피드백'); span = float(opt(a, '--span', 1.0)); step = float(opt(a, '--step', 0.25))
        if '--paste' in a:
            items = FB.parse(open(opt(a, '--paste'), encoding='utf-8').read(), FB.fps_of(vid))
            for it in items:
                ts = [it['a']] + ([it['b']] if it['b'] is not None else [])
                print(f"{it['n']}. {FB.tc(it['a'])}{' ~ ' + FB.tc(it['b']) if it['b'] is not None else ''} · {it['kind']} · {it['memo']}")
                print('   →', FB.sheet(vid, ts, out, span, step, pos=it['pos'], name=f"시트_{it['n']:02d}"))
        else:
            ts = [float(x) if ':' not in x else FB.sec(x) for x in a[2:] if not x.startswith('--') and a[a.index(x) - 1] not in ('--out', '--span', '--step')]
            print(FB.sheet(vid, ts, out, span, step))
    elif cmd == 'loud':
        lo, hi = float(a[2]), float(a[3]); print(FB.loud_text(FB.loud(vid, lo, hi)))
    else:
        print(__doc__)
