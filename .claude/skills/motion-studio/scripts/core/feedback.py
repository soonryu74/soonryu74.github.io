"""굽기 뒤 피드백 — 뷰어 만들기 · 짚은 시각 앞뒤 프레임 시트 · 소리 크기 (reference/feedback.md)

  viewer(영상, srt=None)      → 작업 폴더(out/ 의 부모)에 피드백뷰어.html (영상 이름 · fps · ★대사 줄 채움)
  find_srt(영상, 작업 폴더)    → 그 영상의 자막 파일 (영상이름.srt → out/자막.srt → 작업 폴더/자막.srt)
  read_srt(경로) / cues_ok(줄, 길이)  자막 읽기 · 영상 길이와 맞는지
  sheet(영상, [초…], 폴더)    → 시각마다 앞뒤 프레임 한 줄씩 + 타임코드 라벨 → 시트 jpg
  loud(영상 또는 wav, a, b)    → [(초, dB)] 0.25초 간격 — 외침 · 박수 · 대사 시작 자리 찾기
  tc(초, fps) / sec("01:23:10")  분:초:프레임 ↔ 초
"""
import json
import os
import re
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

_SK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEMPLATE = os.path.join(_SK, 'assets', 'feedback_viewer.html')
FONT = os.path.join(_SK, 'assets', 'fonts', 'Pretendard-Bold.otf')


def fps_of(p):
    try:
        r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate',
                            '-of', 'json', p], capture_output=True, text=True)
        a, b = json.loads(r.stdout)['streams'][0]['r_frame_rate'].split('/')
        return round(float(a) / float(b), 3)
    except Exception:
        return 30


def dur_of(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    try: return float(r.stdout.strip())
    except ValueError: return 0.0


def read_srt(path):
    """.srt · .vtt → [(a, b, 글)] (여러 줄 글은 한 줄로 · 태그 제거)"""
    raw = open(path, encoding='utf-8-sig', errors='replace').read().replace('\r', '')
    out = []
    for blk in re.split(r'\n\s*\n', raw):
        m = re.search(r'(\d+):(\d\d):(\d\d)[,.](\d{1,3})\s*-->\s*(\d+):(\d\d):(\d\d)[,.](\d{1,3})', blk)
        if not m: continue
        g = [int(x) for x in m.groups()]
        a = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 10 ** len(m[4]); b = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 10 ** len(m[8])
        txt = ' '.join(l.strip() for l in blk[m.end():].strip().splitlines() if l.strip())
        txt = re.sub(r'<[^>]+>', '', txt).strip()
        if txt: out.append((round(a, 3), round(b, 3), txt))
    return sorted(out)


def find_srt(video, work=None):
    """그 영상의 자막 파일 — ①영상이름.srt(영상 옆) ②영상 폴더/자막.srt ③작업 폴더/자막.srt · 없으면 None"""
    vid = os.path.abspath(video); d = os.path.dirname(vid); stem = os.path.splitext(os.path.basename(vid))[0]
    for c in [os.path.join(d, stem + '.srt'), os.path.join(d, stem + '.vtt'), os.path.join(d, '자막.srt'),
              os.path.join(os.path.abspath(work), '자막.srt') if work else None]:
        if c and os.path.isfile(c): return c
    return None


def cues_ok(cues, dur):
    """자막이 이 영상 것인지 — 마지막 줄이 영상 끝보다 2초 넘게 뒤면 다른 영상(원본 시각) 자막으로 본다"""
    return bool(cues) and (not dur or cues[-1][1] <= dur + 2.0)


def viewer(video, work=None, srt=None):
    """구운 영상 → 피드백뷰어.html (작업 폴더 · 영상은 상대 경로로) — 경로를 돌려준다. 메모는 브라우저에 영상 이름별로 남는다
    ★자막이 있으면 대사 줄을 뷰어 안에 심는다(크롬 file:// 은 옆 파일을 못 읽어서) — srt 를 주지 않으면 find_srt 로 찾는다.
      영상 길이와 안 맞는 자막(원본 시각 · 다른 영상)은 넣지 않고 알린다. 뷰어의 «자막 열기»로 나중에 직접 넣어도 된다"""
    vid = os.path.abspath(video); work = os.path.abspath(work or os.path.dirname(os.path.dirname(vid)))
    rel = os.path.relpath(vid, work).replace(os.sep, '/')
    tpl = open(TEMPLATE, encoding='utf-8').read()
    out = tpl.replace("'__VIDEO__'", json.dumps(rel, ensure_ascii=False).replace('"', "'")).replace("'__FPS__'", f"'{fps_of(vid)}'")
    sp = srt or find_srt(vid, work); cues = []
    if sp:
        try:
            cues = read_srt(sp)
            if not cues_ok(cues, dur_of(vid)):
                print(f'(자막 {os.path.basename(sp)} 은 이 영상 길이와 안 맞아 뷰어에 넣지 않았어요 — 원본 시각 자막이면 굽은 영상 시각으로 다시 뽑아 주세요)')
                cues = []
        except Exception as ex:
            print('(자막 못 읽음:', ex, ')'); cues = []
    data = json.dumps([[a, b, t] for a, b, t in cues], ensure_ascii=False).replace('</', '<\\/')
    out = out.replace('/*CUES*/[]/*END*/', data)
    dst = os.path.join(work, '피드백뷰어.html'); open(dst, 'w', encoding='utf-8').write(out)
    if cues: print(f'(피드백 뷰어에 대사 {len(cues)}줄 — {os.path.basename(sp)})')
    return dst


def tc(t, fps=30):
    """초 → 분:초:프레임 (뷰어와 같은 표기)"""
    f = int(round(t * fps)); s, fr = divmod(f, int(round(fps))); m, s = divmod(s, 60)
    return f'{m:02d}:{s:02d}:{fr:02d}'


def sec(s, fps=30):
    """«01:23» · «01:23:10»(분:초:프레임) · «83.5» → 초"""
    s = s.strip(); p = s.split(':')
    if len(p) == 1: return float(p[0])
    if len(p) == 2: return int(p[0]) * 60 + float(p[1])
    return int(p[0]) * 60 + int(p[1]) + int(p[2]) / fps


def parse(text, fps=30):
    """뷰어 «목록 복사» 글 → [{n, a, b, kind, pos, memo, line}] (b 는 범위일 때만 · line = 그때 대사 「…」 · 자막이 있을 때만)"""
    out = []; cur = None
    for ln in text.splitlines():
        m = re.match(r'\s*(\d+)\.\s+([\d:.]+)(?:\s*~\s*([\d:.]+))?\s*·\s*([^·]+?)(?:\s*·\s*화면 위치\s*\(가로\s*([\d.]+)%,\s*세로\s*([\d.]+)%\))?\s*$', ln)
        if m:
            cur = dict(n=int(m[1]), a=sec(m[2], fps), b=sec(m[3], fps) if m[3] else None, kind=m[4].strip(),
                       pos=(float(m[5]), float(m[6])) if m[5] else None, memo='', line=''); out.append(cur)
        elif cur is not None and re.match(r'\s*대사\s*[:：]', ln):
            cur['line'] = re.sub(r'^\s*대사\s*[:：]\s*', '', ln).strip()
        elif cur is not None and ln.strip():
            cur['memo'] = (cur['memo'] + ' ' + ln.strip()).strip()
    return out


def _grab(video, t, w):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{max(0.0, t):.3f}', '-i', video, '-frames:v', '1', '-vf', f'scale={w}:-2',
                        '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True)
    import io
    return Image.open(io.BytesIO(r.stdout)).convert('RGB') if r.stdout else None


def sheet(video, times, out_dir, span=1.0, step=0.25, w=240, pos=None, name='시트'):
    """시각마다 [t-span, t+span] 를 step 간격으로 한 줄 — 가운데(짚은 시각) 칸은 노란 테두리 · pos=(가로%, 세로%) 면 그 자리에 원
    → out_dir/<name>.jpg 경로"""
    os.makedirs(out_dir, exist_ok=True); fps = fps_of(video); D = dur_of(video)
    f = ImageFont.truetype(FONT, 18); rows = []
    for t in times:
        ts = [round(t + k * step, 3) for k in range(-int(span / step), int(span / step) + 1)]
        ims = []
        for x in ts:
            im = _grab(video, min(max(0, x), max(0, D - 0.05)), w)
            if im is None: continue
            d = ImageDraw.Draw(im); hit = abs(x - t) < step / 2
            if hit: d.rectangle([0, 0, im.width - 1, im.height - 1], outline=(255, 214, 64), width=5)
            if hit and pos: cx, cy = im.width * pos[0] / 100, im.height * pos[1] / 100; d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], outline=(255, 214, 64), width=4)
            d.rectangle([0, im.height - 26, im.width, im.height], fill=(0, 0, 0)); d.text((6, im.height - 24), tc(x, fps), font=f, fill=(255, 255, 255))
            ims.append(im)
        if ims: rows.append(ims)
    if not rows: return None
    cw, ch = rows[0][0].size; ncol = max(len(r) for r in rows)
    S = Image.new('RGB', (ncol * (cw + 6), len(rows) * (ch + 6)), (30, 30, 30))
    for i, r in enumerate(rows):
        for j, im in enumerate(r): S.paste(im, (j * (cw + 6), i * (ch + 6)))
    p = os.path.join(out_dir, name + '.jpg'); S.save(p, quality=85); return p


def loud(src, a, b, step=0.25):
    """[(초, dB)] — 영상이면 소리를 뽑아서 · 외침 · 박수 · 대사 시작은 크게 튄 자리"""
    sr = 16000
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(max(0, a)), '-i', src, '-t', str(b - a), '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'],
                       capture_output=True)
    x = np.frombuffer(r.stdout, '<i2').astype(np.float32) / 32768; out = []
    for k in range(int((b - a) / step)):
        s = x[int(k * step * sr):int((k + 1) * step * sr)]
        if len(s): out.append((round(a + k * step, 2), round(float(20 * np.log10(np.sqrt((s ** 2).mean()) + 1e-9)), 1)))
    return out


def loud_text(rows):
    """소리 크기 표 → 막대 글 (눈으로 튄 자리 찾기)"""
    return '\n'.join(f'{t:7.2f}  {db:6.1f}  ' + '#' * max(0, int(40 + db)) for t, db in rows)
