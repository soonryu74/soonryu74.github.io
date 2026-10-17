"""녹화 컷 편집 — 긴 화면 녹화를 «컷 표»로 잘라 배속 · 멈춤 · 들어내기 · 컷 안 카메라 · 손그림 짚기 · 빨리 감기 배지 · 가리기를 얹는다 (reference/rec-cut.md)

컷 표 = dict 목록. 시각은 전부 «원본 녹화 시각»으로 적는다 — 조각을 빼거나 배속을 바꿔도 짚기 · 대사가 따라온다.
  id    컷 이름            src  녹화 파일 (Reel(rec=폴더) 안)       a, b  미리 굽는 원본 구간(초)   sp  배속(기본 1)
  crop  (가운데 x, 가운데 y, 너비) — 원본 좌표 · 높이 = 너비 × 화면 H/W (원본 크기는 파일에서 읽는다)
  keep  실제로 보여 줄 조각 [(원본 시작, 원본 끝, 배속) | ('freeze', 원본 시각, 멈출 초)] — 없으면 [(a, b, sp)]
  view  처음 보여 줄 틀(crop 안쪽 · 없으면 crop) · cam [(원본 시각, 새 틀, 옮기는 초)] 컷 안 카메라
  vo    [(대사 파일 · 이름, 컷 안 초)] 또는 [(이름, {'src': 원본 시각})] — 원본 시각이면 조각을 빼도 따라온다
  marks [(원본 시각, 길이, 종류, 인자…, {옵션})] — 원본 좌표 · circle(cx, cy, rx, ry) · underline(x0, x1, y) · box(x0, y0, x1, y1) · check(x, y, size) · x(cx, cy, size)
        길이는 «원본 초» · 옵션: end 원본 시각에 지운다 · at/until 컷 안 초로 직접 · w 선 굵기 · col 색
        ★기본 = 그 조각(화면)이 바뀌면 같이 지운다 (끝을 안 적어도 다음 화면에 남지 않게)
  ff    빨리 감기 배지 (조각 배속 3 이상 «빨리 감기 ×N» · 100 이상 «건너뛰기»)   hold  끝 화면을 더 머무는 초   skip  안 씀
  mask  True = Reel(masks=…) 가리기를 이 컷에 (이름 · 경로 같은 것 — 원본 좌표 · 그 원본 시각부터)

  R = cut.Reel(SHOTS, rec='녹화', size=(W, H))
  R.prepare()                   빠진 컷만 미리 굽기 → .cache/shots/ (컷 표를 고치면 그 컷만 다시) — bake.cli 가 굽기 전에 부른다(M.prepare)
  R.frame('c03', lt)            컷 안 lt 초의 화면(짚기 · 배지까지)
  R.dur('c03') · R.vo('c03') · R.timeline() · R.srt(texts, lens, out)
"""
import hashlib
import json
import math
import os
import subprocess
import time

from PIL import Image, ImageDraw, ImageFont

from . import label
from .ease import cl, eio, eo, seg

MARK = (235, 64, 52)
INK = (22, 22, 26)
BADGE_BG = (255, 214, 64)
HERE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT = os.path.join(HERE, 'assets', 'fonts', 'Pretendard-Bold.otf')


def _probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration',
                        '-of', 'json', path], capture_output=True, text=True)
    j = json.loads(r.stdout or '{}'); s = (j.get('streams') or [{}])[0]
    return int(s.get('width') or 0), int(s.get('height') or 0), float(j.get('format', {}).get('duration') or 0)


class Reel:
    def __init__(self, shots, rec='녹화', size=(1920, 1080), fps=30, cache='.cache/shots', masks=(), mark_col=MARK, drift=0.025):
        self.rec, self.W, self.H, self.fps, self.cache = rec, size[0], size[1], fps, cache
        self.all = [dict(s) for s in shots]
        self.shots = [s for s in self.all if not s.get('skip')]
        self.by = {s['id']: s for s in self.all}
        self.masks, self.mark_col, self.drift = list(masks), mark_col, drift
        self._src, self._clip, self._badge = {}, {}, {}

    # ── 원본 ──
    def src_path(self, s): return os.path.join(self.rec, s['src'])

    def src_size(self, s):
        p = self.src_path(s)
        if p not in self._src:
            w, h, d = _probe(p)
            if not w: raise FileNotFoundError(f'녹화 파일을 못 읽어요: {p}')
            self._src[p] = (w, h, d)
        return self._src[p]

    def rect(self, s, c=None):
        """(가운데 x, 가운데 y, 너비) → 원본 안 (x0, y0, w, h) · 화면 비율 · 원본 밖으로 안 나가게"""
        SW, SH, _ = self.src_size(s); cx, cy, w = c or s.get('crop') or (SW / 2, SH / 2, SW)
        h = w * self.H / self.W
        if h > SH: h = SH; w = h * self.W / self.H
        x0 = min(max(cx - w / 2, 0), SW - w); y0 = min(max(cy - h / 2, 0), SH - h)
        return x0, y0, w, h

    # ── 시각 ──
    def _s(self, s): return self.by[s] if isinstance(s, str) else s

    def segs(self, s):
        """[(컷 안 시작, 길이, 원본 시작, 원본 끝, 배속 또는 None=멈춤)]"""
        s = self._s(s); out, t = [], 0.0
        for k in s.get('keep') or [(s['a'], s['b'], s.get('sp', 1))]:
            if k[0] == 'freeze': out.append((t, k[2], k[1], k[1], None)); t += k[2]
            else: d = (k[1] - k[0]) / k[2]; out.append((t, d, k[0], k[1], k[2])); t += d
        return out

    def dur(self, s):
        s = self._s(s); g = self.segs(s); return g[-1][0] + g[-1][1] + s.get('hold', 0)

    def seg_at(self, s, lt):
        g = self.segs(s)
        for x in g:
            if lt < x[0] + x[1]: return x
        return g[-1]

    def lt2src(self, s, lt):
        t0, d, a, b, sp = self.seg_at(s, lt)
        return a if sp is None else min(b, a + max(0.0, lt - t0) * sp)

    def src2lt(self, s, t):
        """원본 시각 → 컷 안 초 (들어낸 구간이면 다음 조각 시작)"""
        for t0, d, a, b, sp in self.segs(s):
            if t <= b + 1e-6: return t0 if (sp is None or t < a) else t0 + (t - a) / sp
        return self.dur(s)

    def mark_time(self, s, m):
        """짚기 표시 → (컷 안 시작, 보이는 길이, 사라지는 초) · 기본은 그 조각이 끝날 때 같이 끝"""
        s = self._s(s); o = m[-1] if isinstance(m[-1], dict) else {}
        if 'at' in o: return o['at'], o['until'] - o['at'], 0.25
        t0 = self.src2lt(s, m[0])
        if 'end' in o: return t0, max(0.3, self.src2lt(s, o['end']) - t0 - 0.12), 0.12
        g = self.seg_at(s, t0); sp = g[4] or 1
        want = max(1.2, m[1] / sp + 0.6); seg_end = g[0] + g[1] - t0
        last = g is self.segs(s)[-1]
        if not last and want > seg_end: return t0, max(0.3, seg_end - 0.12), 0.12   # 다음 화면으로 넘어가기 전에 지운다
        return t0, want, 0.3

    def vo(self, s):
        """[(이름, 컷 안 초)] — {'src': 원본 시각} 은 컷 안 초로 바꾼다"""
        s = self._s(s); out = []
        for name, at in s.get('vo', []):
            out.append((name, self.src2lt(s, at['src']) + at.get('add', 0) if isinstance(at, dict) else at))
        return out

    def timeline(self, start=0.0, gap=0.0):
        """[(id, 시작, 끝)] — 컷을 차례로 이어 붙였을 때 (장면 사이에 다른 장면이 끼면 scenes.py 의 시각을 쓴다)"""
        out, t = [], start
        for s in self.shots: d = self.dur(s); out.append((s['id'], t, t + d)); t += d + gap
        return out

    # ── 미리 굽기 ──
    def _key(self, s):
        p = self.src_path(s); st = os.stat(p)
        k = json.dumps([p, st.st_size, int(st.st_mtime), s['a'], s['b'], s.get('sp', 1), s.get('crop'), self.W, self.H, self.fps,
                        self.masks if s.get('mask') else None], ensure_ascii=False, default=str)
        return hashlib.md5(k.encode()).hexdigest()[:8]

    def path(self, s):
        s = self._s(s); return os.path.join(self.cache, f"{s['id']}_{self._key(s)}.mp4")

    def _vf(self, s, a):
        f = []
        if s.get('mask'):
            fd = FONT.replace(':', r'\:')
            for m in self.masks:
                if m.get('src') and m['src'] != s['src']: continue
                en = f"enable='gte(t+{a},{m.get('t', 0)})'"
                col = '0x%02X%02X%02X' % tuple(m.get('color', (30, 30, 30)))
                f.append(f"drawbox=x={m['x']}:y={m['y']}:w={m['w']}:h={m['h']}:color={col}:t=fill:{en}")
                if m.get('text'):
                    tc = '0x%02X%02X%02X' % tuple(m.get('text_color', (232, 232, 232)))
                    txt = m['text'].replace(':', r'\:').replace("'", r"\'")
                    f.append(f"drawtext=fontfile='{fd}':text='{txt}':x={m['x'] + 6}:y={m['y'] + max(2, (m['h'] - int(m['h'] * 0.8)) // 2)}:"
                             f"fontsize={int(m['h'] * 0.8)}:fontcolor={tc}:{en}")
        x0, y0, w, h = self.rect(s)
        ow = s.get('outw') or self.W * 3 // 2 if s.get('cam') or s.get('view') else s.get('outw') or self.W   # 컷 안 카메라가 있으면 넉넉히
        ow -= ow % 2; oh = int(round(ow * self.H / self.W)); oh -= oh % 2
        f += [f"setpts=(PTS-STARTPTS)/{s.get('sp', 1)}", f"crop={int(w)}:{int(h)}:{int(x0)}:{int(y0)}",
              f"scale={ow}:{oh}:flags=lanczos", f"fps={self.fps}"]
        return ','.join(f)

    def _enc(self, s, a, b, out):
        sk = ['-skip_frame', 'nokey'] if s.get('sp', 1) >= 20 else []          # 아주 빠른 배속은 키 프레임만 읽어 빠르게
        tmp = out + f'.tmp{os.getpid()}.mp4'
        r = subprocess.run(['ffmpeg', '-v', 'error', '-y', *sk, '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', self.src_path(s), '-an',
                            '-vf', self._vf(s, a), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', tmp],
                           capture_output=True, text=True)
        if r.returncode: raise RuntimeError(f"컷 {s['id']} 미리 굽기 실패: {r.stderr[-400:]}")
        os.replace(tmp, out)

    def prepare(self, budget=None, chunk=150.0, quiet=False):
        """빠진 컷만 미리 굽는다 · 긴 컷은 원본 chunk 초씩 조각으로 굽고 잇는다 · budget 초를 넘기면 멈춤(다시 부르면 이어서) → 다 됐으면 True"""
        os.makedirs(os.path.join(self.cache, 'parts'), exist_ok=True); T0 = time.time(); todo = [s for s in self.shots if not os.path.exists(self.path(s))]
        if todo and not quiet: print(f'  녹화 컷 미리 굽기 — {len(todo)}개 (처음 한 번 · 고친 컷만 다시)', flush=True)
        for s in todo:
            out = self.path(s); a, b = s['a'], s['b']; n = max(1, int(math.ceil((b - a - 1) / chunk)))
            parts = [(a + i * (b - a) / n, a + (i + 1) * (b - a) / n) for i in range(n)]; files = []
            for i, (pa, pb) in enumerate(parts):
                p = os.path.join(self.cache, 'parts', f"{os.path.basename(out)[:-4]}_{i}.mp4"); files.append(p)
                if os.path.exists(p): continue
                if budget and time.time() - T0 > budget:
                    if not quiet: print(f"  ⏸ 시간 끝 — 다시 부르면 {s['id']} 조각 {i} 부터"); return False
                self._enc(s, pa, pb, p)
            if len(files) == 1: os.replace(files[0], out)
            else:
                lst = out[:-4] + '.txt'; open(lst, 'w').write(''.join(f"file '{os.path.abspath(f)}'\n" for f in files))
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out + '.tmp.mp4'], check=True)
                os.replace(out + '.tmp.mp4', out); os.remove(lst)
                for f in files: os.remove(f)
            if not quiet: print(f"  ✓ {s['id']} ({round(time.time() - T0)}초)", flush=True)
        return True

    def clip(self, s):
        from . import video as V
        s = self._s(s); p = self.path(s)
        if p not in self._clip:
            if not os.path.exists(p): self.prepare(quiet=True)
            self._clip[p] = V.Clip(p, loop=False, max_w=4096)
        return self._clip[p]

    # ── 화면 ──
    def view(self, s, src):
        """그 순간의 틀 (원본 좌표 x0, y0, w, h) — view 에서 시작 · cam 으로 옮긴다"""
        v = self.rect(s, s.get('view'))
        for t0, c, d in s.get('cam', []):
            n = self.rect(s, c); k = eio(cl((src - t0) / d))
            if k > 0: v = tuple(a + (b - a) * k for a, b in zip(v, n))
        return v

    def frame(self, cid, lt, marks=True, badge=True):
        s = self._s(cid); cl_ = self.clip(s); src = self.lt2src(s, lt); g = self.seg_at(s, lt)
        fr = cl_.frame(min(max(0.0, (src - s['a']) / s.get('sp', 1)), cl_.dur - 1e-3))
        bx0, by0, bw, bh = self.rect(s); f = fr.width / bw
        z = 1.0 + self.drift * min(1.0, lt / max(1.0, self.dur(s)))            # 아주 천천히 다가가기 (멈춘 느낌 없게)
        vx0, vy0, vw, vh = self.view(s, src); cx, cy = vx0 + vw / 2, vy0 + vh / 2; vw, vh = vw / z, vh / z; vx0, vy0 = cx - vw / 2, cy - vh / 2
        box = ((vx0 - bx0) * f, (vy0 - by0) * f, (vx0 - bx0 + vw) * f, (vy0 - by0 + vh) * f)
        img = fr.resize((self.W, self.H), Image.BICUBIC, box=box)
        if marks: self._marks(img, s, lt, vx0, vy0, self.W / vw)
        if badge and s.get('ff') and g[4] and g[4] >= 3: self.badge(img, g[4], lt - g[0])
        return img

    def _marks(self, img, s, lt, vx0, vy0, kk):
        X = lambda x: (x - vx0) * kk; Y = lambda y: (y - vy0) * kk
        for j, m in enumerate(s.get('marks', [])):
            t0, dur, fo = self.mark_time(s, m)
            if not (t0 <= lt <= t0 + dur + fo): continue
            a = [v for v in m[3:] if not isinstance(v, dict)]; o = m[-1] if isinstance(m[-1], dict) else {}; kind = m[2]
            k = seg(lt, t0, t0 + 0.45); fade = 1 - seg(lt, t0 + dur, t0 + dur + fo); w = o.get('w', 9)
            if kind == 'circle': st = label.mark('circle', X(a[0]), Y(a[1]), a[2] * kk, a[3] * kk, w=w, seed=40 + j)
            elif kind == 'underline': st = label.mark('underline', X(a[0]), X(a[1]), Y(a[2]), w=w, seed=40 + j)
            elif kind == 'check': st = label.mark('check', X(a[0]), Y(a[1]), a[2] * kk, w=o.get('w', 10), seed=40 + j)
            elif kind == 'x': st = label.mark('x', X(a[0]), Y(a[1]), a[2] * kk, w=o.get('w', 10), seed=40 + j)
            else: st = label.mark('box', X(a[0]), Y(a[1]), X(a[2]), Y(a[3]), w=o.get('w', 10), seed=40 + j)
            col = o.get('col', self.mark_col)
            if fade < 1:
                lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); label.draw_mark(ImageDraw.Draw(lay), st, k, col, halo=6)
                lay.putalpha(lay.getchannel('A').point(lambda v: int(v * fade))); img.paste(lay, (0, 0), lay)
            else: label.draw_mark(ImageDraw.Draw(img), st, k, col, halo=6)

    def badge(self, img, sp, lt, pos='right'):
        """빨리 감기 배지 — 꼬리표 + 도는 시계 바늘 (▶▶ 는 도형으로 — 글꼴에 없을 수 있다)"""
        sz = max(0.6, self.H / 1080)
        if sp not in self._badge:
            f = ImageFont.truetype(FONT, int(44 * sz)); txt = f'빨리 감기 ×{sp:g}' if sp < 100 else '건너뛰기'
            tw = int(f.getlength(txt)); u = int(100 * sz); hh = int(100 * sz)
            b = Image.new('RGBA', (tw + u + int(110 * sz), hh), (0, 0, 0, 0)); d = ImageDraw.Draw(b)
            d.rounded_rectangle([4, 4, b.width - 4, hh - 4], int(26 * sz), fill=BADGE_BG + (255,), outline=INK + (255,), width=max(2, int(4 * sz)))
            x = u + int(4 * sz); cy = hh / 2; th = 16 * sz
            for i in range(2): d.polygon([(x + i * th, cy - th), (x + i * th + th * 1.2, cy), (x + i * th, cy + th)], fill=INK)
            d.text((x + th * 3.4, cy), txt, font=f, fill=INK, anchor='lm'); self._badge[sp] = b
        b = self._badge[sp].copy(); d = ImageDraw.Draw(b); cx = cy = b.height / 2; r = b.height * 0.3
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 255), outline=INK + (255,), width=max(2, int(r / 8)))
        for sp_, ln in ((6.0, 0.72), (0.5, 0.46)):
            a = lt * sp_; d.line([cx, cy, cx + r * ln * math.sin(a), cy - r * ln * math.cos(a)], fill=INK, width=max(2, int(r / 6)))
        k = min(1.0, lt / 0.25); x = int(self.W - b.width - 36 * sz) if pos == 'right' else int(36 * sz); y = int(34 * sz - (1 - eo(k)) * 160 * sz)
        img.paste(b, (x, y), b)
        return img

    # ── 자막 ──
    def srt(self, texts, lens, out, starts=None, max_chars=22):
        """대사 자막(.srt) — texts {이름: 문장} · lens {이름: 초} 또는 함수 · starts {컷 id: 영상 안 시작 초}(없으면 timeline) · 긴 문장은 나눠 글자 수 비율로"""
        from . import stt
        starts = starts or {i: a for i, a, b in self.timeline()}; lines = []
        L = lens if callable(lens) else (lambda n: lens[n])
        for s in self.shots:
            if s['id'] not in starts: continue
            for name, at in self.vo(s):
                if name not in texts: continue
                a = starts[s['id']] + at; d = L(name); parts = stt.split_lines(texts[name], max_chars) or [texts[name]]
                n = sum(len(p) for p in parts) or 1; t = a
                for p in parts: e = t + d * len(p) / n; lines.append((round(t, 2), round(e, 2), p.rstrip('.,'))); t = e
        lines.sort(); stt.write_srt(lines, out)
        return out
