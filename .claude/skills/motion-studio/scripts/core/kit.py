"""키트 — 한 영상의 «문법» 한 벌 (reference/kits.md). 영상끼리는 키트를 바꿔 다르게, 한 영상 안에서는 키트 안에서 변주한다.
★키트는 일관성을 지키는 최소한의 바닥이지 제한이 아니다 — 내용에 더 맞는 움직임은 키트 밖에서 가져와 쓴다(PLAN 에 이유).
빌림은 벌점이 아니다: 점검 보고는 빌린 것을 이유와 함께 «보이게»만 한다. 기본 움직임(COMMON)은 모든 키트에 들어 있다.

  K = kit.load('팝')
  EDIT = K.cuts([1, 2, 1, 3])          장면 경계마다 세기(1~3) → {경계 j: (편집 이름, 길이, 옵션)} · 같은 편집이 연달아 나오지 않게 고른다
  img = K.edit(name, a, b, u, **opt)   경계 편집 실행 (camera.EDITS + 효과 사전 전환 whip · glitch · zoom_through)
  img = K.finish(img, t)               화면 겹 (finish.py)
  K.ease · K.music · K.sfx · K.enter · K.camera · K.emph · K.kicks   — 기획 · 장면 코드가 참고
  report = check(M)                    점검 보고 (bake --check) — M.KIT · M.PLAN · M.EDIT 를 본다
"""
import os
import re
import sys

import numpy as np

if __package__ in (None, ''):   # python3 <스킬>/scripts/core/kit.py 팝 — 바로 실행해도 되게
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); __package__ = 'core'
from . import camera, finish as _finish

DUR = {'cut': 0.0, 'flash': 0.24, 'dip': 0.4, 'dissolve': 0.5, 'blur_cut': 0.6, 'burn': 0.7, 'impact': 0.5, 'zoom_cut': 0.5,
       'whip': 0.4, 'zoom_blur': 0.4, 'push': 0.45, 'cover': 0.45, 'reveal': 0.45, 'stretch': 0.45, 'cube': 0.55, 'tiles': 0.6,
       'drop': 0.5, 'blinds': 0.55, 'clock': 0.6, 'slice': 0.5, 'glitch': 0.4, 'rgb_split': 0.35, 'pixelate': 0.45,
       'zoom_through': 0.6, 'spin_cut': 0.5}

KITS = {
    '팝': dict(grade='✓', label='팝 · 경쾌',
              cuts={1: ['push(left)', 'cover(up)', 'stretch(left)'], 2: ['cube(left)', 'tiles', 'drop'], 3: ['impact']},
              camera=['빠지며 공개', '끊어 다가가기', '훑기', '시선 옮기기', '천천히 흐르기'], enter=['pop', 'up', 'left', 'right', 'spin_in'],
              emph=['pulse', 'underline', 'shine', 'sparkles'], ease='튕김', finish={'grade': 'punch'}, music='pop',
              sfx={'cut': 'whoosh', 'enter': 'mallet', 'emph': 'chime', 'impact': 'hit'},
              kicks=['아니지~ 다시', '닿을 듯 → 제자리', '앞뒤 흔들기']),
    '시네마': dict(grade='✓', label='시네마 · 강렬',
                cuts={1: ['cut', 'dip'], 2: ['zoom_cut', 'whip', 'zoom_blur'], 3: ['impact', 'flash', 'zoom_through']},
                camera=['빠른 줌', '손에 든 카메라', '기울기', '밀고 들어가기', '초점 옮기기'], enter=['zoom', 'blur_in', 'wipe', 'left', 'right', 'lines'],
                emph=['burst', 'shake', 'punch_zoom', 'spotlight'], ease='빠르게', finish={'grade': 'punch', 'vignette': 0.35, 'grain': 0.04},
                music='cinema', sfx={'cut': 'whoosh', 'enter': 'whoosh', 'emph': 'whoosh', 'impact': 'hit'},
                kicks=['쾅 직전 슬로', '멈추고 짚기', '결과 먼저 → 되감기']),
    '차분': dict(grade='✓', label='차분 · 감성',
               cuts={1: ['dissolve', 'blur_cut'], 2: ['burn', 'blinds', 'reveal(left)'], 3: ['dip(white)']},
               camera=['천천히 흐르기', '초점 옮기기', '밀고 들어가기'], enter=['fade', 'lines', 'blur_in', 'up'],
               emph=['highlight', 'underline', 'shine'], ease='부드럽게', finish={'grade': 'warm', 'glow': 0.2, 'vignette': 0.2, 'grain': 0.03},
               music='study', sfx={'cut': None, 'enter': 'chime', 'emph': 'chime', 'impact': 'bell'},
               kicks=['멈추고 짚기', '끝에서 처음으로']),
    '테크': dict(grade='β', label='테크 · 디지털',
               cuts={1: ['cut', 'slice'], 2: ['glitch', 'rgb_split', 'pixelate'], 3: ['zoom_blur']},
               camera=['점프 컷', '훑기', '끊어 다가가기'], enter=['type_text', 'wipe', 'flip_in'],
               emph=['rgb_split', 'blink', 'spotlight'], ease='선형', finish={'grade': 'cool', 'scan': 0.1, 'grain': 0.03},
               music='pop', sfx={'cut': 'tick', 'enter': 'tick', 'emph': 'tick', 'impact': 'hit'},
               kicks=['빨리 감기', '앞뒤 흔들기', '되감고 바꿔 보기']),
    '손그림': dict(grade='β', label='손그림 · 종이',
                cuts={1: ['cover(left)', 'reveal(left)'], 2: ['clock', 'stretch(left)', 'tiles'], 3: ['drop']},
                camera=['천천히 흐르기', '훑기'], enter=['pop', 'wipe', 'spin_in', 'draw_on', 'write', 'draw'],
                emph=['hand_circle', 'underline', 'highlight', 'arrow_draw'], ease='튕김', finish={'grade': 'warm', 'paper': 0.08},
                music='tale', sfx={'cut': 'whoosh', 'enter': 'mallet', 'emph': 'chime', 'impact': 'hit'},
                kicks=['결과 먼저 → 되감기', '아니지~ 다시']),
    '다큐': dict(grade='β', label='다큐 · 현장',
               cuts={1: ['cut', 'dissolve'], 2: ['dip', 'push(left)'], 3: ['flash']},
               camera=['손에 든 카메라', '시선 옮기기', '초점 옮기기'], enter=['fade', 'up'],
               emph=['arrow_draw', 'spotlight', 'underline'], ease='부드럽게', finish={'grade': 'fade', 'grain': 0.03},
               music='study', sfx={'cut': None, 'enter': None, 'emph': 'tick', 'impact': 'hit'},
               kicks=['멈추고 짚기', '멈춘 채 카메라만']),
}

# 모든 키트에 들어 있는 기본 움직임 — 빌림으로 세지 않는다 (키트는 바닥이지 제한이 아니다)
COMMON = {'camera': ['천천히 흐르기', '밀고 들어가기', '빠지며 공개', '시선 옮기기'], 'enter': ['fade', 'up', 'pop'], 'emph': []}
STRONG_ENTER = {'zoom'}                  # 내려앉기 — 세기 3 장면에서만 (자주 쓰면 쿵쿵)
LEVEL3_MAX = 0.4                         # 세기 3 장면 비율 출발점 (훅 · 킥 · 마무리 정도)
MOVE_Z, MOVE_T = 1.15, 0.12              # «카메라가 움직였다» = 배율 1.15배 넘게 바뀌거나 화면 폭의 12% 넘게 옮겨 감

_OPT = {'left': {'dir': 'left'}, 'right': {'dir': 'right'}, 'up': {'dir': 'up'}, 'down': {'dir': 'down'},
        'white': {'col': (255, 255, 255)}, 'black': {'col': (0, 0, 0)}}


def _parse(spec):
    m = re.match(r'(\w+)(?:\((\w+)\))?', spec); name, o = m.group(1), m.group(2)
    return name, DUR.get(name, 0.45), dict(_OPT.get(o, {}))


def _fx_edit(name):
    from . import fx
    pal = {'bg': (0, 0, 0), 'white': (255, 255, 255), 'accent': (255, 207, 74), 'txt': (20, 20, 20), 'dim': (120, 120, 120)}

    def run(a, b, u, **o):
        box = (0, 0, a.width, a.height)
        if name == 'whip': return fx.whip_box(a.copy(), u, box, a, b, pal, t0=0, t1=1)
        if name == 'glitch': return fx.glitch_box(a.copy(), u, box, a, b, pal, t0=0, t1=1, swap=0.5)
        if name == 'zoom_through': return fx.zoom_through(a.copy(), u, box, a, b, pal, t0=0, t1=1, **o)
        raise KeyError(name)
    return run


class Kit:
    def __init__(self, name, d):
        self.name = name; self.pool = d['cuts']; self.spec = d.get('finish', {})
        self.__dict__.update({k: v for k, v in d.items() if k not in ('cuts', 'finish')})

    def cuts(self, levels):
        """장면 경계(1번째 경계 = 장면 1→2)마다 세기 → {j: (이름, 길이, 옵션)}"""
        out, last = {}, None
        for j, lv in enumerate(levels, start=1):
            pool = self.pool.get(lv) or self.pool[1]
            pick = [p for p in pool if _parse(p)[0] != last] or pool
            name, dur, opt = _parse(pick[(j * 7 + lv) % len(pick)]); out[j] = (name, dur, opt); last = name
        return out

    def edit(self, name, a, b, u, **opt):
        f = camera.EDITS.get(name) or _fx_edit(name)
        return f(a, b, u, **opt)

    def finish(self, img, t=0.0, spec=None):
        return _finish.apply(img, self.spec if spec is None else spec, t)

    def allowed(self):
        c = {_parse(p)[0] for lv in self.pool.values() for p in lv}
        return c | set(self.camera) | set(self.enter) | set(self.emph) | {x for v in COMMON.values() for x in v}


def load(name):
    if name not in KITS: raise KeyError(f'모르는 키트: {name} — {", ".join(KITS)}')
    return Kit(name, KITS[name])


def _best_kit(items):
    """빌린 것들을 가장 많이 품는 다른 키트 (돌아볼 때 참고)"""
    if not items: return None
    sc = {n: len(set(items) & load(n).allowed()) for n in KITS}
    n = max(sc, key=sc.get); return (n, sc[n]) if sc[n] else None


def check(M, step=0.5, still_s=2.5):
    """점검 보고 — 바닥만 짚는다. 빌림은 벌점이 아니라 이유와 함께 보이게.
    문제로 세는 것: 이유 없는 키트 밖 · 세기 3 연달아 / 너무 잦음 · 같은 편집 연달아 · 한 장면 강조 둘 이상 ·
    같은 등장 반복 · 내려앉기가 세기 3 밖 · 킥 둘 이상 · 멈춘 구간 · 카메라가 거의 안 움직이는 장면이 절반 넘음
    → (표 문자열, 문제 수)"""
    K = load(M.KIT); rows, issues, notes = [], 0, []
    allowed = K.allowed(); plan = getattr(M, 'PLAN', []); edit = getattr(M, 'EDIT', {})
    still, cams = _scan(M, step, still_s)
    moves = _moves(M, cams)
    prev_cut, prev_lv, kicks, borrowed_all, enter_cnt = None, 0, 0, [], {}
    for i, p in enumerate(plan):
        used = list(p.get('camera', [])) + list(p.get('enter', [])) + list(p.get('emph', []))
        cut = edit.get(i + 1, ('', 0, {}))[0] if (i + 1) in edit else ''
        out = [u for u in dict.fromkeys(used + ([cut] if cut else [])) if u not in allowed and not (u in STRONG_ENTER and p.get('level', 1) == 3)]   # 내려앉기는 세기 3 장면이면 어느 키트든 된다
        note, borrow = [], ''
        if out and p.get('borrow'): borrow = ', '.join(out); borrowed_all += out
        elif out: note.append('키트 밖(이유 없음): ' + ', '.join(out)); issues += len(out)
        lv = p.get('level', 1)
        if lv == 3 and prev_lv == 3: note.append('세기 3 연달아'); issues += 1
        if cut and cut == prev_cut: note.append(f'같은 편집 연달아({cut})'); issues += 1
        if len(p.get('emph', [])) > 1: note.append('강조 ' + str(len(p['emph'])) + '개 — 한 장면에 하나'); issues += 1
        if lv < 3 and STRONG_ENTER & set(p.get('enter', [])): note.append('내려앉기는 세기 3 장면만'); issues += 1
        for e in set(p.get('enter', [])) - set(getattr(M, 'SIGNATURE', [])): enter_cnt[e] = enter_cnt.get(e, 0) + 1   # 스타일 서명(SIGNATURE)은 반복으로 안 센다
        mv = moves.get(i)
        if mv is not None and not mv[0]: note.append(f'카메라 거의 그대로(배율 {mv[1]:.2f}배 · 이동 {mv[2] * 100:.0f}%)')
        if p.get('kick'): kicks += 1
        mtxt = '' if mv is None else (f'{mv[1]:.2f}배 · {mv[2] * 100:.0f}%')
        rows.append(f"| {i + 1} | {lv} | {', '.join(p.get('camera', []))} | {mtxt} | {', '.join(p.get('enter', []))} | {', '.join(p.get('emph', []))} | {cut} | {p.get('kick') or ''} | {borrow} | {' · '.join(note)} |")
        prev_cut, prev_lv = cut or prev_cut, lv
    n = len(plan)
    l3 = sum(1 for p in plan if p.get('level', 1) == 3)
    if n and l3 > max(2, round(n * LEVEL3_MAX)): issues += 1; notes.append(f'⚠ 세기 3이 {n}장면 중 {l3} — 봉우리는 훅 · 킥 · 마무리 정도')
    rep = [f'{e} {c}/{n}' for e, c in enter_cnt.items() if n >= 4 and c > n / 2 and e not in ('fade',)]
    if rep: issues += 1; notes.append('⚠ 같은 등장이 절반 넘는 장면에: ' + ', '.join(rep) + ' — 키트 안에서도 장면마다 바꾼다')
    if M.KIT == '손그림' and not any({'draw_on', 'write', 'draw'} & set(p.get('enter', [])) for p in plan):
        notes.append('손그림 키트인데 그려지며(draw_on) · 글씨 쓰기(write)가 한 장면도 없다 — 의도면 그대로 (문제로 세지 않음)')
    still_cam = [i + 1 for i, m in moves.items() if not m[0]]
    if moves and len(still_cam) > len(moves) / 2: issues += 1; notes.append(f'⚠ 카메라가 거의 안 움직이는 장면 {len(still_cam)}/{len(moves)} — 장면마다 화면이 바뀔 만큼 움직이는 카메라를 하나 이상')
    if kicks > 1: issues += 1
    issues += len(still)
    b_sc = sum(1 for p in plan if p.get('borrow'))
    btxt = f'- 빌림: {b_sc}/{n}장면 (벌점 아님 — 이유를 보고 맞는지만 본다)'
    if n and b_sc > n / 2:
        bk = _best_kit([x for x in borrowed_all if x not in K.allowed() and x not in getattr(M, 'SIGNATURE', [])])
        btxt += ' · 빌림이 많다 → 키트가 내용과 맞는지 한 번 돌아보기' + (f' (빌린 것을 가장 많이 품은 키트: {bk[0]})' if bk and bk[0] != M.KIT else '')
    head = [f'## 점검 보고 — 키트 «{K.label}» ({K.grade}) · 키트는 바닥이지 제한이 아니다', '',
            '이 키트의 이름(기본 움직임 포함): ' + ' · '.join(sorted(allowed)), '',
            '| 장면 | 세기 | 카메라 | 카메라 실제(배율 · 이동) | 등장 | 강조 | 다음 편집 | 킥 | 빌림(이유는 PLAN) | 짚을 것 |',
            '|---|---|---|---|---|---|---|---|---|---|']
    tail = ['', f'- 킥 장치: {kicks}개' + (' ⚠ 한 편에 하나가 출발점' if kicks > 1 else (' — 없어도 되지만 의도인지 확인 (가장 기억에 남을 한 순간)' if kicks == 0 else '')),
            btxt] + [f'- {x}' for x in notes] + [
            '- 멈춘 구간(' + str(still_s) + '초 넘게 화면 변화 없음): ' + (', '.join(f'{a:.1f}~{b:.1f}초' for a, b in still) if still else '없음'),
            f'- 문제 {issues}곳']
    return '\n'.join(head + rows + tail), issues


def _scan(M, step, still_s):
    """프레임을 step 간격으로 그려 보며 멈춘 구간을 찾고, 그 순간의 카메라를 모은다"""
    from PIL import Image
    ts = np.arange(0, M.DUR, step); prev = None; run0 = None; spans = []; cams = []
    for t in ts:
        camera.TRACE = []
        try: fr = M.frame(float(t))
        finally: tr, camera.TRACE = camera.TRACE, None
        if tr: cams.append((float(t),) + tr[-1])
        a = np.asarray(fr.convert('L').resize((96, int(96 * M.H / M.W)), Image.BILINEAR), dtype=np.float32)
        if prev is not None:
            if np.abs(a - prev).mean() < 0.4:
                run0 = run0 if run0 is not None else t - step
            else:
                if run0 is not None and t - step - run0 >= still_s: spans.append((run0, t - step))
                run0 = None
        prev = a
    if run0 is not None and ts[-1] - run0 >= still_s: spans.append((run0, ts[-1]))
    return spans, cams


def _moves(M, cams):
    """장면(PLAN 순서 = SCENES 순서)마다 카메라가 실제로 얼마나 움직였나 → {i: (움직임, 배율 비, 이동 비율)}"""
    scenes = getattr(M, 'SCENES', None)
    if not scenes or not cams or len(scenes) != len(getattr(M, 'PLAN', [])): return {}   # 장면 수가 다르면 재지 않는다
    out = {}
    for i, (a, b) in enumerate(scenes):
        cs = [(c, size, o) for t, c, size, o in cams if a <= t < b]
        if len(cs) < 2: continue
        rel = [c.z / min(o[0] / size[0], o[1] / size[1]) for c, size, o in cs]
        zr = max(rel) / max(1e-6, min(rel))
        pts = [(c.cx * c.z / o[0], c.cy * c.z / o[0]) for c, size, o in cs]
        tr = max(((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5 for x0, y0 in pts for x1, y1 in pts)
        out[i] = (zr >= MOVE_Z or tr >= MOVE_T, zr, tr)
    return out


if __name__ == '__main__':      # python3 kit.py 팝  → 그 키트에서 쓰는 코드 이름
    import sys
    for n in (sys.argv[1:] or list(KITS)):
        K = load(n); print(f'## {n} — {K.label} ({K.grade})')
        for lv, p in K.pool.items(): print(f'  전환 세기 {lv}: {", ".join(p)}')
        print(f'  카메라: {", ".join(K.camera)}\n  등장: {", ".join(K.enter)}\n  강조: {", ".join(K.emph)}')
        print(f'  속도 곡선: {K.ease} · 화면 겹: {K.spec} · 배경음: {K.music} · 소리: {K.sfx}\n  킥 후보: {", ".join(K.kicks)}')
