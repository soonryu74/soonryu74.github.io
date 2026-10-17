"""배경음 작곡기 — 장르 13가지 · 영상마다 새 곡 · sf2 실제 악기 (reference/sound.md §3).

  song(dur, style, sections=None, seed=0, bpm=None, key=None, hits=()) → mono float32 44.1k
     sections = [(시작초, 끝초, 세기 0~3), …]  세기: 0 잔잔(패드 · 반주만) · 1 반주 · 2 선율 · 3 전부(타악기 · 대선율)
                -1 = 비우기(쉼 — 패드만 아주 작게)
     hits     = [초, …] 정확한 순간 강조(심벌 · 낮은 음 한 방) — 제목 쾅 · 결과 공개
  info['score'] = 작곡된 악보 — 음표(시각 · 길이 · 건반 · 세기 · 역할) · 마디(시각 · 세기 · 화음 · 필인 · 심벌) · 악기 이름 · 조 · 빠르기
     export(info, 경로) → json (굽기 때는 bake 가 out/소리지도.json 에 효과음 · 대사와 함께 자동으로 남긴다)
같은 장르도 seed 마다 조성 · 진행 · 리듬 · 악기 · 선율이 달라진다 → 영상끼리 같은 곡이 되지 않는다.
장면이 바뀌는 곳은 가까운 박으로 맞추고, 바뀌기 직전 마디에 필인 · 바뀐 첫 박에 심벌.
"""
import functools
import os
import random

import numpy as np

from . import paths
from .sfxbase import sf2_path, NoSF2

SR = 44100


def _sf2():
    try: return sf2_path()
    except NoSF2: raise SystemExit('⛔ ' + paths.SF2_GUIDE)

# ── 음악 이론 ────────────────────────────────────
MODES = {'major': [0, 2, 4, 5, 7, 9, 11], 'minor': [0, 2, 3, 5, 7, 8, 10], 'dorian': [0, 2, 3, 5, 7, 9, 10],
         'mixolydian': [0, 2, 4, 5, 7, 9, 10], 'phrygian': [0, 1, 3, 5, 7, 8, 10], 'harmonic': [0, 2, 3, 5, 7, 8, 11]}
# 진행 = 음계 도수(0 = 으뜸) · 마디마다 하나 (둘이면 반 마디씩)
PROGS = {
    'pop': [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4], [3, 0, 4, 5], [0, 2, 3, 4], [0, 3, 5, 4], [3, 4, 2, 5]],
    'minor': [[0, 5, 2, 6], [0, 3, 6, 2], [0, 6, 5, 6], [0, 5, 3, 4], [5, 6, 0, 0], [0, 3, 4, 0]],
    'jazz': [[1, 4, 0, 0], [0, 5, 1, 4], [2, 5, 1, 4], [0, 3, 2, 5]],
    'modal': [[0, 3, 0, 3], [0, 6, 3, 0], [0, 0, 6, 6], [0, 3, 6, 3]],
    'tale': [[0, 3, 4, 0], [0, 5, 3, 4], [0, 4, 5, 3], [0, 0, 3, 4]],
    'epic': [[0, 5, 2, 6], [5, 3, 0, 4], [0, 6, 5, 4], [0, 2, 5, 6]],
    'tense': [[0, 0, 1, 0], [0, 5, 0, 6], [0, 1, 0, 5], [0, 0, 5, 4]],
}


def chord_notes(root_pc, mode, deg, kind='triad'):
    sc = MODES[mode]; idx = [deg, deg + 2, deg + 4] + ([deg + 6] if kind in ('7', '9') else []) + ([deg + 8] if kind == '9' else [])
    if kind == 'sus2': idx = [deg, deg + 1, deg + 4]
    if kind == 'add9': idx = [deg, deg + 2, deg + 4, deg + 8]
    return [root_pc + sc[i % 7] + 12 * (i // 7) for i in idx]


def scale_note(root_pc, mode, step):
    sc = MODES[mode]; return root_pc + sc[step % 7] + 12 * (step // 7)


# ── 장르 ─────────────────────────────────────────
# roles: 이름 → dict(prog=[(bank, 번호)…] 중 하나, pat=패턴, db=역할 크기, e=들어오는 세기, oct=옥타브)
STYLES = {
    '경쾌 팝': dict(bpm=(112, 124), modes=['major'], progs='pop', kit=[0, 8], drums='pop', ch='triad', swing=0, rev=0.18, pump=0.35,
                 roles=dict(bass=dict(prog=[(0, 33), (0, 34), (0, 38)], pat=['root8', 'octave8'], db=-14, e=1),
                            comp=dict(prog=[(0, 0), (0, 25), (0, 4)], pat=['stab', 'offbeat', 'strum'], db=-18, e=0),
                            lead=dict(prog=[(0, 9), (0, 12), (0, 13), (0, 11)], pat=['melody8'], db=-15, e=2, oct=6),
                            pad=dict(prog=[(0, 89), (0, 48), (0, 88)], pat=['pad'], db=-24, e=0),
                            extra=dict(prog=[(0, 9)], pat=['sparkle'], db=-22, e=3, oct=6))),
    '밝은 설명': dict(bpm=(100, 112), modes=['major'], progs='pop', kit=[24, 0], drums='light', ch='add9', swing=0, rev=0.22, pump=0.2,
                  roles=dict(bass=dict(prog=[(0, 38), (0, 33)], pat=['whole_pulse', 'root8'], db=-16, e=1),
                             comp=dict(prog=[(0, 12), (0, 108), (0, 98), (0, 46)], pat=['arp8', 'arp16'], db=-18, e=0, oct=5),
                             lead=dict(prog=[(0, 11), (0, 9), (0, 73)], pat=['melody4'], db=-17, e=2, oct=6),
                             pad=dict(prog=[(0, 88), (0, 94), (0, 89)], pat=['pad'], db=-22, e=0))),
    '일렉 · 테크': dict(bpm=(122, 128), modes=['minor', 'dorian'], progs='minor', kit=[25, 24], drums='four', ch='triad', swing=0, rev=0.2, pump=0.6,
                    roles=dict(bass=dict(prog=[(0, 38), (0, 39), (8, 38)], pat=['pump'], db=-13, e=1),
                               comp=dict(prog=[(0, 81), (0, 90), (0, 62)], pat=['stab', 'offbeat'], db=-19, e=1),
                               lead=dict(prog=[(0, 80), (1, 80), (0, 81), (0, 98)], pat=['arp16', 'melody8'], db=-19, e=2, oct=6),
                               pad=dict(prog=[(0, 90), (0, 95), (0, 50)], pat=['pad'], db=-22, e=0))),
    '시네마틱': dict(bpm=(84, 100), modes=['minor', 'major', 'harmonic'], progs='epic', kit=[48], drums='epic', ch='triad', swing=0, rev=0.35, pump=0,
                 roles=dict(bass=dict(prog=[(0, 48), (0, 42), (0, 43)], pat=['ostinato8'], db=-15, e=1, oct=3),
                            comp=dict(prog=[(0, 48), (0, 49), (8, 48)], pat=['pad'], db=-17, e=0),
                            lead=dict(prog=[(0, 60), (0, 61), (0, 73), (0, 40)], pat=['melody_long'], db=-15, e=2, oct=5),
                            pad=dict(prog=[(0, 52), (0, 91)], pat=['pad'], db=-23, e=1),
                            extra=dict(prog=[(0, 61), (1, 61)], pat=['brass_hits'], db=-16, e=3))),
    '동화': dict(bpm=(100, 112), beats=3, modes=['major'], progs='tale', kit=[48], drums='none', ch='triad', swing=0, rev=0.3, pump=0,
               roles=dict(bass=dict(prog=[(0, 45), (0, 32)], pat=['waltz_bass'], db=-15, e=0, oct=3),
                          comp=dict(prog=[(0, 46), (0, 10), (0, 8)], pat=['waltz', 'arp8'], db=-17, e=0),
                          lead=dict(prog=[(0, 73), (0, 71), (0, 8), (0, 79)], pat=['melody4'], db=-15, e=1, oct=6),
                          pad=dict(prog=[(0, 49), (0, 48)], pat=['pad'], db=-24, e=1),
                          extra=dict(prog=[(0, 9), (0, 10)], pat=['sparkle'], db=-21, e=2, oct=6))),
    '로파이': dict(bpm=(72, 86), modes=['dorian', 'major'], progs='jazz', kit=[0, 40], drums='lofi', ch='7', swing=0.62, rev=0.2, pump=0.25, lofi=True,
                roles=dict(bass=dict(prog=[(0, 33), (0, 32), (0, 35)], pat=['lofi_bass'], db=-14, e=1),
                           comp=dict(prog=[(0, 4), (8, 4), (0, 0)], pat=['lofi_comp'], db=-16, e=0),
                           lead=dict(prog=[(0, 11), (0, 12), (0, 26)], pat=['melody_sparse'], db=-18, e=2, oct=5),
                           pad=dict(prog=[(0, 89)], pat=['pad'], db=-28, e=0))),
    '어쿠스틱': dict(bpm=(96, 112), modes=['major'], progs='pop', kit=[40, 8], drums='folk', ch='triad', swing=0, rev=0.2, pump=0,
                 roles=dict(bass=dict(prog=[(0, 32)], pat=['r5'], db=-15, e=1),
                            comp=dict(prog=[(0, 25), (8, 25), (0, 24)], pat=['strum'], db=-15, e=0),
                            lead=dict(prog=[(0, 78), (0, 73), (0, 22), (0, 105)], pat=['melody8'], db=-17, e=2, oct=6),
                            extra=dict(prog=[(0, 9)], pat=['sparkle'], db=-23, e=3, oct=6))),
    '재즈 라운지': dict(bpm=(118, 140), modes=['major'], progs='jazz', kit=[32, 40], drums='swing', ch='7', swing=0.66, rev=0.22, pump=0,
                   roles=dict(bass=dict(prog=[(0, 32)], pat=['walk'], db=-13, e=0),
                              comp=dict(prog=[(0, 0), (0, 4)], pat=['jazz_comp'], db=-17, e=0),
                              lead=dict(prog=[(0, 11), (0, 65), (0, 59), (0, 26)], pat=['melody8'], db=-16, e=2, oct=5))),
    '펑키': dict(bpm=(100, 112), modes=['dorian', 'mixolydian'], progs='modal', kit=[0, 16], drums='funk', ch='7', swing=0.0, rev=0.15, pump=0.2,
               roles=dict(bass=dict(prog=[(0, 36), (0, 37), (0, 33)], pat=['funk_bass'], db=-12, e=1),
                          comp=dict(prog=[(0, 28), (0, 27)], pat=['scratch16'], db=-18, e=1),
                          lead=dict(prog=[(0, 61), (0, 16), (0, 65)], pat=['brass_hits', 'melody8'], db=-17, e=2, oct=5),
                          pad=dict(prog=[(0, 16), (0, 17)], pat=['pad'], db=-25, e=0))),
    '레트로 게임': dict(bpm=(140, 160), modes=['major', 'minor'], progs='pop', kit=[24, 25], drums='chip', ch='triad', swing=0, rev=0.08, pump=0,
                   roles=dict(bass=dict(prog=[(1, 80), (0, 80)], pat=['octave8'], db=-17, e=0, oct=3),
                              comp=dict(prog=[(1, 81), (0, 81)], pat=['arp16'], db=-23, e=1, oct=5),
                              lead=dict(prog=[(0, 80), (1, 80)], pat=['melody8'], db=-17, e=1, oct=6))),
    '긴장 · 미스터리': dict(bpm=(92, 108), modes=['minor', 'phrygian', 'harmonic'], progs='tense', kit=[48, 16], drums='tense', ch='triad', swing=0, rev=0.3, pump=0,
                      roles=dict(bass=dict(prog=[(0, 38), (0, 43), (0, 48)], pat=['ostinato16'], db=-15, e=0, oct=2),
                                 comp=dict(prog=[(0, 44), (1, 44)], pat=['pad'], db=-18, e=0),
                                 lead=dict(prog=[(0, 8), (0, 14), (0, 11)], pat=['melody_sparse'], db=-19, e=2, oct=5),
                                 pad=dict(prog=[(0, 95), (0, 92), (0, 99)], pat=['pad'], db=-21, e=0),
                                 extra=dict(prog=[(0, 61), (0, 57)], pat=['brass_hits'], db=-17, e=3, oct=3))),
    '감성 피아노': dict(bpm=(70, 84), modes=['major'], progs='pop', kit=[8], drums='soft', ch='add9', swing=0, rev=0.32, pump=0,
                   roles=dict(bass=dict(prog=[(0, 42), (0, 32)], pat=['whole'], db=-17, e=1, oct=3),
                              comp=dict(prog=[(0, 0)], pat=['arp8'], db=-14, e=0, oct=4),
                              lead=dict(prog=[(0, 0), (0, 42), (0, 40)], pat=['melody_long'], db=-15, e=2, oct=5),
                              pad=dict(prog=[(0, 49), (0, 48)], pat=['pad'], db=-21, e=1))),
    '축하 · 행사': dict(bpm=(118, 130), modes=['major'], progs='pop', kit=[16, 48], drums='march', ch='triad', swing=0, rev=0.22, pump=0,
                   roles=dict(bass=dict(prog=[(0, 58), (0, 57)], pat=['r5'], db=-15, e=1, oct=3),
                              comp=dict(prog=[(0, 0), (0, 61)], pat=['block4'], db=-18, e=0),
                              lead=dict(prog=[(0, 56), (0, 61), (0, 60)], pat=['melody8'], db=-14, e=1, oct=5),
                              extra=dict(prog=[(0, 9)], pat=['sparkle'], db=-20, e=2, oct=6))),
}

def find_style(name):
    """장르 이름 — 앞 글자 · 일부만 써도 (일렉 → 일렉 · 테크) · 없으면 SystemExit"""
    if name in STYLES: return name
    hit = [k for k in STYLES if name and name.replace(' ', '') in k.replace(' ', '')]
    if len(hit) == 1: return hit[0]
    raise SystemExit(f'⛔ 장르 «{name}» ' + ('가 여럿과 겹쳐요: ' + ' · '.join(hit) if hit else '없음') + f' — {" · ".join(STYLES)}')


# 드럼 — 16칸(4박) 격자 · x 셈 · o 보통 · - 작게 · 세기 문턱 (e 이상일 때만)
DR = dict(K=36, S=38, C=39, H=42, O=46, R=51, CR=49, SH=70, TB=54, TL=45, TM=47, TH=50, RIM=37, TAI=116, BD2=35, CL=75, TRI=81)
DRUMS = {
    'pop': [('K', 'x...x...x...x.o.', 1), ('S', '....x.......x...', 1), ('H', 'o-o-o-o-o-o-o-o-', 1), ('C', '....x.......x...', 3), ('SH', '-o-o-o-o-o-o-o-o', 2)],
    'light': [('K', 'x.......x.......', 1), ('RIM', '....o.......o...', 1), ('SH', 'o-o-o-o-o-o-o-o-', 1), ('C', '....o.......o...', 2), ('H', '..o...o...o...o.', 3)],
    'four': [('K', 'x...x...x...x...', 1), ('C', '....x.......x...', 2), ('O', '..o...o...o...o.', 1), ('H', 'o-o-o-o-o-o-o-o-', 2), ('SH', '----------------', 3)],
    'epic': [('TAI', 'x.....o.x.......', 2), ('BD2', 'x.......x.......', 1), ('TL', '......o.....o.o.', 3), ('S', '....x.......x...', 3)],
    'none': [('TRI', 'o...............', 2)],
    'lofi': [('K', 'x......ox.......', 1), ('S', '....o.......o...', 1), ('H', 'o.o.o.o.o.o.o.o.', 1), ('SH', '..-...-...-...-.', 2)],
    'folk': [('K', 'x.......x.......', 1), ('S', '....o.......o...', 2), ('SH', 'o-o-o-o-o-o-o-o-', 1), ('TB', '....o.......o...', 3)],
    'swing': [('R', 'o..oo..oo..oo..o', 0), ('H', '....o.......o...', 0), ('K', '-...........-...', 1), ('S', '..........-.....', 2)],
    'funk': [('K', 'x.....o...x..o..', 1), ('S', '....x..-.-..x...', 1), ('H', 'ooxooxooooxoooxo', 1), ('O', '..............o.', 2), ('TB', '....o.......o...', 3)],
    'chip': [('K', 'x.......x.o.....', 1), ('S', '....x.......x...', 1), ('H', 'o.o.o.o.o.o.o.o.', 2)],
    'tense': [('TAI', 'x.......x.....o.', 1), ('TL', '............o.o.', 2), ('RIM', 'o...o...o...o...', 2), ('S', '....o.......x...', 3)],
    'soft': [('K', 'o.......o.......', 2), ('RIM', '....-.......-...', 2), ('SH', '-.-.-.-.-.-.-.-.', 3)],
    'march': [('BD2', 'x.......x.......', 1), ('S', '....x.o.....x.oo', 1), ('CR', '................', 3), ('TB', 'o.o.o.o.o.o.o.o.', 2)],
}
FILLS = {'default': [('S', '........o.o.xoxx', 1)], 'epic': [('TL', '........o.o.oxox', 2), ('TAI', '............x.x.', 2)],
         'swing': [('S', '..........o..o.x', 1)], 'none': [], 'chip': [('S', '........o.o.o.xx', 1)], 'soft': [], 'tense': [('TL', '..........o.o.ox', 2)]}


# ── 이벤트 ───────────────────────────────────────
class Score:
    def __init__(self, bpm, beats, swing, rng):
        self.bpm, self.beats, self.swing, self.rng = bpm, beats, swing, rng
        self.B = 60 / bpm; self.BAR = beats * self.B; self.ev = {}

    def t(self, bar, beat):
        """마디 · 박(소수) → 초 · 스윙이면 8분 뒷박을 늦춘다"""
        b = beat
        if self.swing:
            whole = np.floor(b); frac = b - whole
            if abs(frac - 0.5) < 1e-6: b = whole + self.swing
            elif abs(frac - 0.25) < 1e-6 or abs(frac - 0.75) < 1e-6: pass
        return bar * self.BAR + b * self.B

    def n(self, role, time, key, vel, dur, hum=True):
        r = self.rng
        if hum: time += r.uniform(-0.008, 0.008); vel += r.randint(-7, 7)
        self.ev.setdefault(role, []).append((max(0, time), int(key), int(max(1, min(127, vel))), max(0.03, dur)))


# ── 패턴 ─────────────────────────────────────────
def P_bass(S, pat, bar, ch, nxt, e, oct_, mode, root_pc, last):
    r = ch[0] % 12 + 12 * oct_; B = S.beats; v = 92 + 8 * (e >= 2)
    if pat == 'root8':
        for i in range(B * 2):
            k = r + (12 if (i % 4 == 3 and e >= 2) else 0); S.n('bass', S.t(bar, i / 2), k, v - 10 * (i % 2), S.B * 0.42)
    elif pat == 'octave8':
        for i in range(B * 2): S.n('bass', S.t(bar, i / 2), r + 12 * (i % 2), v - 6 * (i % 2), S.B * 0.4)
    elif pat == 'pump':
        for i in range(B): S.n('bass', S.t(bar, i + 0.5), r, v, S.B * 0.42)
        if e >= 3:
            for i in range(B): S.n('bass', S.t(bar, i + 0.75), r + 12, v - 20, S.B * 0.2)
    elif pat == 'r5':
        S.n('bass', S.t(bar, 0), r, v, S.B * 0.9)
        if B >= 4: S.n('bass', S.t(bar, 2), r + 7 - (12 if r + 7 > 52 else 0), v - 8, S.B * 0.9)
    elif pat == 'waltz_bass':
        S.n('bass', S.t(bar, 0), r, v, S.B * 0.9)
    elif pat == 'walk':
        tones = [r, (ch[1] % 12) + 12 * oct_, (ch[2] % 12) + 12 * oct_]
        tgt = nxt[0] % 12 + 12 * oct_; appr = tgt + S.rng.choice([-1, 1])
        for i, k in enumerate([tones[0], S.rng.choice(tones[1:]), S.rng.choice(tones), appr][:B]): S.n('bass', S.t(bar, i), k, v - 4 * (i % 2), S.B * 0.85)
    elif pat == 'funk_bass':
        for pos, iv in [(0, 0), (0.75, 12), (1.5, 0), (2.25, 10), (2.5, 7), (3.5, 12)]:
            if pos < B: S.n('bass', S.t(bar, pos), r + iv, v + (8 if pos == 0 else 0), S.B * 0.22)
    elif pat == 'ostinato16':
        for i in range(B * 4): S.n('bass', S.t(bar, i / 4), r + (12 if i % 8 == 6 else 0), v - 15 * (i % 2) - 10 * (e == 0), S.B * 0.2)
    elif pat == 'ostinato8':
        seq = [0, 12, 7, 12] if e >= 2 else [0, 7]
        for i in range(B * 2): S.n('bass', S.t(bar, i / 2), r + seq[i % len(seq)], v - 10, S.B * 0.45)
    elif pat == 'lofi_bass':
        S.n('bass', S.t(bar, 0), r, v, S.B * 1.4); S.n('bass', S.t(bar, 1.75), r + 7, v - 12, S.B * 0.5)
        S.n('bass', S.t(bar, 2.5), r, v - 6, S.B * 1.0)
    elif pat == 'whole_pulse':
        S.n('bass', S.t(bar, 0), r, v, S.BAR * 0.45); S.n('bass', S.t(bar, B / 2), r, v - 8, S.BAR * 0.45)
    else:  # whole
        S.n('bass', S.t(bar, 0), r, v - 5, S.BAR * 0.97)


def voicing(ch, oct_):
    base = 12 * oct_; vs = sorted(((k % 12) + base) for k in ch)
    return vs


def P_comp(S, pat, bar, ch, e, oct_):
    vs = voicing(ch, oct_); B = S.beats; v = 70 + 8 * (e >= 2)
    if pat == 'pad':
        for k in vs: S.n('comp', S.t(bar, 0), k, v - 8, S.BAR * 0.99, hum=False)
    elif pat == 'stab':
        for pos in [0, 1.5, 3] if B == 4 else [0, 1.5]:
            for k in vs: S.n('comp', S.t(bar, pos), k, v, S.B * 0.35)
    elif pat == 'offbeat':
        for i in range(B):
            for k in vs: S.n('comp', S.t(bar, i + 0.5), k, v - 4, S.B * 0.3)
    elif pat == 'block4':
        for i in range(B):
            for k in vs: S.n('comp', S.t(bar, i), k, v - 6 * (i % 2), S.B * 0.5)
    elif pat in ('arp8', 'arp16'):
        div = 2 if pat == 'arp8' else 4; seq = vs + [vs[0] + 12, vs[1] + 12] + ([vs[2] + 12] if len(vs) > 2 else [])
        up = seq + seq[-2:0:-1]
        for i in range(B * div): S.n('comp', S.t(bar, i / div), up[i % len(up)], v - 6 * (i % 2), S.B / div * 1.6)
    elif pat == 'waltz':
        for pos in (1, 2):
            for k in vs: S.n('comp', S.t(bar, pos), k + 12, v - 10, S.B * 0.5)
    elif pat == 'strum':
        gtr = sorted(set([vs[0] - 12] + vs + [vs[0] + 12, vs[1] + 12]))
        for pos, down, g in [(0, 1, 1), (1, 1, .8), (1.5, 0, .6), (2.5, 0, .7), (3, 1, .85), (3.5, 0, .6)]:
            if pos >= B: continue
            order = gtr if down else gtr[::-1]
            for j, k in enumerate(order): S.n('comp', S.t(bar, pos) + j * 0.011, k, int(v * g), S.B * 0.45)
    elif pat == 'jazz_comp':
        for pos in S.rng.sample([0, 0.5, 1.5, 2, 2.5, 3.5], 2 + (e >= 2)):
            for k in vs[1:]: S.n('comp', S.t(bar, pos), k, v - 6, S.B * 0.6)
    elif pat == 'lofi_comp':
        for k in vs: S.n('comp', S.t(bar, 0) + S.rng.uniform(0, 0.02), k, v - 6, S.BAR * 0.7)
        if e >= 1:
            for k in vs[1:]: S.n('comp', S.t(bar, 2.5), k, v - 16, S.B * 1.2)
    elif pat == 'scratch16':
        for i in range(B * 4):
            acc = i % 4 == 2 or i in (7, 13)
            for k in vs[:2]: S.n('comp', S.t(bar, i / 4), k, v + 10 if acc else v - 30, S.B * (0.18 if acc else 0.07))


class Melody:
    """2마디 동기 → A A' B A'' (8마디 문장) · 센 박은 화음 음에 붙인다"""
    def __init__(self, rng, beats, kind):
        self.rng, self.beats = rng, beats
        cells = {'melody8': [[0, .5, 1, 1.5, 2, 3], [0, 1, 1.5, 2, 2.5, 3], [0, .5, 1.5, 2, 3, 3.5], [0, .75, 1.5, 2, 3]],
                 'melody4': [[0, 1, 2, 3], [0, 1, 1.5, 2], [0, 2, 3], [0, 1.5, 2, 3]],
                 'melody_long': [[0, 2], [0, 1.5, 2], [0, 3], [0, 1, 2]],
                 'melody_sparse': [[0, 1.5], [0.5, 2.5], [0, 2, 2.5], [1, 3]]}[kind]
        if beats == 3: cells = [[x for x in c if x < 3] or [0] for c in cells]
        self.r1 = rng.choice(cells); self.r2 = rng.choice(cells)
        self.c = [rng.choice([-2, -1, 1, 2, 0, 1, -1, 3, -3]) for _ in range(len(self.r1) + len(self.r2))]
        self.start = rng.choice([0, 2, 4])

    def bar_notes(self, bar_in_phrase, ch_degs):
        """→ [(박, 음계 걸음, 길이 박)]"""
        sec = bar_in_phrase // 2; half = bar_in_phrase % 2
        rh = self.r1 if half == 0 else self.r2
        c = self.c[:len(self.r1)] if half == 0 else self.c[len(self.r1):]
        if sec == 2: c = [-x for x in c]; rh = rh if self.rng.random() < 0.5 else self.r2   # B: 거꾸로
        if sec == 3 and half == 1: rh = [0, 1] if self.beats == 4 else [0]                   # 마침 — 길게
        step = self.start + (2 if sec == 1 else 0) + (1 if sec == 2 else 0); out = []
        for i, pos in enumerate(rh):
            step += c[i % len(c)] if i else 0
            if pos in (0, 2) or i == len(rh) - 1:   # 센 박 → 가장 가까운 화음 음
                cands = [d + 7 * k for d in ch_degs for k in range(-2, 3)]; step = min(cands, key=lambda c: abs(c - step))
            step = max(-3, min(10, step))   # 음역 — 한 옥타브 반 안
            nxt = rh[i + 1] if i + 1 < len(rh) else self.beats
            out.append((pos, step, (nxt - pos) * 0.92))
        return out


def P_drums(S, pat, bar, e, fill, first, kind):
    if pat == 'none' and e < 2: return
    rows = DRUMS[pat]
    if fill: rows = [r for r in rows if r[0] not in ('S', 'TL', 'TAI')] + FILLS.get(pat, FILLS['default'])
    steps = S.beats * 4
    for name, grid, emin in rows:
        if e < emin: continue
        for i, ch in enumerate(grid[:steps]):
            if ch == '.': continue
            vel = {'x': 112, 'o': 88, '-': 52}[ch]
            S.n('drums', S.t(bar, i / 4), DR[name], vel, 0.1)
    if first and e >= 2: S.n('drums', S.t(bar, 0), DR['CR'], 100, 0.1)


# ── 렌더 ─────────────────────────────────────────
@functools.lru_cache(maxsize=1)
def _sf():
    import tinysoundfont as tsf
    return tsf


KEY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
DRUM_NAME = {35: '큰북2', 36: '킥', 37: '림', 38: '스네어', 39: '박수', 42: '하이햇', 45: '낮은 탐', 46: '열린 하이햇', 47: '중간 탐', 49: '심벌',
             50: '높은 탐', 51: '라이드', 54: '탬버린', 70: '셰이커', 75: '클라베스', 81: '트라이앵글', 116: '타이코'}


def _preset_name(bank, prog):
    """sf2 악기 이름 (표시용) — 못 읽으면 None"""
    try:
        tsf = _sf(); s = tsf.Synth(samplerate=SR); sid = s.sfload(_sf2())
        return s.sfpreset_name(sid, bank, prog)
    except Exception:
        return None


def export(info, path):
    """악보(작곡된 음표 · 마디 · 장면 세기 · 악기)를 json 으로 — 피아노 롤 · 소리 지도 화면을 «진짜 음»으로 그릴 때"""
    import json
    json.dump(info['score'], open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return path


def render(events, dur, bank=0, prog=0, drums=False, kit=0):
    tsf = _sf(); s = tsf.Synth(samplerate=SR, gain=0); sid = s.sfload(_sf2())
    if drums: s.program_select(9, sid, 128, kit, is_drums=True); ch = 9
    else: s.program_select(0, sid, bank, prog); ch = 0
    ev = sorted([(t, 1, k, v) for t, k, v, d in events] + [(t + d, 0, k, 0) for t, k, v, d in events], key=lambda e: (e[0], e[1]))
    total = int((dur + 3) * SR); out = []; cur = 0
    for t, on, k, v in ev:
        at = min(total, int(t * SR))
        if at > cur: out.append(np.frombuffer(s.generate(at - cur), np.float32)); cur = at
        (s.noteon(ch, k, v) if on else s.noteoff(ch, k))
    if cur < total: out.append(np.frombuffer(s.generate(total - cur), np.float32))
    return np.concatenate(out).reshape(-1, 2).mean(axis=1).astype(np.float64)


def song(dur, style='경쾌 팝', sections=None, seed=0, bpm=None, key=None, hits=(), verbose=False):
    from pedalboard import Pedalboard, Reverb, Compressor, Limiter, HighpassFilter, LowpassFilter, Chorus
    st = STYLES[style]; rng = random.Random(f'{style}-{seed}'); nrng = np.random.default_rng(seed)
    bpm = bpm or rng.randint(*st['bpm']); beats = st.get('beats', 4)
    mode = rng.choice(st['modes']); root_pc = key if key is not None else rng.choice([0, 2, 3, 5, 7, 8, 9, 10]) - (12 if rng.random() < 0.5 else 0)
    prog = rng.choice(PROGS[st['progs'] if not (mode in ('minor', 'harmonic', 'phrygian') and st['progs'] == 'pop') else 'minor'])
    S = Score(bpm, beats, st['swing'], rng)
    roles = {k: dict(v, prog=rng.choice(v['prog']), pat=rng.choice(v['pat'])) for k, v in st['roles'].items()}
    kit = rng.choice(st['kit']); dpat = st['drums']
    nbars = int(np.ceil(dur / S.BAR)) + 1
    secs = sections or [(0, dur * 0.25, 1), (dur * 0.25, dur * 0.75, 3), (dur * 0.75, dur, 1)]
    # 마디마다 세기 · 장면 시작 마디(가까운 마디로) · 필인 자리
    starts = sorted(set(int(round(a / S.BAR)) for a, b, e in secs))
    def e_at(bar):
        tm = bar * S.BAR + 0.01
        for a, b, e in secs:
            if a - S.BAR / 2 <= tm < b - S.BAR / 2: return e
        return secs[-1][2]
    mel = Melody(rng, beats, roles['lead']['pat']) if 'lead' in roles and roles['lead']['pat'].startswith('melody') else None
    end_bar = int(dur / S.BAR); bars = []
    for bar in range(nbars):
        if bar * S.BAR >= dur: break
        e = e_at(bar); deg = prog[bar % len(prog)]; ch = chord_notes(root_pc + 60, mode, deg, st['ch'])
        nxt = chord_notes(root_pc + 60, mode, prog[(bar + 1) % len(prog)], st['ch'])
        last = bar >= end_bar - 1
        if last: ch = chord_notes(root_pc + 60, mode, 0, st['ch'])
        first = bar in starts; fill = (bar + 1) in starts and bar + 1 < end_bar
        bars.append(dict(i=bar, t=round(bar * S.BAR, 3), energy=e, chord=sorted(k % 12 for k in ch), degree=int(0 if last else deg),
                         first=bool(first), fill=bool(fill), last=bool(last)))
        if e < 0:   # 비우기
            P_comp(S, 'pad', bar, ch, 0, 4); continue
        for name, R in roles.items():
            if e < R['e'] and not (name == 'comp'): continue
            o = R.get('oct', {'bass': 2, 'comp': 4, 'pad': 4, 'lead': 5, 'extra': 6}[name])
            if name == 'bass': P_bass(S, R['pat'], bar, ch, nxt, e, o, mode, root_pc, last)
            elif name in ('comp', 'pad'):
                if last: S.n(name, S.t(bar, 0), ch[0] % 12 + 12 * o, 80, S.BAR * 2, hum=False); [S.n(name, S.t(bar, 0), k % 12 + 12 * o + 12, 70, S.BAR * 2, hum=False) for k in ch[1:]]; continue
                tmp = S.ev.get('comp', []); P_comp(S, R['pat'] if name == 'comp' else 'pad', bar, ch, e, o)
                if name == 'pad': S.ev['pad'] = S.ev.get('pad', []) + S.ev['comp'][len(tmp):]; S.ev['comp'] = tmp
            elif name == 'lead':
                if last: S.n('lead', S.t(bar, 0), scale_note(root_pc, mode, 0) + 12 * o, 90, S.BAR * 1.5); continue
                if R['pat'] == 'brass_hits':
                    for pos in ([0] if bar % 2 else [0, 2.5]):
                        for k in ch: S.n('lead', S.t(bar, pos), k % 12 + 12 * o, 100, S.B * 0.4)
                elif mel:
                    degs = [prog[bar % len(prog)] + d for d in (0, 2, 4)]
                    for pos, step, ln in mel.bar_notes(bar % 8, degs):
                        S.n('lead', S.t(bar, pos), scale_note(root_pc, mode, step) + 12 * o, 92 + 6 * (pos == 0), S.B * ln)
                else:
                    tmp = S.ev.get('comp', []); P_comp(S, 'arp16' if R['pat'] == 'arp16' else 'arp8', bar, ch, e, o)
                    S.ev['lead'] = S.ev.get('lead', []) + S.ev['comp'][len(tmp):]; S.ev['comp'] = tmp
            elif name == 'extra':
                if R['pat'] == 'sparkle' and (first or bar % 4 == 0):
                    for j, k in enumerate(sorted(ch)): S.n('extra', S.t(bar, 0) + j * 0.06, k % 12 + 12 * o + 12 * (j > 2), 80, S.B * 2)
                elif R['pat'] == 'brass_hits':
                    for pos in ([0] if bar % 2 else [0, 2.5]):
                        for k in ch: S.n('extra', S.t(bar, pos), k % 12 + 12 * R.get('oct', 4), 105, S.B * 0.5)
        if not last: P_drums(S, dpat, bar, e, fill, first, kit)
    if dpat != 'none' or True:
        S.n('drums', end_bar * S.BAR, DR['CR'], 90, 0.1)
    for h in hits:
        S.n('drums', h, DR['CR'], 120, 0.1, hum=False); S.n('drums', h, DR['BD2'], 120, 0.1, hum=False)
        for k in chord_notes(root_pc + 36, mode, 0): S.n('bass', h, k, 115, 0.8, hum=False)
    # 렌더 · 크기 맞춤
    stems = {}

    def active_rms(x):   # 소리가 나는 동안의 크기 (쉬는 마디는 빼고)
        w = int(0.2 * SR); m = len(x) // w
        if m == 0: return np.sqrt((x ** 2).mean()) + 1e-9
        r = np.sqrt((x[:m * w].reshape(m, w) ** 2).mean(axis=1)); on = r[r > r.max() * 0.05]
        if on.size == 0: return 1.0          # 소리가 하나도 없는 악기 줄 — 빈 평균(NaN)이 믹스 전체를 무음으로 만들던 것
        return float(np.sqrt((on ** 2).mean())) + 1e-9
    DRUM_DB = {'none': -24, 'soft': -24, 'swing': -20, 'lofi': -17, 'light': -18, 'epic': -14, 'tense': -16}
    for name, evs in S.ev.items():
        if name == 'drums': x = render(evs, dur, drums=True, kit=kit); db = st.get('drum_db', DRUM_DB.get(dpat, -15))
        else:
            R = roles.get(name) or roles['comp']; b, p = R['prog']; x = render(evs, dur, b, p); db = R['db']
        stems[name] = x * (10 ** (db / 20) / active_rms(x))
    lv = {k: round(20 * np.log10(np.sqrt((v[:int(dur * SR)] ** 2).mean()) + 1e-9), 1) for k, v in stems.items()}
    n = max(len(x) for x in stems.values()); mix = np.zeros(n); drum = np.zeros(n)
    for name, x in stems.items():
        if name == 'drums': drum[:len(x)] += x
        else: mix[:len(x)] += x
    if st['pump']:
        env = np.ones(n)
        for t, k, v, d in S.ev.get('drums', []):
            if k in (36, 35):
                a = int(t * SR); m = min(n - a, int(0.25 * SR))
                if m > 0: env[a:a + m] = np.minimum(env[a:a + m], 1 - st['pump'] + st['pump'] * np.linspace(0, 1, m) ** 0.7)
        mix *= env
    fxs = [HighpassFilter(40), Reverb(room_size=0.5, wet_level=st['rev'], dry_level=0.9, damping=0.5)]
    mix = Pedalboard(fxs)(mix[None, :].astype(np.float32), SR)[0].astype(np.float64)
    y = mix + drum[:len(mix)]
    if st.get('lofi'):
        t = np.arange(len(y)) / SR; wow = 1 + 0.0025 * np.sin(2 * np.pi * 0.6 * t)
        idx = np.clip(np.cumsum(wow) - 1, 0, len(y) - 1); y = np.interp(idx, np.arange(len(y)), y)
        y = Pedalboard([LowpassFilter(4200), HighpassFilter(70)])(y[None, :].astype(np.float32), SR)[0].astype(np.float64)
        crk = (nrng.random(len(y)) < 0.0004) * nrng.uniform(-1, 1, len(y)) * 0.25; y += crk + nrng.standard_normal(len(y)) * 0.002
    y = Pedalboard([Compressor(threshold_db=-16, ratio=2.5, attack_ms=10, release_ms=150), Limiter(threshold_db=-1.0)])(y[None, :].astype(np.float32), SR)[0]
    y = y[:int((dur + 0.0) * SR)]
    f = int(min(1.5, dur * 0.1) * SR); y[-f:] *= np.cos(np.linspace(0, np.pi / 2, f)) ** 2
    names = {}
    for name in S.ev:
        if name == 'drums': names[name] = dict(bank=128, prog=kit, name=_preset_name(128, kit) or '드럼')
        else:
            R = roles.get(name) or roles['comp']; b, p = R['prog']; names[name] = dict(bank=b, prog=p, name=_preset_name(b, p))
    notes = sorted([dict(t=round(t, 4), dur=round(d, 4), key=int(k), vel=int(v), role=r, drum=DRUM_NAME.get(int(k)) if r == 'drums' else None)
                    for r, evs in S.ev.items() for t, k, v, d in evs if t < dur], key=lambda n: (n['t'], n['role']))
    score = dict(style=style, seed=seed, bpm=bpm, beats=beats, bar_sec=round(S.BAR, 4), beat_sec=round(S.B, 4), mode=mode, key=root_pc % 12,
                 key_name=KEY_NAMES[root_pc % 12], progression=prog, swing=st['swing'], sections=[dict(t0=a, t1=b, energy=e) for a, b, e in secs],
                 hits=list(hits), bars=bars, instruments=names, notes=notes)
    info = dict(score=score, levels=lv, style=style, bpm=bpm, mode=mode, key=root_pc, prog=prog, kit=kit, roles={k: (v['prog'], v['pat']) for k, v in roles.items()})
    if verbose: print(info)
    return (y / (np.abs(y).max() + 1e-9) * 0.9).astype(np.float32), info
