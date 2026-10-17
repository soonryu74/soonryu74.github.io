"""첫 사용 점검 — 굽기에 필요한 것이 다 있는지 · --fix 면 빠진 것을 알아서 받는다

  python3 <스킬>/scripts/check.py [작업 폴더]                       점검만 (✓ / ✗ + 안내)
  python3 <스킬>/scripts/check.py [작업 폴더] --fix                 빠진 것 받기 — 패키지 · 사운드폰트 · ffmpeg
  python3 <스킬>/scripts/check.py [작업 폴더] --asr                받아쓰기(자막)도 점검 · --fix 와 같이면 엔진 · 모델(약 560MB)도 받기
  python3 <스킬>/scripts/check.py [작업 폴더] --fix --fonts "Jua,Noto Sans KR"   + 글꼴 (Google Fonts 원본 → 작업 폴더 fonts/)

★클라우드 작업 공간 = 묻지 않고 --fix 로 받아 쓴다 · 안 될 때만 유저에게 요청(무엇이 · 왜 · 파일을 어디에 넣으면 되는지).
 로컬 굽기(유저 터미널)는 예외 — 자동 받기 없이 점검 안내만.
 받는 곳: 사운드폰트 = 작업 폴더 sf2/ · 글꼴 = 작업 폴더 fonts/ (캔버스 업로드도 같은 파일) · 패키지 = pip
"""
import os
import re
import shutil
import subprocess
import sys
import urllib.request

here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
ok = True
FIX = '--fix' in sys.argv
_a = sys.argv[1:]
FONTS = next((_a[i + 1] for i, v in enumerate(_a) if v == '--fonts' and i + 1 < len(_a)), '')
WORK = next((v for i, v in enumerate(_a) if not v.startswith('--') and (i == 0 or _a[i - 1] != '--fonts')), None)
GF_RAW = 'https://raw.githubusercontent.com/google/fonts/main'


def line(good, msg, fix=''):
    global ok
    print(('✓ ' if good else '✗ ') + msg + ('' if good or not fix else f'\n    → {fix}'))
    ok = ok and good


def pip(*args):
    """pip 설치 하나 — 시스템 파이썬이면 --break-system-packages 를 붙여 다시"""
    for extra in ([], ['--break-system-packages']):
        r = subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', *args, *extra], capture_output=True, text=True)
        if r.returncode == 0: return True
        if 'externally-managed' not in (r.stderr + r.stdout): break
    return False


def get(url, dst, tries=2):
    os.makedirs(os.path.dirname(dst) or '.', exist_ok=True); tmp = dst + '.part'; err = None
    for _ in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=60) as r, open(tmp, 'wb') as f: shutil.copyfileobj(r, f)
            os.replace(tmp, dst); return True
        except Exception as ex:
            err = ex
    if os.path.exists(tmp): os.remove(tmp)
    print(f'    (받기 실패: {url} — {err})'); return False


def importable(mod):
    return subprocess.run([sys.executable, '-c', f'import {mod}'], capture_output=True).returncode == 0


def fetch_font(family, dst_dir='fonts', weights=(400, 700, 900)):
    """Google Fonts 원본(raw.githubusercontent.com/google/fonts)에서 글꼴 받기 → [파일]
    가변 글꼴(이름[wght].ttf)은 fontTools 로 굵기마다 고정 글꼴을 만들어 둔다(엔진 · 캔버스가 굵기를 고르게)"""
    slug = re.sub(r'[^a-z0-9]', '', family.lower()); meta = None; lic = None
    for lic in ('ofl', 'apache', 'ufl'):
        try:
            with urllib.request.urlopen(f'{GF_RAW}/{lic}/{slug}/METADATA.pb', timeout=30) as r: meta = r.read().decode(); break
        except Exception: continue
    if not meta: return []
    files = sorted(set(re.findall(r'filename:\s*"([^"]+)"', meta)))
    files = [f for f in files if 'Italic' not in f] or files
    out = []
    for fn in files:
        dst = os.path.join(dst_dir, fn)
        if not os.path.exists(dst) and not get(f'{GF_RAW}/{lic}/{slug}/{urllib.request.quote(fn)}', dst): continue
        if '[' in fn:                                                    # 가변 → 고정 굵기
            if not importable('fontTools'): pip('fonttools')
            try:
                from fontTools.ttLib import TTFont
                from fontTools.varLib import instancer
                base = fn.split('[')[0]; axes = {a.axisTag: (a.minValue, a.maxValue) for a in TTFont(dst)['fvar'].axes}
                for w in weights:
                    if 'wght' in axes and not axes['wght'][0] <= w <= axes['wght'][1]: continue
                    sd = os.path.join(dst_dir, f'{base}-{w}.ttf')
                    if not os.path.exists(sd):
                        instancer.instantiateVariableFont(TTFont(dst), {'wght': w} if 'wght' in axes else {}, updateFontNames=True).save(sd)
                    out.append(sd)
                vd = os.path.join(os.path.dirname(os.path.abspath(dst_dir)), '_글꼴_가변원본')   # fonts/ 밖으로 — 굵기 고르기가 헷갈리지 않게
                os.makedirs(vd, exist_ok=True); shutil.move(dst, os.path.join(vd, fn))
            except Exception as ex:
                print(f'    (가변 글꼴 나누기 실패 {fn}: {ex} — 원본 그대로 둠)'); out.append(dst)
        else:
            out.append(dst)
    return out


if __name__ == '__main__':
    if WORK: os.chdir(WORK)

    # ── ffmpeg ──
    if not shutil.which('ffmpeg') and FIX:
        if shutil.which('apt-get') and hasattr(os, 'geteuid') and os.geteuid() == 0:
            subprocess.run(['apt-get', 'install', '-y', '-qq', 'ffmpeg'], capture_output=True)
        elif shutil.which('brew'):
            subprocess.run(['brew', 'install', 'ffmpeg'], capture_output=True)
        if not shutil.which('ffmpeg') and pip('imageio-ffmpeg'):          # 실행 파일이 든 패키지 → PATH 에 연결
            try:
                r = subprocess.run([sys.executable, '-c', 'import imageio_ffmpeg as m; print(m.get_ffmpeg_exe())'], capture_output=True, text=True)
                exe = r.stdout.strip(); bd = os.path.expanduser('~/.local/bin'); os.makedirs(bd, exist_ok=True)
                ln = os.path.join(bd, 'ffmpeg')
                if exe and not os.path.exists(ln): os.symlink(exe, ln)
                os.environ['PATH'] = bd + os.pathsep + os.environ.get('PATH', '')
                print(f'    (ffmpeg = imageio-ffmpeg 실행 파일 · {ln} — PATH 에 ~/.local/bin 이 없으면 export PATH="$HOME/.local/bin:$PATH")')
            except Exception: pass
    line(bool(shutil.which('ffmpeg')), 'ffmpeg', 'brew install ffmpeg (맥) · apt install ffmpeg')
    if not shutil.which('ffprobe'): print('· ffprobe 없음 — 영상 넣기(길이 읽기) 때만 필요 · ffmpeg 를 정식 설치하면 같이 들어온다')

    # ── 파이썬 패키지 — 하나씩 따로 (한 줄에 묶으면 하나 실패에 다 안 깔린다) ──
    for mod, pipn, alt in (('PIL', 'Pillow', None), ('numpy', 'numpy', None), ('tinysoundfont', 'tinysoundfont', ('tinysoundfont', '--no-deps'))):
        if FIX and not importable(mod):
            if not pip(pipn) and alt: pip(*alt)
        line(importable(mod), pipn + (' (배경음)' if mod == 'tinysoundfont' else ''),
             f'pip install {pipn}' + ('  (pyaudio 빌드 오류가 나면: pip install tinysoundfont --no-deps)' if mod == 'tinysoundfont' else ''))
    if FIX and not importable('pedalboard'):                              # 일부 CPU 에서 최신판이 «Illegal instruction»
        pip('pedalboard')
        if not importable('pedalboard'): pip('pedalboard==0.9.16')
    line(importable('pedalboard'), 'pedalboard (배경음 다듬기)', 'pip install pedalboard  · 설치돼 있는데 죽으면: pip install "pedalboard==0.9.16"')

    # ── 사운드폰트 ──
    from core import paths  # noqa: E402
    if not paths.SF2 and FIX:
        dst = os.path.join(os.getcwd(), 'sf2', paths.SF2_NAME)
        if get(paths.SF2_URL, dst) or get(paths.SF2_URL_ALT, dst): paths.SF2 = dst
    line(bool(paths.SF2), f'사운드폰트 {paths.SF2_NAME}', paths.SF2_GUIDE.replace('\n', '\n    '))

    # ── 글꼴 ──
    from core import canvas  # noqa: E402
    line(bool(canvas._registry().get('pretendard')), '기본 글꼴 Pretendard', '스킬 assets/fonts 가 비었어요 — 스킬을 다시 설치')
    for fam in [f.strip() for f in FONTS.split(',') if f.strip()]:
        key = re.sub(r'[^0-9a-z가-힣]', '', fam.lower())
        have = canvas._registry().get(key)
        if not have and FIX:
            got = fetch_font(fam); canvas._reg = None; have = canvas._registry().get(key) or got
        line(bool(have), f'글꼴 {fam}', 'Google Fonts 에 없는 글꼴이면 파일을 작업 폴더 fonts/ 에 넣어 주세요 (없으면 Pretendard 로 대신)')

    # ── 받아쓰기 (선택 · --asr 일 때만) ──
    if '--asr' in sys.argv:
        from core import stt  # noqa: E402
        if FIX and not importable('sherpa_onnx'): pip('sherpa-onnx')
        if FIX and importable('sherpa_onnx') and not stt.model_dir():
            try: stt.fetch()
            except SystemExit as ex: print(ex)
        print(('✓ ' if importable('sherpa_onnx') and stt.model_dir() else '· ') + '받아쓰기 (자막 만들 때만 · 없어도 굽기는 됨)'
              + ('' if importable('sherpa_onnx') and stt.model_dir() else '\n    → python3 <스킬>/scripts/transcribe.py --fetch'))

    r = subprocess.run([sys.executable, '-c', 'import playwright'], capture_output=True)
    print(('✓ ' if r.returncode == 0 else '· ') + 'playwright (글자 화면 점검 · 없어도 굽기는 됨 · 자동 설치 안 함)'
          + ('' if r.returncode == 0 else '\n    → pip install playwright && python3 -m playwright install chromium'))
    print('\n준비 끝 — 굽기 가능' if ok else '\n✗ 표시를 먼저 해결하세요 (배경음만 없으면 소리 없이 굽기는 됩니다)' + ('' if FIX else ' · 클라우드면 --fix 로 받기'))
