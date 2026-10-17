"""소리 — 효과음 · 배경음 · 나레이션 덕킹 · 마스터 (motion-studio · reference/sound.md).

  효과음  sfx.py (81가지 · 묶음 7개) — 영상마다 묶음 하나: audio.use('동화') 다음
          tick · hit · chime · whoosh 같은 옛 이름도 그 묶음의 소리로 나간다 (장면 코드는 그대로)
          새로 쓸 때: K = sfx.Kit('동화'); K.put(트랙, 'enter', 초, g) · 이름으로: sfx.put_sfx(트랙, 'harp_up', 초, g)
  긴 소리  crowd.py — 함성 · 웅성웅성 · 웃음 · 발소리 · 비 · 바람 · 카페 (길이 마음대로)
  배경음  bgm(sections, dur, style=…)  → music.py 작곡기 (장르 13가지 · 영상마다 새 곡)
          sections = [(시작, 끝, 무드 또는 세기 0~3, {hits: [초], hit: 초}), …]
          무드(옛 이름도 그대로): sting · intro · calm · groove · bouncy · build · drop · main · tense · outro
  mixdown(dur, path, …)   배경음 + 효과음 + 나레이션 → 완성 wav
배경음 · sf2 효과음은 사운드폰트 GeneralUser-GS.sf2 가 필요하다 (스킬 밖 · paths.SF2_GUIDE). 없으면 효과음은 합성 소리로 바뀐다.
배경음만 새로: scenes.py --rebgm [장르] [--seed N] → out/<제목>_새배경음.mp4 (화면은 다시 굽지 않는다)
소리 지도: 굽기 · --audio 때 out/소리지도.json (작곡된 음표 · 효과음 시각 · 대사) — save_map · scripts/soundmap.py 로 미리 보기
"""
import os
import wave

import numpy as np

from . import paths, sfx

SR = 44100


def _T(sec): return int(sec * SR)
def _f(n, base=261.63): return base * 2 ** (n / 12)


def _put(tr, sig, at, g=1.0):
    for i, (oid, nm, g0) in enumerate(_PENDING):   # 옛 whoosh 신호 → 소리 지도에 시각 기록
        if oid == id(sig): sfx.LOG.append((round(float(at), 4), nm, round(float(g0 * g), 3), 'cut')); _PENDING.pop(i); break
    p = _T(at)
    if p < 0: sig = sig[-p:]; p = 0
    m = min(len(sig), len(tr) - p)
    if m > 0: tr[p:p + m] += sig[:m] * g
    return tr


# ── 효과음 묶음 ───────────────────────────────────
SOUND_SET = os.environ.get('MOTION_SFX_SET') or '경쾌 팝'
_KITS = {}


def use(name, seed=0):
    """이 영상의 효과음 묶음 — 경쾌 팝 · 시네마 · 동화 · 테크·앱 · 코믹 · 레트로 게임 · 차분"""
    global SOUND_SET
    if name not in sfx.SETS: raise KeyError(f'효과음 묶음 «{name}» 없음 — {" · ".join(sfx.SETS)}')
    SOUND_SET = name; _KITS[name] = sfx.Kit(name, seed); return _KITS[name]


def kit():
    if SOUND_SET not in _KITS: _KITS[SOUND_SET] = sfx.Kit(SOUND_SET)
    return _KITS[SOUND_SET]


# 옛 이름 → 지금 묶음의 자리 (장면 코드를 고치지 않아도 새 소리로)
def whoosh(rng, dur, g, fc=2200, bw=1500, pw=2):
    """휙 — 신호를 돌려준다 (옛 방식: _put(트랙, whoosh(…), 초))"""
    k = kit(); nm, sd = k.name_for('cut')
    if dur >= 0.65 and '시네마' not in SOUND_SET and 'deep_whoosh' in sfx.LIB and SOUND_SET != '동화': nm = 'deep_whoosh'
    x = sfx.make(nm, sd) * g * 1.3; _PENDING.append((id(x), nm, g)); return x


def hit(x, rng, at, g=0.8): kit().put(x, 'impact', at, g * 0.9)
def tick(x, rng, at, g=0.12): kit().put(x, 'tick', at, min(0.6, g * 2.2))


def chime(x, at, base=1046.5, g=0.25, ratios=None, step=None, dur=None):
    kit().put(x, 'done' if g >= 0.2 else 'emph', at, min(0.7, g * 2.0))


def mallet(freq, dur, decay=9.0):
    """마림바 한 음 (음높이를 직접 정할 때 — 오르는 음 · 뒤죽박죽 음)"""
    n = _T(dur); t = np.arange(n) / SR; out = np.zeros(n)
    for m, a in zip((1, 3.9, 10.4), (1, .30, .10)):
        out += a * np.sin(2 * np.pi * freq * m * t) * np.exp(-decay * m ** 0.35 * t)
    out[:60] *= np.linspace(0, 1, 60)
    return out


def bell(freq, dur, decay=5.5):
    """종 한 음"""
    n = _T(dur); t = np.arange(n) / SR; out = np.zeros(n)
    for m, a in zip((1, 2, 3.01, 4.2), (1, .45, .22, .10)):
        out += a * np.sin(2 * np.pi * freq * m * t) * np.exp(-decay * m ** 0.5 * t)
    out[:40] *= np.linspace(0, 1, 40)
    return out


# ── 배경음 ─────────────────────────────────────────
MOODS = ('sting', 'intro', 'calm', 'groove', 'bouncy', 'build', 'drop', 'main', 'tense', 'outro')
MOOD_E = {'sting': 3, 'intro': 0, 'calm': 1, 'groove': 2, 'bouncy': 2, 'build': 2, 'drop': 3, 'main': 3, 'tense': 2, 'outro': 1, 'hush': -1}
PALETTE_STYLE = {'pop': '경쾌 팝', 'cinema': '시네마틱', 'study': '밝은 설명', 'tale': '동화'}


def bgm(sections, dur, seed=3, bpm=None, palette='pop', transpose=0, drum_gain=None, style=None):
    """배경음 — music.song 으로 작곡. style(장르)이 없으면 palette 로 고른다. 장르 목록 = music.STYLES
    --rebgm 으로 부르면 MOTION_BGM_STYLE · MOTION_BGM_SEED 가 덮어쓴다"""
    from . import music
    style = os.environ.get('MOTION_BGM_STYLE') or style or PALETTE_STYLE.get(palette or 'pop', palette or '경쾌 팝')   # 키트 K.music(장르 이름)을 palette 로 넘겨도 된다
    try: style = music.find_style(style)
    except SystemExit as ex: print('⚠️', ex, '→ 경쾌 팝'); style = '경쾌 팝'
    if os.environ.get('MOTION_BGM_SEED'): seed = int(os.environ['MOTION_BGM_SEED'])
    lo, hi = music.STYLES[style]['bpm']
    if bpm and not (lo * 0.85 <= bpm <= hi * 1.15) or os.environ.get('MOTION_BGM_STYLE'): bpm = None   # 장르에 안 맞는 빠르기는 장르에 맡긴다
    secs, hits = [], []
    for sec in sections:
        t0, t1, m = sec[0], sec[1], sec[2]; o = sec[3] if len(sec) > 3 else {}
        if isinstance(m, str):
            if m not in MOOD_E: print(f'⚠️ 배경음 무드 «{m}» 는 없다 → groove ({t0:.1f}~{t1:.1f}초) · 쓸 수 있는 것: {" · ".join(MOODS)}'); m = 'groove'
            if m == 'sting': hits.append(t0)
            e = MOOD_E[m]
        else: e = int(m)
        hits += list(o.get('hits', [])) + ([o['hit']] if o.get('hit') else [])
        secs.append((t0, t1, e))
    y, info = music.song(dur, style, secs, seed=seed, bpm=bpm, hits=hits)
    global LAST_SCORE; LAST_SCORE = info['score']
    print(f"🎵 배경음: {info['style']} · {info['bpm']} bpm · seed {seed}")
    return y


# ── 소리 지도 (작곡된 음표 · 놓은 효과음 · 대사 — 화면에 «진짜 소리»를 그릴 때) ──
LAST_SCORE = None
_VOICES = []
_PENDING = []   # whoosh 처럼 신호만 돌려주는 옛 이름 — 시각은 _put 이 채운다


def save_map(path, dur=None):
    """out/소리지도.json — bgm(악보) · sfx(시각 · 이름 · 자리 · 갈래 · 설명) · voices(시각 · 파일 · 길이). bake 가 굽기 때 자동으로 부른다"""
    import json
    fx = []
    for t, nm, g, role in sorted(sfx.LOG, key=lambda x: x[0]):
        fx.append(dict(t=t, name=nm, role=role, gain=g, group=sfx.LIB.get(nm, ('',))[0], desc=sfx.LIB.get(nm, ('', ''))[1]))
    m = dict(version=1, dur=dur, bgm=LAST_SCORE, sfx=fx, voices=_VOICES)
    json.dump(m, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return path


# ── 믹스 ─────────────────────────────────────────
def read_wav(p):
    """wav → mono float (-1~1) · 다른 형식/샘플레이트는 ffmpeg 로 맞춰 읽는다"""
    try:
        with wave.open(p) as w:
            if w.getframerate() == SR and w.getsampwidth() == 2:
                s = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768
                return s.reshape(-1, w.getnchannels()).mean(axis=1)
    except wave.Error:
        pass
    import subprocess
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(np.float64) / 32768


def write_wav(path, x):
    with wave.open(path, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


def mixdown(dur, path, bgm_track=None, sfx=None, voices=(), bgm_gain=0.33, sfx_gain=0.7, voice_gain=0.8,
            duck=0.5, ramp=0.25, peak=0.85, soft=1.1, fade_in=0.2, fade_out=0.4, bgm_fade=2.5):
    """완성 소리 wav.
    bgm_track  bgm() 결과 (없으면 배경음 없이)
    sfx        효과음 트랙 — new_track(dur) 에 whoosh/hit/chime… 을 쌓은 것
    voices     [(시작초, wav 경로), …] — 나오는 동안 배경음 × duck (앞뒤 ramp 초 부드럽게)
    bgm_fade   배경음은 영상 끝 이만큼 앞에서부터 서서히 줄어 영상 끝에서 0 (뚝 끊기지 않게 · 0 = 끄기)
    fade_out   전체 소리도 영상 끝(dur)에서 0 이 되게 (트랙 꼬리 0.5초가 아니라 영상 끝 기준)
    """
    n = _T(dur + 0.5)
    xb = np.zeros(n) if bgm_track is None else np.pad(np.asarray(bgm_track, np.float64), (0, max(0, n - len(bgm_track))))[:n] * bgm_gain
    end = min(n, _T(dur))
    if bgm_fade and bgm_track is not None:   # 배경음 끝 — 서서히 (sin² 곡선 · 영상 끝에서 0)
        f = min(end, _T(bgm_fade)); u = np.linspace(0, 1, f)
        xb[end - f:end] *= np.cos(u * np.pi / 2) ** 2; xb[end:] = 0
    x = np.zeros(n) if sfx is None else np.pad(sfx, (0, max(0, n - len(sfx))))[:n]
    v = np.zeros(n); dk = np.ones(n)
    for at, p in voices:
        s = read_wav(p); s = s / (np.abs(s).max() + 1e-9)
        _VOICES.append(dict(t=round(float(at), 3), file=os.path.basename(p), dur=round(len(s) / SR, 3)))
        a = _T(at); b = min(n, a + len(s)); v[a:b] += s[:b - a]
        r = _T(ramp); lo, hi = max(0, a - r), min(n, b + r)
        env = np.ones(hi - lo); env[:a - lo] = np.linspace(1, duck, a - lo); env[a - lo:b - lo] = duck; env[b - lo:] = np.linspace(duck, 1, hi - b)
        dk[lo:hi] = np.minimum(dk[lo:hi], env)
    if not np.isfinite(xb).all(): print('⚠️ 배경음에 깨진 값(NaN) — 그 자리를 0 으로'); xb = np.nan_to_num(xb, nan=0.0, posinf=0.0, neginf=0.0)
    if not np.isfinite(x).all(): print('⚠️ 효과음에 깨진 값(NaN) — 그 자리를 0 으로'); x = np.nan_to_num(x, nan=0.0, posinf=0.0, neginf=0.0)
    y = xb * dk + sfx_gain * x
    y = y * (peak / (np.abs(y).max() + 1e-9)) if np.abs(y).max() > 0 else y
    y = y + voice_gain * v
    if soft: y = np.tanh(y * soft) / np.tanh(soft)   # 겹친 자리 피크만 부드럽게 누른다
    fi, fo = _T(fade_in), min(end, _T(fade_out)); y[:fi] *= np.linspace(0, 1, fi)
    y[end - fo:end] *= np.linspace(1, 0, fo); y[end:] = 0
    write_wav(path, y)
    return path


def bgm_gap(track, spans, fade=0.3):
    """배경음을 구간마다 비운다 — spans = [(시작초, 끝초)] · 앞뒤 fade 초 동안 서서히 (완성 영상을 통째로 틀며 그 영상 소리만 낼 때)"""
    if track is None: return None
    x = np.asarray(track, np.float64).copy(); t = np.arange(len(x)) / SR; g = np.ones(len(x))
    for a, b in spans:
        g = np.minimum(g, np.clip(np.maximum((a - t) / fade, (t - b) / fade), 0, 1))
    return x * g


def new_track(dur):
    """효과음을 쌓을 빈 트랙 (dur + 0.5초) · 소리 지도 기록도 여기서 새로 시작"""
    global LAST_SCORE
    sfx.LOG.clear(); _VOICES.clear(); _PENDING.clear(); LAST_SCORE = None
    return np.zeros(_T(dur + 0.5))
