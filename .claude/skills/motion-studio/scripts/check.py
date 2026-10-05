"""첫 사용 점검 — 굽기에 필요한 것이 다 있는지 (한 번만 돌리면 된다).

  python3 <스킬>/scripts/check.py [작업 폴더]
"""
import os
import shutil
import subprocess
import sys

here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
ok = True


def line(good, msg, fix=''):
    global ok
    print(('✓ ' if good else '✗ ') + msg + ('' if good or not fix else f'\n    → {fix}'))
    ok = ok and good


if len(sys.argv) > 1: os.chdir(sys.argv[1])
line(bool(shutil.which('ffmpeg')), 'ffmpeg', 'brew install ffmpeg (맥) · apt install ffmpeg')
for mod, pipn in (('PIL', 'Pillow'), ('numpy', 'numpy')):
    try: __import__(mod); line(True, pipn)
    except ImportError: line(False, pipn, f'pip install {pipn}')
try:
    import tinysoundfont  # noqa
    line(True, 'tinysoundfont (배경음)')
except ImportError:
    line(False, 'tinysoundfont (배경음)', 'pip install tinysoundfont  (pyaudio 빌드 오류가 나면: pip install tinysoundfont --no-deps)')
r = subprocess.run([sys.executable, '-c', 'import pedalboard'], capture_output=True)   # 일부 CPU 에서 최신판이 «Illegal instruction»으로 죽는다
line(r.returncode == 0, 'pedalboard (배경음 다듬기)',
     'pip install pedalboard  · 설치돼 있는데 죽으면: pip install "pedalboard==0.9.16"')
from core import paths
line(bool(paths.SF2), f'사운드폰트 {paths.SF2_NAME}', paths.SF2_GUIDE.replace('\n', '\n    '))
from core import canvas
pre = canvas._registry().get('pretendard')
line(bool(pre), '기본 글꼴 Pretendard', '스킬 assets/fonts 가 비었어요 — 스킬을 다시 설치')
print('\n준비 끝 — 굽기 가능' if ok else '\n✗ 표시를 먼저 해결하세요 (배경음만 없으면 소리 없이 굽기는 됩니다)')
