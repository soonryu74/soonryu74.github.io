#!/usr/bin/env python3
"""받아쓰기 → 확인표 → 자막 (reference/transcribe.md)

  python3 <스킬>/scripts/transcribe.py 영상.mp4 [--out 폴더] [--chars 20] [--from 3 --to 40]
      → 폴더(기본 = 영상 옆 <이름>_받아쓰기/)에 받아쓰기.json + 확인표.md
  python3 <스킬>/scripts/transcribe.py apply 폴더          확인표의 «고친 글» 칸을 받아쓰기.json 에 반영 + 자막.srt
  python3 <스킬>/scripts/transcribe.py burn 영상.mp4 폴더 [--size 72] [--pos bottom|top] [--color FFFFFF] [--tag "자동 자막"] [--out 새.mp4]
      → 영상 옆 <이름>_자막.mp4 (원본은 그대로 · 같은 이름이 있으면 _2)
  python3 <스킬>/scripts/transcribe.py --fetch             모델 받기 (처음 한 번 · 약 560MB)
  python3 <스킬>/scripts/transcribe.py check               엔진 · 모델 있는지

★받아쓰기는 짐작 — Claude 는 소리를 못 듣는다. 확인표를 유저에게 보여 주고 고친 뒤에 굽는다.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import stt  # noqa: E402


def opt(a, k, d=None):
    return a[a.index(k) + 1] if k in a and a.index(k) + 1 < len(a) else d


def free(p):
    if not os.path.exists(p): return p
    b, e = os.path.splitext(p); i = 2
    while os.path.exists(f'{b}_{i}{e}'): i += 1
    return f'{b}_{i}{e}'


def main(a):
    if not a or a[0] in ('-h', '--help'):
        print(__doc__); return
    if a[0] == '--fetch':
        try:
            import sherpa_onnx  # noqa: F401
        except ImportError:
            print('  sherpa-onnx 설치 …'); os.system(f'{sys.executable} -m pip install -q sherpa-onnx || {sys.executable} -m pip install -q --break-system-packages sherpa-onnx')
        print('✓ 모델:', stt.fetch()); return
    if a[0] == 'check':
        d = stt.model_dir()
        try:
            import sherpa_onnx  # noqa: F401
            eng = True
        except ImportError:
            eng = False
        print(('✓' if eng else '✗') + ' 엔진 sherpa-onnx' + ('' if eng else '  → pip install sherpa-onnx'))
        print(('✓ 모델 ' + d) if d else '✗ 모델 없음  → transcribe.py --fetch'); return
    if a[0] == 'apply':
        f = a[1] if len(a) > 1 else '.'
        j, m = os.path.join(f, '받아쓰기.json'), os.path.join(f, '확인표.md')
        stt.apply_table(j, m)
        n = sum(1 for l in json.load(open(j, encoding='utf-8'))['lines'] if l.get('fixed'))
        stt.srt(j, os.path.join(f, '자막.srt'))
        print(f'✓ 고친 줄 {n}개 반영 · {f}/자막.srt — 이제 burn'); return
    if a[0] == 'burn':
        video = a[1]; f = a[2] if len(a) > 2 and not a[2].startswith('--') else None
        f = f or os.path.splitext(video)[0] + '_받아쓰기'
        out = opt(a, '--out') or free(os.path.splitext(video)[0] + '_자막.mp4')
        size = opt(a, '--size'); size = int(size) if size else None
        stt.burn(video, os.path.join(f, '받아쓰기.json'), out, size=size, pos=opt(a, '--pos', 'bottom'),
                 color=opt(a, '--color', 'FFFFFF'), tag=opt(a, '--tag'))
        print('✓', out); return
    video = a[0]
    stt.need()
    folder = opt(a, '--out') or os.path.splitext(video)[0] + '_받아쓰기'
    fa, fb = opt(a, '--from'), opt(a, '--to')
    print('  받아쓰는 중 … (1분 영상 ≈ 30초~1분)', flush=True)
    r = stt.transcribe(video, max_chars=int(opt(a, '--chars', 20)), a=float(fa) if fa else None, b=float(fb) if fb else None)
    stt.save(r, folder)
    for i, l in enumerate(r['lines'], 1):
        print(f'  {i:>2} {stt.tc(l["a"])}~{stt.tc(l["b"])}  {l["text"]}')
    print(f'✓ {folder}/확인표.md — 유저에게 보여 주고 «고친 글» 을 채운 뒤 apply → burn')


if __name__ == '__main__':
    main(sys.argv[1:])
