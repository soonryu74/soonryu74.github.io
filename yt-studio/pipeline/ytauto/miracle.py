"""'3분 미라클'형 가로 영상: 녹음 파일 하나 → 타이틀 화면 + 문장마다 바뀌는 장면 + 핵심어 강조 자막 + 영어 자막.

사랑의교회 '3분 미라클'의 짜임을 따른다.
  1) 시작: 시리즈 타이틀 화면 (입체 느낌 배경 + 제목)
  2) 본문: 말하는 내용에 맞는 장면이 1~2문장마다 바뀜 (천천히 확대, 부드럽게 전환)
  3) 자막: 상자 없이 흰 굵은 글씨, 핵심어만 노랑·민트. 아래 띠에 영어 자막 한 줄
  4) 왼쪽 위 작은 채널 표시, 처음 몇 초 연사 이름표
  5) 끝: 모집 안내 화면
장면 그림: 내 사진 폴더 > AI 이미지 > 추상 배경 순.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from . import faces, layout, llm, media, series, sfx, shorts, transcribe
from .assemble import write_srt
from .prompts import extract_json
from .thumbs import _draw_rich, _rgb, parse_rich

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp"}
FMT = "long"
W, H = 1920, 1080

# 자동 강조할 단어 (원고에 *별표*가 없을 때)
KEYWORDS = ["하나님", "예수님", "예수", "주님", "성령", "복음", "일터", "선교사", "선교지", "선교", "예배", "기도", "은혜",
            "사랑", "믿음", "소망", "제자", "사명", "소명", "월요일", "동료", "회사", "직장", "가정", "말씀", "십자가", "기적"]

# AI 없이 장면 묘사 만들기 (원고 단어 → 영어 장면)
SCENE_HINTS = [
    (("월요일", "출근", "아침"), "morning commute, office building at sunrise, warm light"),
    (("사무실", "회사", "직장", "업무", "결재", "회의"), "modern bright office desk with laptop, soft window light"),
    (("동료", "팀", "함께"), "coworkers talking kindly at an office table, warm tones"),
    (("기도",), "hands folded in quiet prayer, soft morning light, close-up"),
    (("예배", "교회", "찬양"), "light streaming into a quiet chapel, peaceful"),
    (("선교", "복음", "세상", "보내"), "sunrise over a city skyline, hopeful, cinematic"),
    (("가정", "가족", "자녀"), "family sharing a meal at home, warm evening light"),
    (("말씀", "성경"), "open bible on a wooden table, sunlight, shallow depth of field"),
    (("일", "일하", "노동", "땀"), "hands of a craftsman working carefully, workshop light"),
    (("쉼", "안식", "평안"), "calm lake at dawn with mist, peaceful"),
    (("돌", "반석", "모퉁잇돌"), "smooth stones stacked on sand, warm sunlight"),
]
DEFAULT_SCENE = "calm sunrise over hills, soft golden light, cinematic"
STYLE = "photographic, cinematic, natural colors, no text, no watermark, no logo"


# ── 글자 ───────────────────────────────────────────────────
def auto_highlight(text: str) -> str:
    if "*" in text:
        return text
    for kw in KEYWORDS:  # 문장마다 첫 핵심어 하나만
        if kw in text:
            return text.replace(kw, f"*{kw}*", 1)
    return text


def _f(path: str, pt: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, pt)


def _wrap_rich(text: str, f, max_w: int) -> list[list[tuple[str, bool]]]:
    """*강조*를 지키면서 줄바꿈."""
    words = []
    for seg, hi in parse_rich(text):
        for w in re.split(r"(\s+)", seg):
            if w:
                words.append((w, hi))
    lines, cur, cw = [], [], 0.0
    for w, hi in words:
        wl = f.getlength(w)
        if cur and cw + wl > max_w and not w.isspace():
            lines.append(cur)
            cur, cw = [], 0.0
            if w.isspace():
                continue
        cur.append((w, hi))
        cw += wl
    if cur:
        lines.append(cur)
    return [[(t, h) for t, h in ln if t] for ln in lines]


def caption_png(out: Path, ko: str, en: str, fonts: dict, top: int | None = None, accent_i: int = 0) -> Path:
    """3분 미라클식 자막: 상자 없이 흰 굵은 글씨 + 핵심어 색, 아래 띠에 영어 한 줄."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    acc = [(255, 225, 60), (92, 242, 200)][accent_i % 2]
    f = _f(fonts["bold"], 64)
    lines = _wrap_rich(ko, f, int(W * 0.74))[:2]
    line_h = 84
    band_h = 58 if en else 0
    block = line_h * len(lines)
    y = top if top is not None else H - band_h - 40 - block
    g0, g1 = max(0, y - 90), min(H, y + block + 70)
    col = Image.new("L", (1, g1 - g0))
    for yy in range(g1 - g0):  # 가운데 진하고 위아래로 옅게
        k = 1 - abs((yy / max(1, g1 - g0 - 1)) * 2 - 1)
        col.putpixel((0, yy), int(130 * min(1.0, k * 1.8)))
    img.paste((0, 0, 0, 255), (0, g0, W, g1), col.resize((W, g1 - g0)))
    for ln in lines:
        _draw_rich(img, W / 2, y, [(t, h) for t, h in ln], f, (255, 255, 255), acc, 4, "center")
        y += line_h
    if en:
        d.rectangle((0, H - band_h, W, H), fill=(0, 0, 0, 150))
        ef = _f(fonts["subtitle"], 32)
        d.text((W / 2, H - band_h / 2), en, font=ef, fill=(235, 238, 245), anchor="mm")
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    return out


def caption_height(ko: str, fonts: dict) -> int:
    return 84 * len(_wrap_rich(ko, _f(fonts["bold"], 64), int(W * 0.74))[:2])


def bug_png(out: Path, text: str, fonts: dict) -> Path:
    """왼쪽 위 작은 채널 표시 (SaRang On 처럼)."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = _f(fonts["bold"], 34)
    ImageDraw.Draw(img).text((50, 39), text, font=f, fill=(0, 0, 0, 140))
    img = img.filter(ImageFilter.GaussianBlur(3))
    ImageDraw.Draw(img).text((48, 36), text, font=f, fill=(255, 255, 255, 240), stroke_width=2,
                             stroke_fill=(0, 0, 0, 90))
    return layout._save(img, out)


def lower_third(out: Path, name: str, role: str, fonts: dict, theme: dict) -> Path:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    nf, rf = _f(fonts["bold"], 52), _f(fonts["subtitle"], 34)
    w = int(max(nf.getlength(name), rf.getlength(role)) + 80)
    x, y = 70, int(H * 0.60)
    d.rectangle((x, y, x + 10, y + 120), fill=_rgb(theme["accent"]) + (255,))
    d.rectangle((x + 10, y, x + w, y + 120), fill=(10, 14, 24, 190))
    d.text((x + 40, y + 12), name, font=nf, fill=(255, 255, 255))
    d.text((x + 40, y + 72), role, font=rf, fill=(220, 226, 236))
    return layout._save(img, out)


# ── 배경 ───────────────────────────────────────────────────
def abstract_bg(out: Path, seed: str, theme: dict, size=(W, H)) -> Path:
    """입체 느낌 추상 배경 (파스텔 구슬). 타이틀·그림 없는 장면용."""
    import random
    rnd = random.Random(int(hashlib.md5(seed.encode()).hexdigest(), 16))
    w, h = size
    palettes = [((248, 196, 214), (255, 236, 244)), ((196, 214, 248), (236, 244, 255)),
                ((204, 236, 222), (240, 252, 246)), ((250, 222, 196), (255, 246, 236))]
    a, b = palettes[rnd.randrange(len(palettes))]
    g = Image.linear_gradient("L").resize((w, h))
    img = Image.composite(Image.new("RGB", size, b), Image.new("RGB", size, a), g).convert("RGBA")
    for _ in range(9):
        r = rnd.randint(int(h * 0.08), int(h * 0.28))
        cx, cy = rnd.randint(0, w), rnd.randint(0, h)
        ball = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0))
        rg = Image.radial_gradient("L").resize((r * 2, r * 2))
        base_col = tuple(max(0, c - rnd.randint(10, 60)) for c in a)
        solid = Image.new("RGBA", (r * 2, r * 2), base_col + (255,))
        hl = Image.new("RGBA", (r * 2, r * 2), (255, 255, 255, 255))
        m = Image.new("L", (r * 2, r * 2), 0)
        ImageDraw.Draw(m).ellipse((0, 0, r * 2 - 1, r * 2 - 1), fill=255)
        ball = Image.composite(solid, hl, rg.point(lambda v: min(255, int(v * 1.3))))
        ball.putalpha(m.point(lambda v: int(v * rnd.uniform(0.55, 0.9))))
        img.alpha_composite(ball, (cx - r, cy - r))
    img = img.filter(ImageFilter.GaussianBlur(2))
    out.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out, quality=92)
    return out


def title_card(out: Path, series_title: str, title: str, fonts: dict, theme: dict) -> Path:
    bg = abstract_bg(out.with_suffix(".bg.jpg"), series_title, theme)
    img = Image.open(bg).convert("RGBA")
    f = _f(fonts["title"], 150)
    tw = f.getlength(series_title)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).text(((W - tw) / 2 + 6, H * 0.36 + 10), series_title, font=f, fill=(90, 40, 70, 120))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    ImageDraw.Draw(img).text(((W - tw) / 2, H * 0.36), series_title, font=f, fill=(255, 255, 255))
    if title:
        tf = _f(fonts["bold"], 56)
        t = title.replace("*", "").replace("\\n", " ").replace("\n", " ")
        ImageDraw.Draw(img).text((W / 2, H * 0.62), t, font=tf, fill=(70, 50, 80), anchor="ma")
    img.convert("RGB").save(out, quality=93)
    return out


def ai_image(prompt: str, out: Path, cfg: dict) -> Path | None:
    """AI 장면 그림. config 의 visual.provider 가 gemini·sd-webui 면 그것을, 아니면 무료 pollinations."""
    from . import visuals
    if out.exists() and out.stat().st_size > 5000:  # 다시 만들 때는 받아 둔 그림 사용
        return out
    prov = cfg["visual"].get("provider", "card")
    full = f"{prompt}, {STYLE}"
    try:
        if prov == "gemini":
            return visuals._gemini_image(full, out.with_suffix(".png"), FMT, cfg["visual"])
        if prov == "sd-webui":
            return visuals._sd_webui(full, out.with_suffix(".png"), FMT, cfg["visual"])
        import urllib.parse
        url = ("https://image.pollinations.ai/prompt/" + urllib.parse.quote(full)
               + "?width=1280&height=720&nologo=true&seed=" + str(int(hashlib.md5(prompt.encode()).hexdigest()[:6], 16)))
        import time
        for k in range(3):  # 무료 서버는 잠깐씩 막히므로 쉬었다가 다시
            r = requests.get(url, timeout=180)
            if r.status_code == 200 and r.headers.get("content-type", "").startswith("image"):
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(r.content)
                return out
            time.sleep(6 * (k + 1))
    except Exception as e:
        print(f"  ! 장면 그림 실패 ({type(e).__name__}) → 추상 배경으로")
    return None


def scene_prompts(scenes: list[dict], cfg: dict) -> None:
    lines = "\n".join(f"{i + 1}. {s['text'].replace('*', '')}" for i, s in enumerate(scenes))
    msg = [{"role": "system", "content": "You write short English photo prompts for a Korean Christian radio column video about faith and work. "
            "Natural, warm, cinematic scenes of everyday work life and nature. No text, no real people's faces up close, "
            "no depictions of Jesus or biblical figures."},
           {"role": "user", "content": f"One prompt per numbered paragraph. JSON only: {{\"prompts\": [..]}}\n{lines}"}]
    try:
        ps = extract_json(llm.chat(msg, cfg["llm"])).get("prompts", [])
    except Exception:
        ps = []
    for i, s in enumerate(scenes):
        if i < len(ps) and ps[i]:
            s["prompt"] = ps[i]
            continue
        txt = s["text"]
        s["prompt"] = next((p for keys, p in SCENE_HINTS if any(k in txt for k in keys)), DEFAULT_SCENE)


def translate(sentences: list[str], cfg: dict) -> list[str]:
    msg = [{"role": "system", "content": "Translate Korean Christian devotional sentences into natural, concise English subtitles."},
           {"role": "user", "content": "JSON only: {\"en\": [..]} — same count and order.\n" +
            "\n".join(f"{i + 1}. {s.replace('*', '')}" for i, s in enumerate(sentences))}]
    try:
        en = extract_json(llm.chat(msg, cfg["llm"])).get("en", [])
        return en if len(en) == len(sentences) else []
    except Exception:
        return []


# ── 만들기 ─────────────────────────────────────────────────
def make(audio: str, work: Path, cfg: dict, fonts: dict, title: str, series_key: str = "column",
         series_title: str = "극동방송 1분 칼럼", name: str = "", role: str = "", photo: str = "",
         script: str = "", images: str = "", english: str = "", visual: str = "ai",
         channel_bug: str = "극동방송 × SaGA", music: str = "auto") -> Path:
    S = series.get(series_key)
    B = series.brand(cfg)
    work.mkdir(parents=True, exist_ok=True)
    voice = work / ("voice" + Path(audio).suffix.lower())
    if not voice.exists() or voice.stat().st_size != Path(audio).stat().st_size:
        shutil.copy(audio, voice)
    total = media.duration(str(voice))
    srt = work / "자막.srt"
    if srt.exists():
        cues = transcribe.read_srt(srt)
        print("  자막.srt 사용 (고친 내용 반영)")
    else:
        cues = transcribe.transcribe(voice, cfg.get("transcribe", {}), script, work / "transcript.json")
        write_srt(cues, srt)
    # 영어 자막
    ko = [c[2] for c in cues]
    en_lines = [l.strip() for l in english.splitlines() if l.strip()] if english and english != "auto" else []
    if english == "auto":
        en_lines = translate(ko, cfg)
        if not en_lines:
            print("  · 영어 자막: AI 번역을 못 해서 넣지 않습니다 (영어 원고를 넣으면 들어가요)")
    # 장면 묶기: 1~2문장, 5~9초
    scenes, cur = [], []
    for c in cues:
        cur.append(c)
        if c[1] - cur[0][0] >= 5.0 or len(cur) >= 2:
            scenes.append(cur)
            cur = []
    if cur:
        scenes.append(cur)
    sc = []
    for i, grp in enumerate(scenes):
        sc.append({"start": 0.0 if i == 0 else grp[0][0], "text": " ".join(t for _, _, t in grp)})
    for i, s in enumerate(sc):
        s["end"] = sc[i + 1]["start"] if i + 1 < len(sc) else total + 0.3
    pics = sorted(p for p in Path(images).iterdir() if p.suffix.lower() in IMG_EXT) if images else []
    if visual == "ai" and not pics:
        scene_prompts(sc, cfg)
    # 조각: 타이틀 → 장면들 → 마무리
    INTRO = 3.2
    parts = []
    tc = title_card(work / "bg" / "title.jpg", series_title, title, fonts, S["theme"])
    parts.append(shorts.piece(work / "parts" / "p00_title.mp4", FMT, str(tc), INTRO, zoom=True))
    for i, s in enumerate(sc, 1):
        dur = s["end"] - s["start"]
        if i == 1 and photo and Path(photo).exists():
            bg = Path(photo)  # 첫 장면: 칼럼니스트 사진 (연사 화면 대신)
        elif pics:
            bg = pics[(i - 1) % len(pics)]
        elif visual == "ai":
            bg = ai_image(s["prompt"], work / "bg" / f"s{i:02d}.jpg", cfg) or abstract_bg(
                work / "bg" / f"s{i:02d}_abs.jpg", s["text"], S["theme"])
        else:
            bg = abstract_bg(work / "bg" / f"s{i:02d}_abs.jpg", s["text"], S["theme"])
        s["bg"] = str(bg)
        parts.append(shorts.piece(work / "parts" / f"p{i:02d}.mp4", FMT, str(bg), dur, zoom=True))
    OUTRO = 4.0
    end_card = layout.outro(work / "bg" / "outro", FMT, fonts, B, S["theme"], "당신의 일터도\n*선교지*입니다")
    parts.append(shorts.piece(work / "parts" / "p99_outro.mp4", FMT, str(end_card), OUTRO, zoom=False))
    base = shorts.join(parts, work / "parts" / "base.mp4")
    main_end = INTRO + total + 0.3
    # 얹을 것
    ov = []
    ov += faces.keep_clear(str(base), bug_png(work / "ov" / "bug.png", channel_bug, fonts), INTRO, main_end)
    if name:
        ov += faces.keep_clear(str(base), lower_third(work / "ov" / "name.png", name, role, fonts, S["theme"]),
                               INTRO + 0.4, INTRO + min(6.0, total))
    srt_en = []
    for j, (a, b, text) in enumerate(cues):
        hl = auto_highlight(text)
        en = en_lines[j] if j < len(en_lines) else ""
        h = caption_height(hl, fonts)
        default_top = H - (58 if en else 0) - 40 - h
        fb = faces.boxes(str(base), INTRO + a + 0.05, INTRO + max(a + 0.05, b - 0.05), step=0.4)
        top, _ = faces.place(fb, H, h, default_top, int(H * 0.16), H - (58 if en else 0) - 20)
        png = caption_png(work / "ov" / f"c{j:03d}.png", hl, en, fonts, top, j)
        ov.append((png, INTRO + a, INTRO + min(b, total)))
        if en:
            srt_en.append((a, b, en))
    fx = [(str(sfx.whoosh(work / "sfx" / "whoosh.wav")), max(0, INTRO - 0.35), 0.5),
          (str(sfx.ding(work / "sfx" / "ding.wav")), main_end + 0.1, 0.5)]
    bgm = ""
    if music == "auto":
        bgm = str(sfx.ambient(work / "sfx" / "ambient.wav", main_end + OUTRO))
    elif music and music != "none":
        bgm = music
    out = work / f"{work.name.removesuffix('-가로')}_가로.mp4"
    shorts.finish(base, out, ov, audio=str(voice), audio_offset=INTRO, bgm=bgm, bgm_volume=0.22, sfx=fx)
    if srt_en:
        write_srt(srt_en, work / "subtitles_en.srt")
    (work / "scenes.json").write_text(json.dumps(sc, ensure_ascii=False, indent=1), encoding="utf-8")
    return out


# ── 3분 미라클식 썸네일 ─────────────────────────────────────
def miracle_thumbnail(out: Path, title: str, fonts: dict, bg: Path | None, series_label: str = "극동방송 1분 칼럼",
                      ghost: str = "", theme: dict | None = None) -> Path:
    """질감·장면 배경 + 오른쪽 정렬 큰 제목(3줄) + 왼쪽 아래 금색 시리즈 이름 + 옅은 영어 단어."""
    from .thumbs import fit_cover_faces
    TW, TH = 1280, 720
    if bg and Path(bg).exists():
        base = fit_cover_faces(Image.open(bg), (TW, TH))
    else:
        base = Image.open(abstract_bg(out.with_suffix(".bg.jpg"), title, theme or {}, (TW, TH))).convert("RGB")
    base = base.convert("RGBA")
    sh = Image.linear_gradient("L").rotate(90).resize((TW, TH)).point(lambda v: int(v * 0.55))  # 오른쪽 어둡게
    dark = Image.new("RGBA", (TW, TH), (10, 8, 6, 255))
    dark.putalpha(sh)
    base.alpha_composite(dark)
    if ghost:
        gp = 240
        gf = _f(fonts["title"], gp)
        while gp > 90 and gf.getlength(ghost.upper()) > TW * 0.92:
            gp -= 10
            gf = _f(fonts["title"], gp)
        gl = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
        ImageDraw.Draw(gl).text((TW / 2, TH * 0.45), ghost.upper(), font=gf, fill=(255, 255, 255, 60), anchor="mm")
        base.alpha_composite(gl)
    rows = [r for r in title.replace("\\n", "\n").split("\n") if r.strip()][:3]
    pt = 118
    f = _f(fonts["bold"], pt)
    while pt > 60 and max(f.getlength(r.replace("*", "")) for r in rows) > TW * 0.62:
        pt -= 6
        f = _f(fonts["bold"], pt)
    y = 60
    for r in rows:
        shl = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
        ImageDraw.Draw(shl).text((TW - 60 + 4, y + 6), r.replace("*", ""), font=f, fill=(0, 0, 0, 170), anchor="ra")
        base.alpha_composite(shl.filter(ImageFilter.GaussianBlur(6)))
        _draw_rich(base, TW - 60, y, parse_rich(r), f, (250, 240, 236), (255, 214, 120), 0, "right")
        y += int(pt * 1.12)
    lf = _f(fonts["title"], 64)
    gold = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
    ImageDraw.Draw(gold).text((54, TH - 110), series_label, font=lf, fill=(236, 196, 110), stroke_width=3,
                              stroke_fill=(60, 40, 10))
    base.alpha_composite(gold)
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=93)
    return out
