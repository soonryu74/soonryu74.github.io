"""영상 넣기 — 유저가 준 영상을 컷으로 나누고 · 구간을 잘라 · 화면에 넣고(줌해도 원본 화질) · 원본 소리를 잇는다 (reference/video.md).

엔진은 «시각을 주면 그 순간을 다시 그린다» → 영상도 «시각마다 바뀌는 그림 요소»다. 여러 개를 동시에 틀고, 그 위로 카메라 · 전환 · 효과 · 시간 조작을 그대로 쓴다.

  info = probe(path)                       길이 · 크기 · 초당 프레임 · 소리 유무
  cs = cuts(path, th=0.28)                 장면이 바뀌는 시각들 (컷 나누기)
  sheet(path, cs, 'out/_shots.jpg')        컷마다 대표 장면 모음표 — Claude 가 보고 컷을 고른다(«남자 나오는 장면» 등)
  box = letterbox(path)                    위아래(양옆) 검은 띠를 뺀 화면 (x, y, w, h)
  poster(path, t, '재료/영상_이름.png')     캔버스에 올릴 대표 장면 (캔버스는 영상을 재생하지 못한다 — 이 그림 자리에 영상이 들어간다)
  clip = Clip(path, a, b, crop=box)        구간 프레임을 한 번 꺼내 두고(작업 폴더 .cache) · clip.frame(t) = 그 시각 그림 (t 는 구간 안 초 · loop)
  img = fit(frame, (w, h), focus=(0.5, 0.5), z=1.0)   칸 비율로 잘라 맞추기 — focus = 인물 자리(0~1) · z = 다가가기
  paste_on_screen(screen, clip, t, e, cam, out)     ★카메라 뒤에 그린다: 아트보드 요소 e 의 화면 위 자리에 원본 프레임에서 바로 → 줌해도 흐려지지 않는다
  find(els, '이름')                         캔버스에서 `재료/영상_이름.png` 를 쓴 요소
  sig = sound(path, a, b)                   구간 원본 소리 (mono float · audio.SR)
  put_sound(track, sig, at, fade=0.012, gain=1)   소리 트랙에 얹기 (경계 페이드)
  subs = subtitles('원본.srt')              자막(srt · vtt) → [(시작, 끝, 문장)] — 겹치는 자동 자막 정리 · [음악] [박수] 빼기
  digest(subs, per=60)                      ★대용량 입력: 분 단위 묶음 글 (긴 자막을 통째로 읽지 않는다) → 고른 구간만 subs 로 다시
  near(subs, '눈물')                        낱말이 나오는 줄들 [(시작, 끝, 문장)]
  timecode('영상 3:12~3:15 재생')           캔버스 메모 → {'a': 192.0, 'b': 195.0, 'file': None} (없으면 None) · «원본2 1:02:10~1:02:14» 도 읽는다
"""
import hashlib
import json
import os
import re
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from . import audio as _audio

_CACHE = {}


def _run(args, text=True):
    return subprocess.run(args, capture_output=True, text=text)


def probe(path):
    r = _run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,r_frame_rate', '-of', 'json', path])
    j = json.loads(r.stdout or '{}'); v = next((s for s in j.get('streams', []) if s.get('codec_type') == 'video'), {})
    num, den = (v.get('r_frame_rate') or '30/1').split('/')
    return {'dur': float(j.get('format', {}).get('duration', 0)), 'w': v.get('width'), 'h': v.get('height'),
            'fps': float(num) / max(1.0, float(den)), 'audio': any(s.get('codec_type') == 'audio' for s in j.get('streams', []))}


def cuts(path, th=0.28):
    r = _run(['ffmpeg', '-hide_banner', '-i', path, '-vf', f"select='gt(scene,{th})',showinfo", '-f', 'null', '-'])
    return [float(x) for x in re.findall(r'pts_time:([0-9.]+)', r.stderr)]


def letterbox(path, at=None):
    d = probe(path)['dur']; ts = [d * f for f in (0.2, 0.4, 0.6, 0.8)] if at is None else [at]; best = {}
    for t in ts:
        r = _run(['ffmpeg', '-hide_banner', '-ss', str(t), '-i', path, '-t', '1', '-vf', 'cropdetect=24:2:0', '-f', 'null', '-'])
        for m in re.findall(r'crop=(\d+):(\d+):(\d+):(\d+)', r.stderr): best[m] = best.get(m, 0) + 1
    if not best: i = probe(path); return (0, 0, i['w'], i['h'])
    w, h, x, y = max(best, key=best.get); return (int(x), int(y), int(w), int(h))


def _grab(path, t, scale=None):
    vf = ['-vf', f'scale={scale}'] if scale else []
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', path, '-frames:v', '1', *vf, '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True)
    from io import BytesIO
    return Image.open(BytesIO(r.stdout)).convert('RGB')


def sheet(path, cs, out, cols=6, tw=320, font_path=None):
    """컷 모음표 — 컷 번호 · 구간 · 대표 장면"""
    d = probe(path)['dur']; b = [0.0] + list(cs) + [d]; shots = [(b[i], b[i + 1]) for i in range(len(b) - 1)]
    th = int(tw * (probe(path)['h'] or 9) / (probe(path)['w'] or 16)); rows = (len(shots) + cols - 1) // cols
    S = Image.new('RGB', (cols * tw, rows * (th + 24)), (20, 20, 20)); dr = ImageDraw.Draw(S)
    fp = font_path or os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'fonts', 'Pretendard-Bold.otf')
    try: f = ImageFont.truetype(fp, 16)
    except OSError: f = ImageFont.load_default()
    for i, (a, e) in enumerate(shots):
        im = _grab(path, (a + e) / 2, f'{tw}:{th}'); x, y = (i % cols) * tw, (i // cols) * (th + 24)
        S.paste(im, (x, y + 24)); dr.text((x + 4, y + 3), f'#{i}  {a:.1f}~{e:.1f}s ({e - a:.1f})', font=f, fill=(255, 230, 120))
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True); S.save(out, quality=85)
    return shots


def poster(path, t, out, crop=None):
    im = _grab(path, t)
    if crop: x, y, w, h = crop; im = im.crop((x, y, x + w, y + h))
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True); im.save(out); return out


class Clip:
    """영상 구간 [a, b) — 프레임을 작업 폴더 .cache/ 에 한 번 꺼내 두고 시각으로 꺼내 쓴다"""

    def __init__(self, path, a=0.0, b=None, crop=None, loop=True, max_w=1920):
        self.path, self.a, self.loop = path, float(a), loop
        info = probe(path); self.fps = info['fps']; self.b = float(b if b is not None else info['dur']); self.dur = self.b - self.a
        self.crop = crop
        key = hashlib.md5(f'{os.path.abspath(path)}|{self.a}|{self.b}|{crop}|{max_w}'.encode()).hexdigest()[:10]
        self.dir = os.path.join('.cache', 'video', key); self.n = 0
        done = os.path.join(self.dir, '.done')
        if not os.path.exists(done):
            # 굽기를 여러 프로세스가 동시에 해도 덜 쓴 그림을 읽지 않게 — 따로 꺼낸 뒤 한 번에 옮기고 «다 됨» 표시
            tmp = f'{self.dir}.tmp{os.getpid()}'; os.makedirs(tmp, exist_ok=True)
            vf = []
            if crop: x, y, w, h = crop; vf.append(f'crop={w}:{h}:{x}:{y}')
            vf.append(f"scale='min({max_w},iw)':-2")
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(self.a), '-i', path, '-t', str(self.dur), '-vf', ','.join(vf), '-q:v', '3',
                            os.path.join(tmp, '%05d.jpg')], check=True)
            open(os.path.join(tmp, '.done'), 'w').close()
            os.makedirs(os.path.dirname(self.dir), exist_ok=True)
            try: os.rename(tmp, self.dir)
            except OSError:                                                # 다른 프로세스가 먼저 옮겼다(또는 옛 폴더가 있다) — 그쪽을 쓴다
                import shutil, time
                shutil.rmtree(tmp, ignore_errors=True)
                for _ in range(300):
                    if os.path.exists(done): break
                    time.sleep(0.1)
                if not os.path.exists(done): raise RuntimeError(f'영상 프레임 폴더가 덜 만들어졌다: {self.dir} — .cache/video 를 지우고 다시')
        self.n = len([f for f in os.listdir(self.dir) if f.endswith('.jpg')])
        if self.n == 0:
            raise ValueError(f'영상 구간에 프레임이 없다: {path} {self.a:.2f}~{self.b:.2f}초 (원본 {info["dur"]:.2f}초 · crop {crop}) — 구간 · crop 을 확인')

    def frame(self, t):
        """구간 안 t 초의 그림 (loop 이면 되풀이 · 아니면 끝에서 멈춤)"""
        t = (t % self.dur) if self.loop and self.dur > 0 else max(0.0, min(t, self.dur - 1e-3))
        i = max(1, min(self.n, int(t * self.fps) + 1)); k = (self.dir, i)
        if k not in _CACHE:
            if len(_CACHE) > 240: _CACHE.clear()
            _CACHE[k] = Image.open(os.path.join(self.dir, f'{i:05d}.jpg')).convert('RGB')
        return _CACHE[k]


def fit(img, size, focus=(0.5, 0.5), z=1.0):
    """칸 비율로 잘라 맞추기 (cover) — focus = 남길 자리(0~1) · z>1 = 그 자리로 다가감"""
    W, H = size; iw, ih = img.size
    s = max(W / iw, H / ih) * z; cw, ch = W / s, H / s
    cx = min(max(focus[0] * iw, cw / 2), iw - cw / 2); cy = min(max(focus[1] * ih, ch / 2), ih - ch / 2)
    cw, ch = min(cw, iw), min(ch, ih)
    x0, y0 = max(0.0, cx - cw / 2), max(0.0, cy - ch / 2)
    return img.resize((int(W), int(H)), Image.BICUBIC, box=(x0, y0, min(iw, x0 + cw), min(ih, y0 + ch)))


def screen_rect(e, cam, out):
    """아트보드 요소 e 의 자리 → 카메라로 찍은 화면 위 자리 (기울기 없는 카메라)"""
    ow, oh = out; x, y, w, h = e['x'], e['y'], e['w'], (e.get('h') or e['w'])
    sx = (x - cam.cx) * cam.z + ow / 2; sy = (y - cam.cy) * cam.z + oh / 2
    return sx, sy, w * cam.z, h * cam.z


def paste_on_screen(screen, clip_or_img, t, e, cam, out=None, focus=(0.5, 0.5), z=1.0, radius=0, dim=0.0):
    """★카메라 뒤에 그린다 — 영상 요소의 화면 위 자리에 원본 프레임을 바로 그 크기로 (줌해도 원본 화질).
    dim = 어둡게(0~1 · 집중할 화면 말고 나머지) · radius = 둥근 모서리(화면 px)"""
    out = out or screen.size
    sx, sy, sw, sh = screen_rect(e, cam, out)
    if sw < 2 or sh < 2 or sx > out[0] or sy > out[1] or sx + sw < 0 or sy + sh < 0: return screen
    fr = clip_or_img.frame(t) if hasattr(clip_or_img, 'frame') else clip_or_img
    im = fit(fr, (max(1, int(round(sw))), max(1, int(round(sh)))), focus, z)
    if dim > 0: im = Image.blend(im, Image.new('RGB', im.size, (0, 0, 0)), dim)
    m = None
    if radius > 0:
        m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], int(radius), fill=255)
    screen.paste(im, (int(round(sx)), int(round(sy))), m)
    return screen


def find(els, name):
    """캔버스에서 `재료/영상_<name>.png` (또는 이름이 들어간 그림)을 쓴 요소"""
    for e in els:
        s = e.get('src') or ''
        if f'영상_{name}' in s or s.endswith(f'/{name}.png'): return e
    return None


def sound(path, a, b, sr=None):
    sr = sr or _audio.SR
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(a), '-i', path, '-t', str(max(0.01, b - a)), '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True)
    return np.frombuffer(r.stdout, '<i2').astype(np.float32) / 32768


def put_sound(track, sig, at, fade=0.012, gain=1.0, sr=None):
    sr = sr or _audio.SR; s = np.asarray(sig, np.float32).copy() * gain; fd = int(fade * sr)
    if len(s) > 2 * fd > 0: s[:fd] *= np.linspace(0, 1, fd); s[-fd:] *= np.linspace(1, 0, fd)
    i = int(at * sr)
    if i >= len(track): return track
    n = min(len(s), len(track) - i); track[i:i + n] += s[:n]; return track


# ── 자막 · 대용량 입력 · 메모 타임코드 ─────────────────
_TC = re.compile(r'(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})')
_SKIP = re.compile(r'^\s*(>>\s*)?\[[^\]]*\]\s*$')


def _sec(h, m, s_, ms): return int(h) * 3600 + int(m) * 60 + int(s_) + int(ms.ljust(3, '0')) / 1000


def subtitles(path):
    """srt · vtt → [(시작초, 끝초, 문장)] — 자동 자막처럼 줄 시각이 겹치면 다음 줄 시작에서 끊는다 · [음악] 같은 줄은 뺀다"""
    raw = open(path, encoding='utf-8-sig', errors='replace').read().replace('\r', '')
    out = []
    for blk in re.split(r'\n\s*\n', raw):
        lines = [x for x in blk.strip().split('\n') if x.strip()]
        i = next((k for k, x in enumerate(lines) if '-->' in x), None)
        if i is None: continue
        tc = _TC.findall(lines[i])
        if len(tc) < 2: continue
        txt = ' '.join(re.sub(r'<[^>]+>', '', x).strip() for x in lines[i + 1:]).strip()
        txt = re.sub(r'^>>\s*', '', txt)
        if not txt or _SKIP.match(txt): continue
        out.append([_sec(*tc[0]), _sec(*tc[1]), re.sub(r'\[[^\]]*\]', '', txt).strip()])
    out.sort(key=lambda x: x[0])
    for k in range(len(out) - 1): out[k][1] = min(out[k][1], max(out[k][0] + 0.2, out[k + 1][0]))
    return [tuple(x) for x in out if x[2]]


def _clock(t):
    t = int(t); h, m, s_ = t // 3600, t // 60 % 60, t % 60
    return f'{h}:{m:02d}:{s_:02d}' if h else f'{m:02d}:{s_:02d}'


def digest(subs, per=60, width=None):
    """★대용량 입력 — per 초마다 한 줄로 묶은 글. 긴 자막은 이것부터 읽고, 고른 구간만 subs 줄 단위로 다시 본다.
    width = 줄마다 글자 수 상한(넘으면 줄임표)"""
    rows, cur, buf = [], None, []
    for a, b, txt in subs:
        k = int(a // per)
        if k != cur and buf: rows.append(f'[{_clock(cur * per)}] ' + ' '.join(buf)); buf = []
        cur = k; buf.append(txt)
    if buf: rows.append(f'[{_clock(cur * per)}] ' + ' '.join(buf))
    if width: rows = [r if len(r) <= width else r[:width - 1] + '…' for r in rows]
    return '\n'.join(rows)


def near(subs, word):
    return [x for x in subs if word in x[2]]


_MEMO = re.compile(r'(?:(?P<file>[\w\-.가-힣]+)\s+)?(?P<a>(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?)\s*[~\-–—]\s*(?P<b>(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?)')


def _hms(x):
    p = [float(v) for v in x.split(':')]
    return p[0] * 3600 + p[1] * 60 + p[2] if len(p) == 3 else p[0] * 60 + p[1]


def timecode(text):
    """캔버스 메모의 영상 구간 — «영상 3:12~3:15 재생» → {'a': 192.0, 'b': 195.0, 'file': None}. 없으면 None.
    파일 이름이 구간 바로 앞에 있으면 file 로 («원본2 3:12~3:15»). 멈춤 · 느리게 · 소리는 메모 글을 보고 Claude 가 정한다."""
    m = _MEMO.search(text or '')
    if not m: return None
    f = m.group('file')
    if f and (f in ('영상', '재생') or re.fullmatch(r'[가-힣]+', f)): f = None
    a, b = _hms(m.group('a')), _hms(m.group('b'))
    return {'a': min(a, b), 'b': max(a, b), 'file': f}
