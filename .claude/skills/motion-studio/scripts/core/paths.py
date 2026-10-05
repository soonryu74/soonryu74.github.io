"""경로 — 세션(샌드박스) 이름이 바뀌어도 깨지지 않게, 하드코딩 없이 스스로 찾는다.

  ROOT    작업 루트 (공용 폴더가 있는 곳 · 없으면 스킬 폴더의 부모)
  ENGINE  motion-studio/ (스킬 폴더)
  FONTS   글꼴 폴더 (스킬에 들어 있는 Pretendard)
  SF2     배경음 사운드폰트 — ★스킬에 넣지 않는다(용량). 처음 쓰는 사람은 내려받는다 → SF2_GUIDE
          찾는 순서: 환경변수 SF2 → <ROOT>/0000_공용형식/sf2/ → <ROOT>/sf2/
  TMP     임시 폴더
환경변수로 덮어쓸 수 있다: MI_ROOT · MI_FONTS · SF2 · MI_TMP
"""
import os
import tempfile

ENGINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))   # …/motion-studio
COMMON = '0000_공용형식'   # 작업 루트 표식 (이 폴더가 있는 조상 = ROOT)


def _find_root():
    if os.environ.get('MI_ROOT'): return os.environ['MI_ROOT']
    d = ENGINE
    while True:
        if os.path.isdir(os.path.join(d, COMMON)): return d
        up = os.path.dirname(d)
        if up == d: return os.path.dirname(ENGINE)
        d = up


ROOT = _find_root()
FONTS = os.environ.get('MI_FONTS') or os.path.join(ENGINE, 'assets', 'fonts')

SF2_NAME = 'GeneralUser-GS.sf2'
SF2_URL = 'https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/GeneralUser-GS.sf2'      # 직통 주소 (클라우드 작업 공간에서도 열린다)
SF2_URL_ALT = 'https://github.com/mrbumpy409/GeneralUser-GS/raw/refs/heads/main/GeneralUser-GS.sf2'   # 예비 (클라우드에서는 막힐 수 있다)
SF2_PAGE = 'https://www.schristiancollins.com/generaluser'


def _find_sf2():
    cands = [os.environ.get('SF2'), os.path.join(os.getcwd(), 'sf2', SF2_NAME), os.path.join(ROOT, COMMON, 'sf2', SF2_NAME),
             os.path.join(ROOT, 'sf2', SF2_NAME)]
    for c in cands:
        if c and os.path.isfile(c): return c
    return None


SF2 = _find_sf2()
SF2_GUIDE = f"""배경음 사운드폰트({SF2_NAME}, 약 31MB)가 없어요 — 처음 한 번만 내려받으면 됩니다.
  1) 내려받기: {SF2_URL}
     (안 되면 예비 주소: {SF2_URL_ALT} · 안내 페이지: {SF2_PAGE} · 무료 · 상업 이용 가능)
     ★클라우드 작업 공간이면 Claude 가 위 직통 주소로 먼저 직접 받는다(유저에게 부탁하기 전에)
  2) 넣을 곳: 작업 폴더 안 sf2/{SF2_NAME}
     (다른 곳에 두려면 환경변수 SF2=<파일 경로>)"""


def need_sf2():
    if not SF2: raise SystemExit('⛔ ' + SF2_GUIDE)
    return SF2
def _roomiest_tmp():
    """임시 폴더 후보 중 여유가 가장 큰 곳 (샌드박스의 기본 임시 폴더는 공용 디스크라 좁을 때가 많다)"""
    import shutil
    cands = [d for d in dict.fromkeys([tempfile.gettempdir(), '/tmp']) if os.path.isdir(d) and os.access(d, os.W_OK)]
    return max(cands, key=lambda d: shutil.disk_usage(d).free)


TMP_BASE = os.environ.get('MI_TMP') or os.path.join(_roomiest_tmp(), 'motion_tmp')


def res(p):
    """상대 경로 → ROOT 기준 절대 경로 (절대 경로는 그대로)"""
    return p if os.path.isabs(p) else os.path.join(ROOT, p)


def tmp(name):
    d = os.path.join(TMP_BASE, name); os.makedirs(d, exist_ok=True); return d
