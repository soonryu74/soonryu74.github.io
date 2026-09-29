"""라디오 칼럼(극동방송 1분 칼럼 등) → '3분 미라클'형 쇼츠(9:16) · 가로 모아보기(16:9).

얼굴 화면이 없는 음성 방송용.
  · 방송 음원을 그대로 쓴다 (배경음악이 이미 깔려 있으므로 음악을 더 넣지 않는다)
  · 앞의 방송 로고송·소개는 잘라 내고, 첫 문장부터 시작 (start 초)
  · 말하는 내용에 맞는 사진이 장면마다 바뀜 — 장면은 원고에서 직접 정한다
  · 쇼츠: 위쪽에 3분 미라클 썸네일 같은 제목 틀이 계속 떠 있고, 가운데 아래에 큰 자막
  · 인물 사진은 쓰지 않는다 (화자는 이름 글자로만)

episode = {
  "key": "0824", "audio": "...wav", "start": 12.3, "end": 0 (0 = 끝까지),
  "rows": ["일은 저주다?", "아닙니다"],             # 제목 두 줄 (둘째 줄 노랑)
  "speaker": "오정현 총장",
  "scenes": [{"lines": ["문장", …], "prompt": "영어 장면 설명"}, …],
}
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from . import layout, media, miracle, series, sfx, shorts, transcribe
from .miracle import _f, _wrap_rich, auto_highlight
from .thumbs import _draw_rich, fit_cover_faces, parse_rich

YELLOW = (255, 204, 0)
GOLD = (236, 200, 120)
BLUE = (140, 200, 255)
# 사람·손은 아예 그리지 않는다 — 무료 그림 서비스는 손가락·몸을 자주 망가뜨린다
PHOTO_STYLE = ("ultra detailed realistic photograph, 8k, sharp focus, natural light, cinematic, shallow depth of field, "
               "no people, no hands, no faces, no body parts, no text, no watermark, no logo")


# ── 음원 ───────────────────────────────────────────────────
def cut_audio(src: str, out: Path, start: float, end: float = 0.0, fade: float = 1.2) -> Path:
    """방송 음원에서 본문만 잘라 낸다. 끝을 자르면 음악이 뚝 끊기지 않게 서서히 줄인다."""
    out.parent.mkdir(parents=True, exist_ok=True)
    total = media.duration(src)
    end = end or total
    dur = end - start
    af = f"afade=t=in:st=0:d=0.25,afade=t=out:st={max(0.0, dur - fade):.2f}:d={fade}"
    media.run(["-ss", f"{start:.2f}", "-t", f"{dur:.2f}", "-i", src, "-af", af, "-ar", "48000", "-ac", "2",
               str(out)])
    return out


def timeline(ep: dict, voice: Path, work: Path, cfg: dict) -> list[dict]:
    """원고 문장별 시간 → 장면별 시작·끝 · 문장별 자막 시간."""
    lines = [ln for sc in ep["scenes"] for ln in sc["lines"]]
    tcfg = dict(cfg.get("transcribe", {}))
    tcfg.setdefault("model", "medium")
    srt = work / "자막.srt"
    if srt.exists():
        cues = transcribe.read_srt(srt)
        print("  자막.srt 사용 (고친 내용 반영)")
    else:
        cues = transcribe.transcribe(voice, tcfg, "\n".join(lines), work / "transcript.json")
        from .assemble import write_srt
        write_srt(cues, srt)
    if len(cues) != len(lines):
        raise SystemExit(f"자막 {len(cues)}줄 ≠ 원고 {len(lines)}줄 — 원고 한 줄에 문장 하나씩 적어 주세요.")
    total = media.duration(str(voice))
    out, k = [], 0
    for i, sc in enumerate(ep["scenes"]):
        n = len(sc["lines"])
        cs = cues[k:k + n]
        k += n
        out.append({"i": i, "prompt": sc["prompt"], "cues": cs, "start": 0.0 if i == 0 else cs[0][0] - 0.15})
    for i, s in enumerate(out):
        s["end"] = out[i + 1]["start"] if i + 1 < len(out) else total
    return out


# ── 사진 ───────────────────────────────────────────────────
def photo(prompt: str, out: Path, size: tuple[int, int], cfg: dict) -> Path | None:
    """장면 사진 (무료 pollinations, 받아 둔 것은 다시 쓴다)."""
    import hashlib
    import time
    import urllib.parse

    import requests
    if out.exists() and out.stat().st_size > 5000:
        return out
    full = f"{prompt}, {PHOTO_STYLE}"
    seed = int(hashlib.md5(prompt.encode()).hexdigest()[:6], 16)
    big = (int(size[0] * 4 / 3), int(size[1] * 4 / 3))  # 크게 받아서 줄이면 더 또렷하다
    for sz in (big, size):
        url = ("https://image.pollinations.ai/prompt/" + urllib.parse.quote(full)
               + f"?width={sz[0]}&height={sz[1]}&model=flux&enhance=true&nologo=true&seed={seed}")
        for k in range(3):
            try:
                r = requests.get(url, timeout=240)
                if r.status_code == 200 and r.headers.get("content-type", "").startswith("image"):
                    out.parent.mkdir(parents=True, exist_ok=True)
                    out.write_bytes(r.content)
                    return out
            except Exception:
                pass
            time.sleep(6 * (k + 1))
    return None


# ── 글자 그림 ─────────────────────────────────────────────
def _rows(img: Image.Image, rows: list[str], fonts: dict, cx: float, y: float, max_w: int, pt: int) -> float:
    """제목 두 줄: 첫 줄 흰색, 둘째 줄 노랑 (3분 미라클 썸네일처럼). *별표* 단어는 노랑."""
    f = _f(fonts["bold"], pt)
    while pt > 40 and max(f.getlength(r.replace("*", "")) for r in rows) > max_w:
        pt -= 4
        f = _f(fonts["bold"], pt)
    for j, r in enumerate(rows):
        segs = [(r.replace("*", ""), True)] if j == 1 and "*" not in r else parse_rich(r)
        _draw_rich(img, cx, y, segs, f, (255, 255, 255), YELLOW, max(3, pt // 22), "center")
        y += pt * 1.18
    return y


def _hand(img: Image.Image, text: str, fonts: dict, cx: float, y: float, pt: int) -> None:
    """작은 손글씨 부제 (예: 성경 구절)."""
    if not text:
        return
    f = _f(fonts["hand"], pt)
    d = ImageDraw.Draw(img)
    d.text((cx + 2, y + 3), text, font=f, fill=(0, 0, 0, 160), anchor="ma")
    d.text((cx, y), text, font=f, fill=(255, 236, 190, 255), anchor="ma")


def _frame(d: ImageDraw.ImageDraw, box, width: int = 4):
    d.rounded_rectangle(box, radius=26, outline=(255, 255, 255, 235), width=width)


def _corner_labels(img, fonts, W, series_label, top_right, margin, scale=1.0, pad: float = 26):
    """왼쪽 위 시리즈 이름 · 오른쪽 위 채널·화자. pad: 테두리에서 띄우는 여백(px, scale 전)."""
    sf = _f(fonts["bold"], int(38 * scale))  # 굵은 고딕, 흰색 — 오른쪽 글자와 같은 크기
    lx, ly = margin + (pad + 8) * scale, margin + pad * scale
    d = ImageDraw.Draw(img)
    d.text((lx, ly), series_label, font=sf, fill=(255, 255, 255), stroke_width=max(2, int(2 * scale)),
           stroke_fill=(0, 0, 0))
    if top_right:
        a, b = (top_right + [""])[:2]
        rf1, rf2 = _f(fonts["subtitle"], int(38 * scale)), _f(fonts["subtitle"], int(34 * scale))
        x = W - margin - (pad + 8) * scale
        d.text((x, margin + pad * scale), a, font=rf1, fill=BLUE, anchor="ra", stroke_width=2, stroke_fill=(0, 0, 0))
        if b:
            d.text((x, margin + pad * scale + rf1.size * 1.35), b, font=rf2, fill=(255, 255, 255), anchor="ra",
                   stroke_width=2, stroke_fill=(0, 0, 0))


def header_png(out: Path, rows: list[str], fonts: dict, series_label: str, top_right: list[str],
               hand: str = "") -> Path:
    """쇼츠 처음 몇 초 위쪽에 뜨는 제목 틀 (1080×1920 투명)."""
    W, H = 1080, 1920
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = Image.linear_gradient("L").resize((W, 760)).transpose(Image.FLIP_TOP_BOTTOM)
    shade = Image.new("RGBA", (W, 760), (0, 0, 0, 255))
    shade.putalpha(g.point(lambda v: int(v * 0.78)))
    img.alpha_composite(shade)
    d = ImageDraw.Draw(img)
    _frame(d, (28, 28, W - 28, 600), 4)
    _corner_labels(img, fonts, W, series_label, top_right, 28, 0.95)
    y = _rows(img, rows, fonts, W / 2, 230, W - 130, 118)
    _hand(img, hand, fonts, W / 2, y + 10, 62)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    return out


def small_bug(out: Path, series_label: str, top_right: list[str], fonts: dict) -> Path:
    """제목 틀이 사라진 뒤 위쪽 구석에 남는 작은 표시."""
    W, H = 1080, 1920
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    _corner_labels(img, fonts, W, series_label, top_right, 28, 0.95)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    return out


def caption_short(out: Path, text: str, fonts: dict, top: int = 1220) -> Path:
    """쇼츠 자막: 상자 없이 흰 굵은 글씨 + 핵심어 노랑, 위아래로 옅어지는 그늘."""
    W, H = 1080, 1920
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = _f(fonts["bold"], 68)
    lines = _wrap_rich(auto_highlight(text), f, int(W * 0.86))[:3]
    lh = 90
    block = lh * len(lines)
    g0, g1 = top - 80, top + block + 70
    col = Image.new("L", (1, g1 - g0))
    for yy in range(g1 - g0):
        k = 1 - abs((yy / max(1, g1 - g0 - 1)) * 2 - 1)
        col.putpixel((0, yy), int(150 * min(1.0, k * 1.8)))
    img.paste((0, 0, 0, 255), (0, g0, W, g1), col.resize((W, g1 - g0)))
    y = top
    for ln in lines:
        _draw_rich(img, W / 2, y, ln, f, (255, 255, 255), YELLOW, 4, "center")
        y += lh
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    return out


def cover(out: Path, bg: Path | None, rows: list[str], fonts: dict, series_label: str, top_right: list[str],
          size=(1280, 720), hand: str = "", title_pt: int = 0) -> Path:
    """3분 미라클형 표지·썸네일: 사진 + 흰 둥근 테두리 + 왼쪽 위 시리즈 이름 + 오른쪽 위 두 줄 + 가운데 큰 제목."""
    W, H = size
    base = fit_cover_faces(Image.open(bg), size).convert("RGBA") if bg and Path(bg).exists() else \
        Image.new("RGBA", size, (40, 44, 52, 255))
    base = base.filter(ImageFilter.GaussianBlur(1.2))
    dark = Image.new("RGBA", size, (0, 0, 0, 105))
    base.alpha_composite(dark)
    d = ImageDraw.Draw(base)
    m = int(min(W, H) * 0.05)
    s = min(W, H) / 720
    _frame(d, (m, m, W - m, H - m), max(3, int(4 * s)))
    _corner_labels(base, fonts, W, series_label, top_right, m, s, pad=58)  # 위쪽에 숨통이 트이게
    # 제목 크기: 기본 117 (1280 기준). 편마다 title_pt 로 정할 수 있고, 폭에 안 맞으면 줄어든다
    pt = int((title_pt or (117 if W > H else 100)) * s)
    rows_h = pt * 1.18 * len(rows)
    y = _rows(base, rows, fonts, W / 2, (H - rows_h) / 2 + (0 if W > H else -H * 0.04), int(W * 0.84), pt)
    _hand(base, hand, fonts, W / 2, y + 10 * s, int(40 * s))
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=93)
    return out


# ── 만들기 ─────────────────────────────────────────────────
def make_short(ep: dict, work: Path, cfg: dict, fonts: dict, series_label: str = "1분 칼럼",
               top_right_a: str = "극동방송 × SaGA") -> dict:
    """쇼츠 한 편 + 세로 표지 + 가로 썸네일."""
    work.mkdir(parents=True, exist_ok=True)
    voice = cut_audio(ep["audio"], work / "voice.wav", ep["start"], ep.get("end", 0.0))
    total = media.duration(str(voice))
    sc = timeline(ep, voice, work, cfg)
    top_right = [top_right_a, ep["speaker"]]
    parts = []
    for s in sc:
        bg = photo(s["prompt"], work / "bg" / f"v{s['i']:02d}.jpg", (1080, 1920), cfg)
        s["bg"] = str(bg) if bg else ""
        parts.append(shorts.piece(work / "parts" / f"p{s['i']:02d}.mp4", "shorts", str(bg or sc[0].get("bg")),
                                  s["end"] - s["start"], zoom=True))
    S = series.get("column")
    OUTRO = 2.5
    end_card = layout.outro(work / "bg" / "outro", "shorts", fonts, series.brand(cfg), S["theme"],
                            "당신의 일터도\n*선교지*입니다")
    parts.append(shorts.piece(work / "parts" / "p99.mp4", "shorts", str(end_card), OUTRO, zoom=False))
    base = shorts.join(parts, work / "parts" / "base.mp4")
    # 제목은 표지(맨 앞 0.6초)에만. 본편에는 위쪽 구석의 작은 표시만 (제목을 줄여서 다시 얹으면 어색해요)
    ov = [(small_bug(work / "ov" / "bug.png", series_label, top_right, fonts), 0.0, total)]
    starts = [c[0] for s in sc for c in s["cues"]] + [total]
    k = 0
    for s in sc:
        for j, (a, b, t) in enumerate(s["cues"]):
            k += 1  # 다음 자막이 뜨기 전에 내린다 (두 줄이 겹치지 않게)
            end = min(b + 0.25, starts[k] - 0.02, total)
            steps = caption_steps(t, fonts, wide=False)
            ts = step_times(a, b, steps) + [end]
            for m, txt in enumerate(steps):
                ov.append((caption_short(work / "ov" / f"c{s['i']:02d}_{j}_{m}.png", txt, fonts), ts[m], ts[m + 1]))
    raw = work / f"{ep['key']}_쇼츠_본편.mp4"
    shorts.finish(base, raw, ov, audio=str(voice), sfx=[(str(sfx.ding(work / "sfx" / "ding.wav")), total + 0.1, 0.4)],
                  duck=False)
    first_bg = Path(sc[0]["bg"]) if sc[0].get("bg") else None
    cov_v = cover(work / f"{ep['key']}_표지_세로.jpg", first_bg, ep["rows"], fonts, series_label, top_right, (1080, 1920),
                  ep.get("hand", ""))
    out = shorts.with_cover(raw, cov_v, work / f"{ep['key']}_쇼츠.mp4")
    thumb_bg = photo(sc[min(1, len(sc) - 1)]["prompt"], work / "bg" / "thumb_h.jpg", (1280, 720), cfg)
    th = cover(work / f"{ep['key']}_썸네일_가로.jpg", thumb_bg, ep["rows"], fonts, series_label, top_right,
               hand=ep.get("hand", ""))
    (work / "scenes.json").write_text(json.dumps(sc, ensure_ascii=False, indent=1), encoding="utf-8")
    return {"short": out, "cover": cov_v, "thumb": th, "voice": voice, "scenes": sc}


def make_compilation(eps: list[dict], works: list[Path], out_dir: Path, cfg: dict, fonts: dict, rows: list[str],
                     series_label: str = "1분 칼럼", bug: str = "극동방송 1분 칼럼 × SaGA") -> dict:
    """쇼츠로 만든 편들을 16:9 모아보기 한 편으로 (편마다 3초 제목 화면)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    parts, ov, t = [], [], 0.0
    voices = []
    CH = 3.0
    for ep, work in zip(eps, works):
        sc = json.loads((work / "scenes.json").read_text(encoding="utf-8"))
        voice = work / "voice.wav"
        total = media.duration(str(voice))
        bgs = [photo(s["prompt"], work / "bg" / f"h{s['i']:02d}.jpg", (1920, 1080), cfg) for s in sc]
        ch = cover(out_dir / "ch" / f"{ep['key']}.jpg", bgs[0], ep["rows"], fonts, series_label,
                   ["극동방송 × SaGA", ep["speaker"]], (1920, 1080), ep.get("hand", ""))
        parts.append(shorts.piece(out_dir / "parts" / f"{ep['key']}_ch.mp4", "long", str(ch), CH, zoom=True))
        voices.append((None, CH))
        t += CH
        for s, bg in zip(sc, bgs):
            parts.append(shorts.piece(out_dir / "parts" / f"{ep['key']}_{s['i']:02d}.mp4", "long", str(bg or bgs[0]),
                                      s["end"] - s["start"], zoom=True))
        ov.append((miracle.bug_png(out_dir / "ov" / "bug.png", bug, fonts), t, t + total))
        starts = [c[0] for s in sc for c in s["cues"]] + [total]
        k = 0
        for s in sc:
            for j, (a, b, txt) in enumerate(s["cues"]):
                k += 1
                png = miracle.caption_png(out_dir / "ov" / f"{ep['key']}_{s['i']:02d}_{j}.png", auto_highlight(txt), "",
                                          fonts, None, j)
                ov.append((png, t + a, t + min(b + 0.25, starts[k] - 0.02, total)))
        voices.append((voice, total))
        t += total
    S = series.get("column")
    OUTRO = 4.0
    end_card = layout.outro(out_dir / "outro", "long", fonts, series.brand(cfg), S["theme"], "당신의 일터도\n*선교지*입니다")
    parts.append(shorts.piece(out_dir / "parts" / "zz_outro.mp4", "long", str(end_card), OUTRO, zoom=False))
    base = shorts.join(parts, out_dir / "parts" / "base.mp4")
    # 소리: 제목 화면은 무음, 편마다 방송 음원
    lst = []
    for v, d in voices:
        if v is None:
            sil = out_dir / "parts" / f"sil_{d:.1f}.wav"
            if not sil.exists():
                media.run(["-f", "lavfi", "-t", f"{d:.3f}", "-i", "anullsrc=r=48000:cl=stereo", str(sil)])
            lst.append(sil)
        else:
            lst.append(v)
    audio = out_dir / "parts" / "audio.wav"
    txt = out_dir / "parts" / "audio.txt"
    txt.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in lst), encoding="utf-8")
    media.run(["-f", "concat", "-safe", "0", "-i", str(txt), "-ar", "48000", "-ac", "2", str(audio)])
    out = out_dir / "1분칼럼_모아보기.mp4"
    shorts.finish(base, out, ov, audio=str(audio), duck=False)
    return {"video": out}


# ── 자막을 줄 단위로 자연스럽게 ──────────────────────────────
def _rich_text(segs) -> str:
    return "".join(f"*{t}*" if h else t for t, h in segs)


def caption_steps(text: str, fonts: dict, wide: bool) -> list[str]:
    """두 줄 자막이면 [첫 줄, 첫 줄+둘째 줄] — 말이 둘째 줄에 닿을 때 둘째 줄이 나타나게 쓴다."""
    text = auto_highlight(text)
    if wide:
        lines = _wrap_rich(text, _f(fonts["bold"], 64), int(1920 * 0.74))[:2]
    else:
        lines = _wrap_rich(text, _f(fonts["bold"], 68), int(1080 * 0.86))[:3]
    rows = [_rich_text(ln).strip() for ln in lines]
    return [" ".join(rows[:i + 1]) for i in range(len(rows))] if len(rows) > 1 else [text]


def step_times(a: float, b: float, steps: list[str], gap: float = 0.35) -> list[float]:
    """각 줄이 나타나는 시각: 윗줄 다음 gap 초 뒤에 아랫줄 (글자 비율로 나누면 짧은 아랫줄이 끝에 잠깐만 떠서 읽기 어렵다)."""
    out = [a]
    for k in range(1, len(steps)):
        out.append(min(out[-1] + gap, b - 0.2))
    return out


def wide_caption_parts(out_dir: Path, name: str, text: str, fonts: dict, accent_i: int) -> tuple[Path, list[Path]]:
    """가로 자막을 '그늘 한 장 + 줄마다 한 장'으로 나눠 그린다.
    줄이 하나씩 나타나도 이미 뜬 줄은 그대로 있고(다시 깜빡이지 않고) 새 줄만 서서히 나타나게 하기 위해서."""
    W, H = 1920, 1080
    acc = [(255, 225, 60), (92, 242, 200)][accent_i % 2]
    f = _f(fonts["bold"], 64)
    lines = _wrap_rich(auto_highlight(text), f, int(W * 0.74))[:2]
    line_h = 84
    block = line_h * len(lines)
    y0 = H - 40 - block
    out_dir.mkdir(parents=True, exist_ok=True)
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g0, g1 = max(0, y0 - 90), min(H, y0 + block + 70)
    col = Image.new("L", (1, g1 - g0))
    for yy in range(g1 - g0):
        k = 1 - abs((yy / max(1, g1 - g0 - 1)) * 2 - 1)
        col.putpixel((0, yy), int(130 * min(1.0, k * 1.8)))
    shade.paste((0, 0, 0, 255), (0, g0, W, g1), col.resize((W, g1 - g0)))
    sp = out_dir / f"{name}_shade.png"
    shade.save(sp)
    outs = []
    for i, ln in enumerate(lines):
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        _draw_rich(img, W / 2, y0 + i * line_h, ln, f, (255, 255, 255), acc, 4, "center")
        lp = out_dir / f"{name}_l{i}.png"
        img.save(lp)
        outs.append(lp)
    return sp, outs


def make_wide(ep: dict, work: Path, cfg: dict, fonts: dict, series_label: str = "1분 칼럼",
              top_right_a: str = "극동방송 × SaGA") -> dict:
    """16:9 가로 한 편: 표지(0.6초) → 장면 사진 + 3분 미라클식 자막 → 마무리."""
    work.mkdir(parents=True, exist_ok=True)
    voice = cut_audio(ep["audio"], work / "voice.wav", ep["start"], ep.get("end", 0.0))
    total = media.duration(str(voice))
    sc = timeline(ep, voice, work, cfg)
    top_right = [top_right_a, ep["speaker"]]
    XF = 0.4  # 사진이 겹치며 바뀌는 시간
    parts = []
    for s in sc:
        bg = photo(s["prompt"], work / "bg" / f"h{s['i']:02d}.jpg", (1920, 1080), cfg)
        s["bg_h"] = str(bg) if bg else ""
        pc = work / "parts" / f"w{s['i']:02d}.mp4"
        dur = s["end"] - s["start"] + XF
        if not (pc.exists() and abs(media.duration(str(pc)) - dur) < 0.2):  # 사진·길이가 같으면 다시 만들지 않는다
            shorts.piece(pc, "long", str(bg or sc[0].get("bg_h")), dur, zoom=True)
        parts.append(pc)
    S = series.get("column")
    OUTRO = 5.0
    # 마지막 화면: 딥 인디고(위) → 테라코타(아래) 그라데이션 — 직전 노을 도시 장면에서 자연스럽게 이어진다
    end_theme = dict(S["theme"], c1="#1E1B2E", c2="#8A4B3F")
    end_card = layout.outro(work / "bg" / "outro_w", "long", fonts, series.brand(cfg), end_theme,
                            "당신의 일터도\n*선교지*입니다")
    parts.append(shorts.piece(work / "parts" / "w99.mp4", "long", str(end_card), OUTRO, zoom=False))
    base = work / "parts" / "base_w.mp4"
    if not (base.exists() and abs(media.duration(str(base)) - (total + OUTRO)) < 0.3):
        shorts.join_xfade(parts, base, XF)
    ov = [(miracle.bug_png(work / "ov" / "bug_w.png", f"{series_label}  ·  {top_right_a}", fonts), 0.0, total)]
    starts = [c[0] for s in sc for c in s["cues"]] + [total]
    k = 0
    for s in sc:
        for j, (a, b, t) in enumerate(s["cues"]):
            k += 1
            end = min(b + 0.25, starts[k] - 0.02, total)
            shade, lines = wide_caption_parts(work / "ov", f"w{s['i']:02d}_{j}", t, fonts, j)
            ov.append((shade, a, end))
            for png in lines:  # 두 줄이 함께 서서히 나타난다 (줄을 따로 띄우지 않는다)
                ov.append((png, a, end))
    raw = work / f"{ep['key']}_가로_본편.mp4"
    shorts.finish(base, raw, ov, audio=str(voice), duck=False, fade=0.35, rise=14)  # 끝 효과음 없음, 자막은 서서히
    ci = ep.get("cover_scene", 0)  # 표지 사진: 편마다 다른 장면을 고른다 (첫 장면이 같은 편이 여럿이라)
    first = Path(sc[ci]["bg_h"]) if sc[ci].get("bg_h") else None
    cov = cover(work / f"{ep['key']}_표지_가로.jpg", first, ep["rows"], fonts, series_label, top_right, (1920, 1080),
                ep.get("hand", ""), ep.get("title_pt", 0))
    out = shorts.with_cover(raw, cov, work / f"{ep['key']}_가로.mp4")
    (work / "scenes_w.json").write_text(json.dumps(sc, ensure_ascii=False, indent=1), encoding="utf-8")
    return {"video": out, "cover": cov, "scenes": sc}
