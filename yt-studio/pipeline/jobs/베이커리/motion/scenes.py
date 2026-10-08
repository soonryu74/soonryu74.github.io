#!/usr/bin/env python3
"""사랑의 베이커리 — 오프닝 범퍼 · 엔딩 카드 (소리 없음 · build.py 가 전체 소리에 합친다).
PART=open|end_a|end_b  python3 scenes.py --sheet | --bake"""
import os, sys
SKILL = os.environ.get('MOTION_SKILL') or '/home/user/soonryu74.github.io/.claude/skills/motion-studio'
sys.path.insert(0, os.path.join(SKILL, 'scripts'))
from core import appear, bake, camera as C, canvas, kit, motion
from core.ease import seg
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
W, H, FPS = 1280, 720, 24
PART = os.environ.get('PART', 'open')
SC = {'open': [('OPEN.dc.html', 3.0)], 'end_a': [('END_A.dc.html', 5.0)], 'end_b': [('END_B.dc.html', 5.0)]}[PART]
DURS = [d for _, d in SC]; STARTS = [0.0]; SCENES = [(0.0, DURS[0])]; DUR = DURS[0]
B = [canvas.read_board(os.path.join(HERE, 'canvas', '확정', n)) for n, _ in SC]
K = kit.load('팝' if PART == 'open' else '차분')
def texts(els): return [e for e in els if e.get('text')]
def imgs(els): return [e for e in els if e.get('src')]
def boxes(els): return [e for e in els if not e.get('text') and not e.get('src') and not e.get('svg')]

def s_open(lt, root, els):
    """로고가 툭 튀어나오고(pop) · 이름이 올라오고(up) · 노란 줄이 그어지고 · 한 줄이 스며든다. 카메라는 로고에 붙었다가 빠지며 전체 공개"""
    img = canvas.background(root)
    bg = [e for e in boxes(els) if e['w'] >= W]; bar = [e for e in boxes(els) if e['w'] < W]
    for e in bg: motion.put(img, e)
    logo = imgs(els)[0]; tx = texts(els); title = max(tx, key=lambda e: e['size']); tag = [e for e in tx if e is not title]
    appear.put(img, logo, seg(lt, 0.1, 0.55), 'pop')
    if lt > 0.55: img = img.copy(); motion.put(img, logo, s=motion.pulse(lt, 1.35, amt=0.08) * motion.breathe(lt, 0.012, period=2.6))
    appear.put(img, title, seg(lt, 0.55, 0.95), 'up', dist=50)
    for e in bar: appear.put(img, e, seg(lt, 0.9, 1.15), 'left', dist=40)
    for e in tag: appear.put(img, e, seg(lt, 1.1, 1.5), 'fade')
    c = C.keys(lt, [(0, C.on(logo, img, fill=1.25, dy=0.02)), (1.0, C.full(img), '부드럽게')])
    c = C.drift(c, max(0, lt - 1.0), DUR, amt=0.02)
    return C.shoot(img, c, (W, H))

def s_end(lt, root, els):
    """어두운 바탕에 로고가 스며들고 · 문장 두 줄이 차례로 올라오고 · 워드마크가 남는다. 카메라는 천천히 밀고 들어간다"""
    img = canvas.background(root)
    for e in [e for e in boxes(els) if e['w'] >= W]: motion.put(img, e)
    ims = imgs(els); logo, word = ims[0], ims[1]; tx = sorted(texts(els), key=lambda e: e['y']); bar = [e for e in boxes(els) if e['w'] < W]
    appear.put(img, logo, seg(lt, 0.0, 0.7), 'up', dist=30)
    if lt > 0.7: img = img.copy(); motion.put(img, logo, s=motion.breathe(lt, 0.01, period=3.0))
    appear.put(img, tx[0], seg(lt, 0.5, 1.0), 'up', dist=36)
    appear.put(img, tx[1], seg(lt, 1.0, 1.5), 'up', dist=36)
    for e in bar: appear.put(img, e, seg(lt, 1.5, 1.8), 'left', dist=30)
    appear.put(img, word, seg(lt, 1.9, 2.5), 'fade')
    c = C.keys(lt, [(0, C.full(img)), (DUR, C.at(W / 2, H / 2 - 6, 1.06), '선형')])
    return C.shoot(img, c, (W, H))

SCENE_FN = [s_open if PART == 'open' else s_end]
PLAN = [{'level': 2 if PART == 'open' else 1, 'camera': ['빠지며 공개', '천천히 흐르기'] if PART == 'open' else ['밀고 들어가기'],
         'enter': ['pop', 'up', 'left'] if PART == 'open' else ['up', 'fade'], 'emph': ['pulse'] if PART == 'open' else [], 'kick': None}]
EDIT = {}
def render(k, t, xf=0.0):
    root, els = B[k]; return SCENE_FN[k](t - STARTS[k], root, els)
def frame(t): return K.finish(render(0, t), t)
if __name__ == '__main__':
    bake.cli(sys.modules[__name__], out=os.path.join(HERE, 'out', f'{PART}.mp4'))
    if canvas.missing: print('⚠ 못 찾음:', ' · '.join(sorted(canvas.missing)))
