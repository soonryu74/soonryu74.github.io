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
from .thumbs import fit_cover_faces

W, H = 1920, 1080
FMT = "long"
# 유럽 대형 뮤지컬(레미제라블·노트르담 드 파리·엘리자벳) 무대 사진처럼
STYLE = ("production photograph of a grand European stage musical like Les Miserables and Notre-Dame de Paris, "
         "on a theatre stage, dramatic stage lighting, follow spotlight, volumetric light beams through haze, "
         "backlit silhouettes, glossy dark stage floor reflecting light, painted scenic backdrop, cinematic, "
         "no text, no letters, no watermark, no audience, no depiction of Jesus' face")


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


# ── 무대 그림 ───────────────────────────────────────────────
GOLD = (222, 186, 106)
CRIMSON = (120, 12, 24)


def curtain_half(w: int, h: int, left: bool) -> Image.Image:
    """붉은 벨벳 커튼 반쪽 (주름 + 아래 금술)."""
    import math
    col = Image.new("RGB", (w, 1))
    for x in range(w):
        fold = 0.55 + 0.45 * abs(math.sin((x + (0 if left else 17)) / 38.0))
        edge = 0.75 + 0.25 * (x / w if left else 1 - x / w)
        k = fold * edge
        col.putpixel((x, 0), tuple(int(c * k * 1.6) for c in CRIMSON))
    img = col.resize((w, h)).convert("RGBA")
    shade = Image.linear_gradient("L").resize((w, h)).point(lambda v: int(v * 0.45))
    dark = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    dark.putalpha(shade)
    img.alpha_composite(dark)
    d = ImageDraw.Draw(img)
    d.rectangle((0, h - 26, w, h), fill=GOLD + (255,))
    for x in range(0, w, 14):
        d.line((x, h - 26, x, h), fill=(150, 110, 40, 255), width=2)
    return img


def valance(w: int) -> Image.Image:
    v = curtain_half(w, 150, True).resize((w, 150))
    d = ImageDraw.Draw(v)
    d.rectangle((0, 124, w, 150), fill=GOLD + (255,))
    return v


def stage_frame(img: Image.Image) -> Image.Image:
    """장면에 무대 틀(가장자리 어둡게)을 씌운다."""
    img = img.convert("RGBA")
    w, h = img.size
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).ellipse((-w * 0.15, -h * 0.25, w * 1.15, h * 1.2), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(120)).point(lambda v: 255 - v)
    dark = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    dark.putalpha(m.point(lambda v: int(v * 0.75)))
    img.alpha_composite(dark)
    return img


def stage_bg(src: Path, out: Path) -> Path:
    im = fit_cover_faces(Image.open(src).convert("RGB"), (W, H))
    stage_frame(im).convert("RGB").save(out, quality=93)
    return out


def poster(out: Path, series: str, ep: str, subtitle: str, art: Path | None, fonts: dict,
           kicker: str = "A BIBLICAL MUSICAL") -> Path:
    """뮤지컬 포스터형 타이틀 (검은 무대 + 금색 명조 제목 + 장면 그림)."""
    out.parent.mkdir(parents=True, exist_ok=True)
    base = Image.new("RGBA", (W, H), (6, 6, 10, 255))
    if art and Path(art).exists():
        im = fit_cover_faces(Image.open(art).convert("RGB"), (W, H))
        base = stage_frame(Image.blend(im, Image.new("RGB", (W, H), (6, 6, 10)), 0.45))
    g = Image.linear_gradient("L").rotate(90).resize((W, H)).point(lambda v: int((255 - v) * 0.85))
    dark = Image.new("RGBA", (W, H), (4, 4, 8, 255))
    dark.putalpha(g)
    base.alpha_composite(dark)
    base.alpha_composite(valance(W), (0, 0))
    d = ImageDraw.Draw(base)
    sf = fonts.get("serif", fonts["bold"])
    d.text((150, 300), " ".join(kicker), font=_f(fonts["subtitle"], 30), fill=GOLD)
    tf = _f(sf, 150)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).text((144, 350), series, font=tf, fill=GOLD + (200,))
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)))
    d = ImageDraw.Draw(base)
    d.text((144, 350), series, font=tf, fill=(244, 214, 140), stroke_width=2, stroke_fill=(60, 40, 10))
    d.line((150, 560, 700, 560), fill=GOLD, width=2)
    d.text((150, 590), ep, font=_f(sf, 64), fill=(255, 255, 255))
    y = 690
    for row in subtitle.split("\n")[:2]:
        d.text((150, y), row, font=_f(sf, 46), fill=(232, 226, 214))
        y += 64
    base.convert("RGB").save(out, quality=93)
    return out


def curtain_open(poster_img: Path, out: Path, sec: float = 1.6, fps: int = 30) -> Path:
    """커튼이 양옆으로 열리는 짧은 영상."""
    frames = out.parent / "curtain_frames"
    frames.mkdir(parents=True, exist_ok=True)
    bg = Image.open(poster_img).convert("RGBA")
    L, R = curtain_half(W // 2 + 40, H, True), curtain_half(W // 2 + 40, H, False)
    n = int(sec * fps)
    for i in range(n + 1):
        t = i / n
        e = t * t * (3 - 2 * t)  # 부드럽게
        f = bg.copy()
        off = int(e * (W // 2 + 60))
        f.alpha_composite(L, (-off, 0))
        f.alpha_composite(R, (W // 2 - 40 + off, 0))
        f.alpha_composite(valance(W), (0, 0))
        f.convert("RGB").save(frames / f"f{i:03d}.jpg", quality=90)
    media.run(["-framerate", str(fps), "-i", str(frames / "f%03d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p",
               "-r", str(fps), str(out)])
    return out


SPEAKER = {"john": ("요한", "사도 · 테너"), "god": ("주의 음성", "내레이션"), "music": ("", "")}
SPEAKER_COLOR = {"john": (140, 196, 255), "god": GOLD, "choir": (240, 236, 228), "music": (200, 200, 200)}


def speaker_chip(out: Path, text: str, kind: str, fonts: dict) -> Path:
    """공연 프로그램북처럼: 배역 이름(명조) + 가는 금선 + 작은 설명."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if text:
        sf = fonts.get("serif", fonts["bold"])
        name, sub = SPEAKER.get(kind, (text, ""))
        if kind == "choir":
            name, sub = text.replace(" 합창", ""), "합창 · Ensemble"
        col = SPEAKER_COLOR.get(kind, (255, 255, 255))
        d = ImageDraw.Draw(img)
        x, y = 80, 64
        d.text((x + 2, y + 3), name, font=_f(sf, 44), fill=(0, 0, 0, 160))
        d.text((x, y), name, font=_f(sf, 44), fill=col)
        d.line((x, y + 62, x + 260, y + 62), fill=GOLD + (220,), width=2)
        d.text((x, y + 72), sub, font=_f(fonts["subtitle"], 26), fill=(220, 214, 200, 230))
    return layout._save(img, out)


def bug(out: Path, text: str, fonts: dict) -> Path:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = _f(fonts.get("serif", fonts["title"]), 34)
    ImageDraw.Draw(img).text((W - 80, 72), text, font=f, fill=GOLD + (220,), anchor="ra",
                             stroke_width=2, stroke_fill=(0, 0, 0, 150))
    return layout._save(img, out)


def lyric_png(out: Path, text: str, kind: str, fonts: dict, top: int) -> Path:
    """공연 자막: 명조, 흰색(주의 음성은 금색), 은은한 그림자만."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sf = fonts.get("serif", fonts["bold"])
    size = 64 if kind == "choir" else 58
    f = _f(sf, size)
    t = text.replace("*", "")
    while f.size > 38 and f.getlength(t) > W * 0.84:
        f = _f(sf, f.size - 3)
    fill = (246, 214, 140) if kind == "god" else (255, 255, 255)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((W / 2 + 3, top + 4), t, font=f, fill=(0, 0, 0, 230), anchor="ma",
                            stroke_width=10, stroke_fill=(0, 0, 0, 200))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(9)))
    ImageDraw.Draw(img).text((W / 2, top), t, font=f, fill=fill, anchor="ma", stroke_width=2, stroke_fill=(20, 14, 6))
    return layout._save(img, out)


def curtain_call(out: Path, series: str, next_ep: str, fonts: dict, art: Path | None) -> Path:
    base = poster(out, series, "", "", art, fonts, kicker="CURTAIN CALL")
    img = Image.open(base).convert("RGBA")
    d = ImageDraw.Draw(img)
    sf = fonts.get("serif", fonts["bold"])
    if next_ep:
        d.text((150, 600), "다음 무대", font=_f(fonts["subtitle"], 34), fill=GOLD)
        d.text((150, 650), next_ep, font=_f(sf, 56), fill=(255, 255, 255))
    img.convert("RGB").save(out, quality=93)
    return out


LYRIC_H = 84
PRE = 4.0    # 커튼 + 타이틀 (노래 시작 전)
POST = 5.0   # 커튼콜


# ── 만들기 ─────────────────────────────────────────────────
def make(mp3: str, work: Path, cfg: dict, fonts: dict, series: str = "밧모섬의 증인", ep: str = "",
         subtitle: str = "", images: str = "", prompts: list | None = None, ai: bool = True,
         next_ep: str = "") -> Path:
    """prompts[i]: 장면 i 의 무대 그림 설명 — 문자열 또는 [설명1, 설명2] (긴 장면을 둘로)."""
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
        if prompts:
            for i, s in enumerate(R["sections"]):
                if i < len(prompts):
                    s["prompt"] = prompts[i]
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
        R = {"title": title, "series": series, "ep": ep, "subtitle": subtitle, "next": next_ep, "sections": secs}
    R.update({"series": series, "ep": ep, "subtitle": subtitle, "next": next_ep or R.get("next", "")})
    secs = R["sections"]
    # 장면 경계 (노래 시간 + PRE)
    starts = [PRE] + [PRE + s["times"][0][0] - 0.4 for s in secs[1:]]
    ends = starts[1:] + [PRE + total]
    pics = sorted(p for p in Path(images).iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")) \
        if images else []
    bgdir = work / "bg"
    bgdir.mkdir(parents=True, exist_ok=True)

    def scene_img(prompt: str, name: str) -> Path | None:
        if not (ai and prompt):
            return None
        raw = ai_image(prompt + ", " + STYLE, bgdir / f"{name}.jpg", cfg)
        return stage_bg(raw, bgdir / f"{name}_stage.jpg") if raw else None

    plan = []  # (시작, 끝, 그림)
    for i, s in enumerate(secs):
        pr = s.get("prompt") or ""
        prs = pr if isinstance(pr, list) else [pr]
        imgs = []
        if pics:
            imgs = [pics[i % len(pics)]]
        else:
            imgs = [p for p in (scene_img(q, f"s{i:02d}{chr(97 + j)}") for j, q in enumerate(prs)) if p]
        if not imgs:
            imgs = [stage_bg(cover, bgdir / "cover_stage.jpg") if cover else None]
        seg = (ends[i] - starts[i]) / len(imgs)
        for j, im in enumerate(imgs):
            plan.append((starts[i] + seg * j, starts[i] + seg * (j + 1), im))
        s["bg"] = [str(x) for x in imgs if x]
    key_art = next((Path(b) for s in reversed(secs) for b in s.get("bg", [])), cover)
    pst = poster(bgdir / "poster.jpg", R["series"], R["ep"], R["subtitle"], key_art, fonts)
    parts = [shorts.piece(work / "parts" / "p000.mp4", FMT, str(curtain_open(pst, work / "parts" / "curtain.mp4")),
                          1.6, zoom=False)]
    parts.append(shorts.piece(work / "parts" / "p001.mp4", FMT, str(pst), PRE - 1.6, zoom=True))
    for k2, (a, b, im) in enumerate(plan):
        parts.append(shorts.piece(work / "parts" / f"p{k2 + 2:03d}.mp4", FMT, str(im or pst), b - a, zoom=True))
    cc = curtain_call(bgdir / "curtain_call.jpg", R["series"], R.get("next", ""), fonts, key_art)
    parts.append(shorts.piece(work / "parts" / "p999.mp4", FMT, str(cc), POST, zoom=False))
    base = shorts.join(parts, work / "parts" / "base.mp4")
    ov = [(bug(work / "ov" / "bug.png", f"{R['series']}  ·  {R['ep']}", fonts), PRE, PRE + total)]
    default_top = H - 160
    for i, s in enumerate(secs):
        ov.append((speaker_chip(work / "ov" / f"sp{i:02d}.png", s["speaker"], s["kind"], fonts), starts[i], ends[i]))
        for j, (ln, (a, b)) in enumerate(zip(s["lines"], s["times"])):
            nxt = s["times"][j + 1][0] if j + 1 < len(s["times"]) else (secs[i + 1]["times"][0][0] if i + 1 < len(secs) else total)
            b2 = min(max(b + 0.6, a + 1.6), nxt - 0.05)
            fb = faces.boxes(str(base), PRE + a + 0.05, PRE + max(a + 0.1, b2 - 0.05), step=0.6)
            top, _ = faces.place(fb, H, LYRIC_H, default_top, int(H * 0.2), H - 50)
            png = lyric_png(work / "ov" / f"l{i:02d}_{j:02d}.png", ln, s["kind"], fonts, top)
            ov.append((png, PRE + a, PRE + b2))
    out = work / f"{work.name}.mp4"
    fx = [(str(sfx.ambient(work / "sfx" / "overture.wav", PRE + 1.0)), 0.0, 0.35),
          (str(sfx.ding(work / "sfx" / "ding.wav")), PRE + total + 0.3, 0.3)]
    shorts.finish(base, out, ov, audio=str(mp3), audio_offset=PRE, sfx=fx, duck=False)
    rec_f.write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding="utf-8")
    return out
