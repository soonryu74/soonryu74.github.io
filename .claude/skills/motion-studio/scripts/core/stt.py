"""받아쓰기 — 영상 · 녹음의 말을 글로 (reference/transcribe.md)

  transcribe(영상 또는 wav)   → {'segments': [말 구간 {a, b, text}], 'lines': [자막 줄 {a, b, text, fixed}]}
  save(결과, 폴더)            → 받아쓰기.json + 확인표.md  (★ 확인표를 유저에게 보이고 고친 글을 받은 뒤에만 쓴다)
  apply_table(json, 확인표.md) → 확인표의 «고친 글» 칸을 json 에 옮긴다
  final_lines(json)           → [(a, b, 글)] — 고친 글이 있으면 그것
  burn(영상, json, 출력)       → 자막을 얹은 영상 (ffmpeg · ASS) · draw(img, lines, t, style) → 장면 코드 안에서 자막 그리기
  speech_spans(wav)           → [(a, b)] 말하는 구간 (나레이션 문장 시작 시각 · 컷 편집의 «말 끊긴 곳»)

모델 = Whisper turbo (sherpa-onnx · int8 · 약 560MB) + 말 구간 찾기(silero VAD) — 스킬에 넣지 않는다(용량).
처음 한 번 받는다: python3 <스킬>/scripts/transcribe.py --fetch  (또는 check.py --fix --asr)
찾는 곳: 환경변수 MOTION_ASR → 작업 폴더 asr/ → ~/.cache/motion-studio/asr
Claude 는 소리를 직접 듣지 못한다 — 받아쓴 글은 늘 «짐작»이다. 확인표 없이 자막 · 근거로 쓰지 않는다.
"""
import json
import os
import re
import subprocess
import tarfile
import urllib.request

import numpy as np

SR = 16000
MODEL = 'sherpa-onnx-whisper-turbo'
SOURCES = {   # 받는 곳 (앞이 먼저 · 막히면 다음)
    MODEL + '.tar.bz2': ['https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-turbo.tar.bz2'],
    'silero_vad.onnx': ['https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx'],
}
GUIDE = f"""받아쓰기 모델(Whisper turbo · 약 560MB)이 없어요 — 처음 한 번만 받으면 됩니다.
  1) python3 <스킬>/scripts/transcribe.py --fetch   (pip install sherpa-onnx 도 필요)
  2) 수동이면: {SOURCES[MODEL + '.tar.bz2'][0]} 와 {SOURCES['silero_vad.onnx'][0]} 를 받아
     ~/.cache/motion-studio/asr/ 에 풀어 둔다 (다른 곳이면 환경변수 MOTION_ASR=<폴더>)"""


# ── 모델 ─────────────────────────────────────────
def model_dir():
    for d in [os.environ.get('MOTION_ASR'), os.path.join(os.getcwd(), 'asr'), os.path.expanduser('~/.cache/motion-studio/asr')]:
        if d and os.path.isfile(os.path.join(d, MODEL, 'turbo-encoder.int8.onnx')) and os.path.isfile(os.path.join(d, 'silero_vad.onnx')):
            return d
    return None


def fetch(dst=None):
    """모델 받기 — 이미 있으면 그대로. 성공하면 폴더 경로"""
    if model_dir(): return model_dir()
    dst = dst or os.environ.get('MOTION_ASR') or os.path.expanduser('~/.cache/motion-studio/asr'); os.makedirs(dst, exist_ok=True)
    for name, urls in SOURCES.items():
        out = os.path.join(dst, name)
        if name.endswith('.tar.bz2') and os.path.isdir(os.path.join(dst, MODEL)): continue
        if os.path.isfile(out) and not name.endswith('.tar.bz2'): continue
        for u in urls:
            try:
                print(f'  받는 중: {name} …', flush=True); urllib.request.urlretrieve(u, out); break
            except Exception as ex:
                print(f'  ✗ {u} — {ex}')
        else:
            raise SystemExit('⛔ ' + GUIDE)
        if name.endswith('.tar.bz2'):
            with tarfile.open(out) as tf: tf.extractall(dst, members=[m for m in tf.getmembers() if 'test_wavs' not in m.name])
            os.remove(out)
    return model_dir()


def need():
    d = model_dir()
    if not d: raise SystemExit('⛔ ' + GUIDE)
    try:
        import sherpa_onnx  # noqa: F401
    except ImportError:
        raise SystemExit('⛔ pip install sherpa-onnx  (받아쓰기 엔진)')
    return d


_REC = None


def _recognizer(lang='ko', threads=None):
    global _REC
    if _REC is None:
        import sherpa_onnx
        d = os.path.join(need(), MODEL)
        _REC = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f'{d}/turbo-encoder.int8.onnx', decoder=f'{d}/turbo-decoder.int8.onnx',
                                                          tokens=f'{d}/turbo-tokens.txt', language=lang, task='transcribe',
                                                          num_threads=threads or max(1, min(8, (os.cpu_count() or 2))))
    return _REC


# ── 소리 ─────────────────────────────────────────
def load_audio(path, a=None, b=None):
    """영상 · 녹음 → 16kHz 한 채널 float"""
    cmd = ['ffmpeg', '-v', 'error'] + (['-ss', str(a)] if a else []) + ['-i', path] + (['-t', str(b - (a or 0))] if b else []) + \
          ['-vn', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(np.float32) / 32768


def speech_spans(x_or_path, min_silence=0.35, min_speech=0.2, threshold=0.4):
    """[(a, b)] 말하는 구간 — silero VAD"""
    import sherpa_onnx
    x = load_audio(x_or_path) if isinstance(x_or_path, str) else x_or_path
    cfg = sherpa_onnx.VadModelConfig(); cfg.silero_vad.model = os.path.join(need(), 'silero_vad.onnx')
    cfg.silero_vad.min_silence_duration = min_silence; cfg.silero_vad.min_speech_duration = min_speech
    cfg.silero_vad.threshold = threshold; cfg.sample_rate = SR
    vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=max(60, len(x) / SR + 5)); win = cfg.silero_vad.window_size; out = []
    for i in range(0, len(x), win):
        vad.accept_waveform(x[i:i + win])
        while not vad.empty(): out.append((vad.front.start / SR, (vad.front.start + len(vad.front.samples)) / SR)); vad.pop()
    vad.flush()
    while not vad.empty(): out.append((vad.front.start / SR, (vad.front.start + len(vad.front.samples)) / SR)); vad.pop()
    return out


def _energy(x, hop=0.05):
    h = int(hop * SR); m = len(x) // h
    return 20 * np.log10(np.sqrt((x[:m * h].reshape(m, h) ** 2).mean(axis=1)) + 1e-6)


# ── 자막 줄 나누기 ────────────────────────────────
def split_lines(text, max_chars=20):
    """문장부호(. ! ?)에서 끊고, 긴 문장은 띄어쓰기에서 max_chars 안쪽으로"""
    parts = [p.strip() for p in re.split(r'(?<=[.!?。！？])\s+', text.strip()) if p.strip()]
    out = []
    for p in parts:
        while len(p) > max_chars and ' ' in p[:max_chars + 1]:
            cut = p.rfind(' ', 0, max_chars + 1); out.append(p[:cut].strip()); p = p[cut:].strip()
        if p: out.append(p)
    return out


def _time_lines(lines, a, b, en, hop=0.05, snap=0.6):
    """줄마다 시각 — 글자 수 비율로 나눈 뒤 경계를 가까운 «소리가 잦아든 곳»으로 옮긴다 (말 덩어리 하나를 줄 여럿으로)"""
    w = [max(1, len(re.sub(r'\s', '', l))) for l in lines]; tot = sum(w); cuts = [a]; acc = 0
    for wi in w[:-1]:
        acc += wi; t = a + (b - a) * acc / tot
        i0, i1 = int(max(a, t - snap) / hop), int(min(b, t + snap) / hop)
        if i1 > i0 + 1:
            seg = en[i0:i1]; t = (i0 + int(np.argmin(seg))) * hop + hop / 2
        cuts.append(max(cuts[-1] + 0.4, min(t, b - 0.4)))
    cuts.append(b)
    return [(round(cuts[i], 2), round(cuts[i + 1], 2)) for i in range(len(lines))]


def _junk(t):
    return not re.search(r'[가-힣A-Za-z0-9]', t or '')


def transcribe(path, lang='ko', max_chars=20, min_silence=0.35, offset=0.0, a=None, b=None):
    """받아쓰기 — 말 구간마다 «통째로» 알아듣는다(짧게 자르면 앞뒤 말이 없어 엉망이 된다) → 자막 줄로 나누고 시각을 붙인다"""
    x = load_audio(path, a, b); en = _energy(x); rec = _recognizer(lang); segs, lines = [], []
    for sa, sb in speech_spans(x, min_silence=min_silence):
        s = rec.create_stream(); s.accept_waveform(SR, x[int(sa * SR):int(sb * SR)]); rec.decode_stream(s)
        txt = s.result.text.strip(); flag = _junk(txt) or (sb - sa) > 28
        segs.append(dict(a=round(sa + offset, 2), b=round(sb + offset, 2), text=txt, check=bool(flag)))
        if _junk(txt): continue
        ls = split_lines(txt, max_chars)
        for (la, lb), lt in zip(_time_lines(ls, sa, sb, en), ls):
            lines.append(dict(a=round(la + offset, 2), b=round(lb + offset, 2), text=lt, fixed=None))
    return dict(source=os.path.basename(path), model='whisper-turbo (sherpa-onnx)', lang=lang, segments=segs, lines=lines)


# ── 확인표 ───────────────────────────────────────
def tc(t):
    m, s = divmod(t, 60); return f'{int(m):02d}:{s:05.2f}'


def save(res, folder='.', name='받아쓰기'):
    os.makedirs(folder, exist_ok=True); jp = os.path.join(folder, name + '.json'); mp = os.path.join(folder, '확인표.md')
    json.dump(res, open(jp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    rows = ['# 받아쓰기 확인표 — ' + res.get('source', ''), '',
            '> 받아쓰기는 짐작이에요. 틀린 말은 «고친 글» 칸에 적어 주세요(맞으면 비워 두기 · 빼려면 -). 줄을 합치거나 시각을 바꾸려면 말로 알려 주세요.', '',
            '| # | 시간 | 받아쓴 글 | 고친 글 |', '|---|---|---|---|']
    for i, l in enumerate(res['lines'], 1):
        rows.append(f"| {i} | {tc(l['a'])} ~ {tc(l['b'])} | {l['text']} | {l.get('fixed') or ''} |")
    junk = [s for s in res['segments'] if s.get('check')]
    if junk: rows += ['', '말소리는 있는데 글이 안 나온 곳(웃음 · 잡음일 수 있음): ' + ' · '.join(f"{tc(s['a'])}~{tc(s['b'])}" for s in junk)]
    open(mp, 'w', encoding='utf-8').write('\n'.join(rows) + '\n')
    return jp, mp


def apply_table(json_path, md_path):
    """확인표.md 의 «고친 글» 칸 → json 의 fixed"""
    res = json.load(open(json_path, encoding='utf-8')); n = 0
    for ln in open(md_path, encoding='utf-8'):
        m = re.match(r'\|\s*(\d+)\s*\|[^|]*\|[^|]*\|\s*(.*?)\s*\|\s*$', ln)
        if m and m[2]:
            i = int(m[1]) - 1
            if 0 <= i < len(res['lines']): res['lines'][i]['fixed'] = m[2]; n += 1
    json.dump(res, open(json_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return n


def final_lines(json_path_or_res):
    res = json.load(open(json_path_or_res, encoding='utf-8')) if isinstance(json_path_or_res, str) else json_path_or_res
    return [(l['a'], l['b'], l.get('fixed') or l['text']) for l in res['lines'] if (l.get('fixed') or l['text']).strip() not in ('', '-')]


def write_srt(lines, out):
    """[(a, b, 글)] → .srt"""
    st = lambda t: f'{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round(t % 1 * 1000)) % 1000:03d}'
    open(out, 'w', encoding='utf-8').write(''.join(f'{i}\n{st(a)} --> {st(b)}\n{t}\n\n' for i, (a, b, t) in enumerate(lines, 1)))
    return out


def srt(json_path_or_res, out):
    """자막 파일(.srt) — 유튜브 올리기 · video.subtitles 로 다시 읽기 · 다른 편집기"""
    return write_srt(final_lines(json_path_or_res), out)


# ── 자막 얹기 ────────────────────────────────────
def _font_file(name='Pretendard-Bold'):
    here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    for d in [os.path.join(os.getcwd(), 'fonts'), os.path.join(here, 'assets', 'fonts')]:
        if os.path.isdir(d):
            for f in os.listdir(d):
                if f.lower().startswith(name.lower().replace(' ', '')) and f.lower().endswith(('.otf', '.ttf')): return os.path.join(d, f)
    return os.path.join(here, 'assets', 'fonts', 'Pretendard-Bold.otf')


def burn(video, json_path, out, size=None, pos='bottom', font='Pretendard-Bold', color='FFFFFF', outline=5, tag=None):
    """자막을 얹은 영상 — 화면 크기에 맞춰 글자 크기 · 아래 여백 · 테두리 (ffmpeg libass) · tag = 왼쪽 위 작은 표시(예: «자동 자막»)"""
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', video],
                       capture_output=True, text=True)
    W, H = [int(v) for v in r.stdout.strip().split(',')[:2]]
    size = size or int(min(W, H) * (0.067 if W >= H else 0.055)); mv = int(H * (0.065 if W >= H else 0.22))   # 9:16 는 아래 UI 를 피해 높이
    ff = _font_file(font); fam = 'Pretendard Bold' if 'Pretendard' in os.path.basename(ff) else os.path.splitext(os.path.basename(ff))[0]
    al = {'bottom': 2, 'top': 8, 'middle': 5}[pos]
    bgr = color[4:6] + color[2:4] + color[0:2]
    ts = lambda t: f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'
    ass = ['[Script Info]', 'ScriptType: v4.00+', f'PlayResX: {W}', f'PlayResY: {H}', '', '[V4+ Styles]',
           'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
           f'Style: Sub,{fam},{size},&H00{bgr},&H00{bgr},&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,{outline},2,{al},{int(W*0.05)},{int(W*0.05)},{mv},1',
           f'Style: Tag,{fam},{int(size*0.47)},&H0040D6FF,&H0040D6FF,&H00000000,&H96000000,0,0,0,0,100,100,0,0,3,10,0,7,40,40,36,1',
           '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
    if tag: ass.append(f'Dialogue: 0,{ts(0)},{ts(36000)},Tag,,0,0,0,,{tag}')
    for a, b, t in final_lines(json_path):
        ass.append(f'Dialogue: 1,{ts(a)},{ts(b)},Sub,,0,0,0,,{{\\fad(120,120)}}{t}')
    import tempfile; ap = os.path.join(tempfile.mkdtemp(), 'sub.ass'); open(ap, 'w', encoding='utf-8').write('\n'.join(ass) + '\n')
    fd = os.path.dirname(ff).replace(':', r'\:'); apq = ap.replace(':', r'\:').replace("'", r"\'")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-vf', f"ass='{apq}':fontsdir='{fd}'", '-c:v', 'libx264', '-preset', 'medium',
                    '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', out], check=True)
    return out


def draw(img, lines, t, size=64, y=None, color=(255, 255, 255), outline=5, font='Pretendard-Bold', fade=0.12):
    """장면 코드 안에서 자막 — lines = final_lines(...) · 지금 시각 t 의 줄을 아래 가운데에 (글꼴 · 크기 · 자리는 캔버스 «자막 판»에서 읽어 넘기는 것을 권한다)"""
    from PIL import ImageDraw, ImageFont
    cur = [l for l in lines if l[0] <= t < l[1]]
    if not cur: return img
    a, b, txt = cur[0]; al = min(1.0, (t - a) / fade, (b - t) / fade)
    f = ImageFont.truetype(_font_file(font), size); d = ImageDraw.Draw(img, 'RGBA')
    w = d.textlength(txt, font=f); x = (img.width - w) / 2; yy = y if y is not None else img.height * 0.86 - size
    d.text((x, yy), txt, font=f, fill=tuple(color) + (int(255 * al),), stroke_width=outline, stroke_fill=(0, 0, 0, int(255 * al)))
    return img
