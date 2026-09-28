"""성경 뮤지컬(수노 곡) → 가로 뮤직비디오.

수노 mp3 안의 가사(연출 표시 [Tenor Solo, John] · [Chorus - …] · [Spoken Word - Voice of God] 포함)를 읽어
  1) 받아쓰기로 가사 줄마다 노래 시간을 맞추고 (글자 정렬)
  2) 연출 표시마다 장면을 나눠 장면 그림(내 그림 폴더 > AI 그림 > 곡 표지)을 깔고
  3) 부르는 사람 꼬리표(요한 · 주의 음성 · ○○ 합창) + 가사 자막을 얹는다.
결과 폴더의 recipe.json 에서 장면 그림 설명·꼬리표·시간을 고치고 다시 실행하면 그대로 반영된다.
"""
from __future__ import annotations

import difflib
import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from . import faces, layout, media, shorts, sfx
from .thumbs import _draw_rich, fit_cover_faces, parse_rich

W, H = 1920, 1080
FMT = "long"
STYLE = ("biblical epic oil painting, dramatic chiaroscuro, warm gold and deep blue, cinematic light, "
         "first century, no text, no letters, no watermark, no depiction of Jesus' face")


def _f(path: str, pt: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, pt)


# ── 가사 읽기 ───────────────────────────────────────────────
def read_lyrics(mp3: str) -> tuple[str, str]:
    p = subprocess.run([media.ffmpeg_exe(), "-i", str(mp3), "-f", "ffmetadata", "-"], capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    meta, key, buf = {}, None, []
    for line in p.stdout.splitlines():
        if key is None and "=" in line and not line.startswith(";"):
            key, val = line.split("=", 1)
            buf = [val]
        elif key is not None:
            buf.append(line)
        if key is not None and not buf[-1].endswith("\\"):
            meta.setdefault(key.lower(), "\n".join(b[:-1] if b.endswith("\\") else b for b in buf))
            key = None
    lyr = next((v for k, v in meta.items() if k.startswith("lyrics")), "")
    return meta.get("title", Path(mp3).stem), lyr.replace("\\;", ";").replace("\\=", "=")


def speaker_of(tag: str) -> tuple[str, str]:
    """'[Tenor Solo, John, 감격하며]' → ('요한', 'john')"""
    t = tag.strip("[]")
    low = t.lower()
    if "voice of god" in low:
        return "주의 음성", "god"
    if "john" in low or "요한" in t:
        return "요한", "john"
    if low.startswith(("chorus", "finale", "full cast")):
        who = t.split("-", 1)[1] if "-" in t else t
        who = who.split(",")[0].strip()
        who = re.sub(r"\b(Grand|Crescendo)\b", "", who).strip()
        if "합창" not in who:
            who = (who + " 합창").strip()
        return who, "choir"
    return "", "music"


def parse(lyrics: str) -> list[dict]:
    """연출 표시 단위 장면 [{tag, speaker, kind, lines}]"""
    secs, cur = [], None
    for raw in lyrics.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("["):
            sp, kind = speaker_of(line)
            if kind == "music" and cur and not cur["lines"]:
                cur["tags"].append(line)
                continue
            cur = {"tags": [line], "speaker": sp, "kind": kind, "lines": []}
            secs.append(cur)
        elif cur is not None:
            cur["lines"].append(line)
        else:
            cur = {"tags": [], "speaker": "", "kind": "music", "lines": [line]}
            secs.append(cur)
    # 가사 없는 연출(쉼·잔잔히)은 다음 장면에 붙인다
    out, pend = [], []
    for s in secs:
        if not s["lines"]:
            pend += s["tags"]
            continue
        s["tags"] = pend + s["tags"]
        pend = []
        out.append(s)
    return out


# ── 노래 시간 맞추기 ─────────────────────────────────────────
def _norm(s: str) -> str:
    return re.sub(r"[^가-힣a-zA-Z0-9]", "", s)


def whisper_words(mp3: str, cache: Path, prompt: str, model: str = "small") -> list[tuple[float, float, str]]:
    if cache.exists():
        return [tuple(w) for w in json.loads(cache.read_text(encoding="utf-8"))]
    from faster_whisper import WhisperModel
    print(f"  노래 받아쓰기 중… (모델 {model}, 5분 곡에 2~4분)")
    m = WhisperModel(model, device="auto", compute_type="int8")
    segs, _ = m.transcribe(str(mp3), language="ko", vad_filter=False, word_timestamps=True,
                           initial_prompt=prompt[:800])
    words = [(w.start, w.end, w.word) for s in segs for w in (s.words or [])]
    cache.write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")
    return words


def align(lines: list[str], words: list, total: float) -> list[tuple[float, float]]:
    """가사 글자 ↔ 받아쓰기 글자를 맞춰 줄마다 (시작, 끝)."""
    wchars, wtimes = [], []
    for a, b, w in words:
        cs = _norm(w)
        for i, c in enumerate(cs):
            wchars.append(c)
            wtimes.append(a + (b - a) * (i + 0.5) / max(1, len(cs)))
    lchars, owner = [], []
    for li, ln in enumerate(lines):
        for c in _norm(ln):
            lchars.append(c)
            owner.append(li)
    sm = difflib.SequenceMatcher(None, "".join(lchars), "".join(wchars), autojunk=False)
    hit: dict[int, list[float]] = {}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            hit.setdefault(owner[a + k], []).append(wtimes[b + k])
    spans: list[tuple[float, float] | None] = []
    for li in range(len(lines)):
        ts = sorted(hit.get(li, []))
        if len(ts) >= max(2, len(_norm(lines[li])) * 0.25):
            lo, hi = ts[int(len(ts) * 0.1)], ts[int(len(ts) * 0.9) - 1 if len(ts) > 1 else 0]
            spans.append((lo, max(hi, lo + 0.8)))
        else:
            spans.append(None)
    # 못 맞춘 줄은 앞뒤 사이에 고르게
    i = 0
    while i < len(spans):
        if spans[i] is None:
            j = i
            while j < len(spans) and spans[j] is None:
                j += 1
            a = spans[i - 1][1] if i > 0 else 0.0
            b = spans[j][0] if j < len(spans) else total - 1
            step = (b - a) / (j - i + 1)
            for k in range(i, j):
                s0 = a + step * (k - i + 0.5)
                spans[k] = (s0, s0 + step * 0.9)
            i = j
        else:
            i += 1
    return [(float(a), float(b)) for a, b in spans]


# ── 그림 ────────────────────────────────────────────────────
def title_card(out: Path, series: str, ep: str, subtitle: str, cover: Path | None, fonts: dict) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    base = Image.new("RGB", (W, H), (8, 10, 22))
    if cover and Path(cover).exists():
        im = Image.open(cover).convert("RGB")
        bg = fit_cover_faces(im, (W, H)).filter(ImageFilter.GaussianBlur(26))
        base = Image.blend(bg, Image.new("RGB", (W, H), (8, 10, 22)), 0.55)
        side = int(H * 0.62)
        art = im.resize((side, side), Image.LANCZOS)
        base.paste(art, (W - side - 150, (H - side) // 2))
        ImageDraw.Draw(base).rectangle((W - side - 150, (H - side) // 2, W - 150, (H + side) // 2),
                                       outline=(214, 176, 92), width=4)
    base = base.convert("RGBA")
    d = ImageDraw.Draw(base)
    gold = (226, 190, 110)
    d.text((140, 300), series, font=_f(fonts["title"], 130), fill=gold, stroke_width=3, stroke_fill=(30, 20, 5))
    d.line((144, 470, 760, 470), fill=gold, width=3)
    d.text((140, 500), ep, font=_f(fonts["title"], 96), fill=(255, 255, 255))
    y = 630
    for row in subtitle.split("\n")[:2]:
        d.text((144, y), row, font=_f(fonts["bold"], 52), fill=(230, 232, 240))
        y += 70
    base.convert("RGB").save(out, quality=93)
    return out


SPEAKER_COLOR = {"john": (120, 190, 255), "god": (230, 190, 100), "choir": (255, 255, 255), "music": (200, 200, 200)}


def speaker_chip(out: Path, text: str, kind: str, fonts: dict) -> Path:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if text:
        f = _f(fonts["bold"], 38)
        tw = int(f.getlength(text)) + 56
        x, y = 72, 60
        col = SPEAKER_COLOR.get(kind, (255, 255, 255))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((x, y, x + tw, y + 64), 32, fill=(8, 10, 20, 170), outline=col + (255,), width=3)
        d.text((x + 28, y + 32), text, font=f, fill=col, anchor="lm")
    return layout._save(img, out)


def bug(out: Path, text: str, fonts: dict) -> Path:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = _f(fonts["title"], 40)
    ImageDraw.Draw(img).text((W - 70, 70), text, font=f, fill=(226, 190, 110, 230), anchor="ra",
                             stroke_width=2, stroke_fill=(0, 0, 0, 160))
    return layout._save(img, out)


def lyric_png(out: Path, text: str, kind: str, fonts: dict, top: int) -> Path:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = _f(fonts["title"] if kind == "choir" else fonts["bold"], 66 if kind == "choir" else 60)
    while f.size > 40 and f.getlength(text.replace("*", "")) > W * 0.84:
        f = _f(f.path, f.size - 4)
    fill = (250, 232, 180) if kind == "god" else (255, 255, 255)
    accent = (255, 214, 90)
    # 뒤 그늘
    band = Image.new("L", (W, 1), 0)
    for x in range(W):
        band.putpixel((x, 0), int(150 * max(0.0, 1 - abs(x - W / 2) / (W * 0.55))))
    sh = Image.new("RGBA", (W, 150), (0, 0, 0, 255))
    sh.putalpha(band.resize((W, 150)).filter(ImageFilter.GaussianBlur(30)))
    img.alpha_composite(sh, (0, max(0, top - 30)))
    _draw_rich(img, W / 2, top, parse_rich(text), f, fill, accent, 4, "center")
    return layout._save(img, out)


LYRIC_H = 90


# ── 만들기 ─────────────────────────────────────────────────
def make(mp3: str, work: Path, cfg: dict, fonts: dict, series: str = "밧모섬의 증인", ep: str = "",
         subtitle: str = "", images: str = "", prompts: list[str] | None = None, ai: bool = True) -> Path:
    from .miracle import ai_image
    work.mkdir(parents=True, exist_ok=True)
    title, lyrics = read_lyrics(mp3)
    total = media.duration(mp3)
    cover = work / "cover.jpg"
    subprocess.run([media.ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(mp3), "-an", "-c:v", "copy", str(cover)])
    cover = cover if cover.exists() and cover.stat().st_size > 1000 else None
    rec_f = work / "recipe.json"
    if rec_f.exists():
        R = json.loads(rec_f.read_text(encoding="utf-8"))
        print("  recipe.json 사용 (고친 장면·시간 반영)")
    else:
        secs = parse(lyrics)
        lines = [ln for s in secs for ln in s["lines"]]
        words = whisper_words(mp3, work / "words.json", " ".join(lines))
        spans = align(lines, words, total)
        k = 0
        for i, s in enumerate(secs):
            s["times"] = spans[k:k + len(s["lines"])]
            k += len(s["lines"])
            s["prompt"] = (prompts[i] if prompts and i < len(prompts) else "")
        R = {"title": title, "series": series, "ep": ep, "subtitle": subtitle, "sections": secs}
        rec_f.write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding="utf-8")
    secs = R["sections"]
    intro_end = max(3.0, min(secs[0]["times"][0][0] - 0.3, 14.0))
    # 장면 경계
    starts = [intro_end] + [s["times"][0][0] - 0.4 for s in secs[1:]]
    ends = starts[1:] + [total]
    pics = sorted(p for p in Path(images).iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")) \
        if images else []
    parts = []
    tc = title_card(work / "bg" / "title.jpg", R["series"], R["ep"], R["subtitle"], cover, fonts)
    parts.append(shorts.piece(work / "parts" / "p00.mp4", FMT, str(tc), intro_end, zoom=True))
    for i, s in enumerate(secs):
        dur = ends[i] - starts[i]
        bg = None
        if pics:
            bg = pics[i % len(pics)]
        elif ai and s.get("prompt"):
            bg = ai_image(s["prompt"] + ", " + STYLE, work / "bg" / f"s{i:02d}.jpg", cfg)
        if not bg:
            bg = cover or tc
        s["bg"] = str(bg)
        parts.append(shorts.piece(work / "parts" / f"p{i + 1:02d}.mp4", FMT, str(bg), dur, zoom=True))
    base = shorts.join(parts, work / "parts" / "base.mp4")
    ov = [(bug(work / "ov" / "bug.png", f"{R['series']}  {R['ep']}", fonts), intro_end, total)]
    default_top = H - 170
    for i, s in enumerate(secs):
        ov.append((speaker_chip(work / "ov" / f"sp{i:02d}.png", s["speaker"], s["kind"], fonts), starts[i], ends[i]))
        for j, (ln, (a, b)) in enumerate(zip(s["lines"], s["times"])):
            nxt = s["times"][j + 1][0] if j + 1 < len(s["times"]) else (secs[i + 1]["times"][0][0] if i + 1 < len(secs) else total)
            b2 = min(max(b + 0.6, a + 1.6), nxt - 0.05)
            fb = faces.boxes(str(base), a + 0.05, max(a + 0.1, b2 - 0.05), step=0.6)
            top, _ = faces.place(fb, H, LYRIC_H, default_top, int(H * 0.2), H - 60)
            png = lyric_png(work / "ov" / f"l{i:02d}_{j:02d}.png", ln, s["kind"], fonts, top)
            ov.append((png, a, b2))
    out = work / f"{work.name}.mp4"
    fx = [(str(sfx.ding(work / "sfx" / "ding.wav")), max(0.0, intro_end - 0.2), 0.25)]
    shorts.finish(base, out, ov, audio=str(mp3), audio_offset=0.0, sfx=fx, duck=False)
    (work / "recipe.json").write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding="utf-8")
    return out
