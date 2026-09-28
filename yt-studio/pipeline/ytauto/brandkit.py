"""재생목록별 '고정 틀' — 누가 만들어도 같은 모양의 썸네일·쇼츠 표지가 나오게.

재생목록을 고르면 확정된 틀·색이 자동으로 정해지고, 사람은 사진과 문구만 넣는다.
틀을 바꾸려면 아래 PRESETS 만 고치면 모든 사람의 결과가 함께 바뀐다.

입력(fields) — 틀마다 쓰는 것만 쓴다
  big     큰 말 (줄바꿈 \\n, 강조 *단어*)       예: 일이\\n*선교*다!
  hook    위 작은 줄                             예: 남군산교회에서 온 한마디
  who     말한 사람 · 이름                        예: 남군산교회
  role    직함                                   예: SaGA 거점교회
  target  누구에게 (꼬리표)                       예: 월요일이 무거운 직장인께
  sub     영어 한 줄 또는 보조 문구               예: Business is Mission!
  day, total, places   비전트립 DAY 틀
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

from . import covers, series, thumbs

# 재생목록 → 확정 틀 (쇼츠 표지 9:16, 가로 썸네일 16:9)
PRESETS: dict[str, dict] = {
    # '일터가 선교다' 응원 릴레이 확정(2026-09-28): 대표 표지 = 여러 얼굴 모음 9:16, 영상 맨 앞 0.6초에 붙임
    "intro":    {"shorts": ["bubble", "box"], "long": "group", "cover": "group_vertical", "prepend": True,
                 "desc": "응원·소개(일터가 선교다): 여러 얼굴 모음 9:16 대표 표지 / 여러 얼굴 모음"},
    "column":   {"shorts": ["answer", "box"], "long": "miracle", "desc": "극동방송 칼럼: 질문-답 + 자막상자 / 3분 미라클형"},
    "scic":     {"shorts": ["box", "bubble"], "long": "testimony", "desc": "SCIC: 자막상자 + 말풍선 / 인용형"},
    "trip":     {"shorts": ["box"], "long": "diary", "desc": "비전트립: 자막상자 / DAY 여행 일지형"},
    "dean":     {"shorts": ["bubble", "box"], "long": "testimony", "desc": "학장 특강: 말풍선 + 자막상자 / 인용형"},
    "lecture":  {"shorts": ["box", "answer"], "long": "talk", "desc": "강의: 자막상자 + 질문-답 / 예능 자막형"},
    "referral": {"shorts": ["card", "box"], "long": "hero", "desc": "추천 영상: 카드 + 자막상자 / 얼굴 + 큰 두 줄"},
    "nomore":   {"shorts": ["box", "answer"], "long": "showcase", "desc": "노모어매뉴얼: 자막상자 + 질문-답 / 장면 카드형"},
}
STYLE_KO = {"bubble": "말풍선", "box": "자막상자", "answer": "질문답", "card": "카드"}


def preset(key: str) -> dict:
    return PRESETS.get(key, PRESETS["intro"])


def _clean(s: str) -> str:
    return (s or "").replace("\\n", "\n")


# ── 여러 사람 얼굴 모음 (응원 릴레이) ───────────────────────
def group_thumbnail(out: Path, photos: list, big: str, sub: str, fonts: dict, vertical: bool = False,
                    footer: str = "", brand: str = "SaGA 일터아카데미", theme: dict | None = None) -> Path:
    from .covers import _f, _line
    theme = theme or {}
    bg = thumbs._rgb(theme.get("c1", "#0A142D"))
    W, H = (1080, 1920) if vertical else (1280, 720)
    base = Image.new("RGBA", (W, H), bg + (255,))
    photos = [p for p in photos if p][:5] or [None]
    n = len(photos)
    if vertical:  # 위 줄 · 가운데 글자 · 아래 줄
        top_n = (n + 1) // 2
        rows = [(photos[:top_n], 0, 700), (photos[top_n:], 1010, 620)]
        for ps, y, h in rows:
            for i, p in enumerate(ps):
                w = W // len(ps)
                if p:
                    base.alpha_composite(thumbs.fit_cover_faces(Image.open(p), (w, h)).convert("RGBA"), (i * w, y))
                ImageDraw.Draw(base).rectangle((i * w, y, i * w + w - 1, y + h - 1), outline=bg, width=6)
        d = ImageDraw.Draw(base)
        d.rectangle((0, 700, W, 1010), fill=bg)
        cy = 722
        if sub:
            sf = _f(fonts["bold"], 50)
            tw = sf.getlength(sub) / 2 + 40
            d.rounded_rectangle((W / 2 - tw, cy, W / 2 + tw, cy + 78), 39, fill=(255, 214, 0))
            d.text((W / 2, cy + 39), sub, font=sf, fill=(14, 14, 20), anchor="mm")
        rows_t = covers._rows(big)[:2]
        pt = covers._fit(rows_t, fonts["title"], W * 0.9, 170, 90)
        y = 822 if len(rows_t) == 1 else 812
        for r in rows_t:
            _line(base, W / 2, y, r, _f(fonts["title"], pt if len(rows_t) == 1 else int(pt * 0.72)),
                  sw=12, outer=(255, 255, 255), ow=8)
            y += int(pt * 0.8)
        d = ImageDraw.Draw(base)
        d.rectangle((0, 1630, W, H), fill=bg)
        if footer:
            d.text((W / 2, 1690), footer, font=_f(fonts["bold"], 54), fill=(255, 255, 255), anchor="mm")
        if brand:
            d.text((W / 2, 1760), brand, font=_f(fonts["bold"], 38), fill=(255, 214, 0), anchor="mm")
    else:  # 가로: 얼굴을 나란히 + 아래 큰 글자
        sw = W // n
        for i, p in enumerate(photos):
            if p:
                base.alpha_composite(thumbs.fit_cover_faces(Image.open(p), (sw, H)).convert("RGBA"), (i * sw, 0))
        g = Image.linear_gradient("L").resize((W, H)).point(lambda v: int(max(0, v - 90) * 1.5))
        dark = Image.new("RGBA", (W, H), (6, 8, 16, 255))
        dark.putalpha(g)
        base.alpha_composite(dark)
        d = ImageDraw.Draw(base)
        if sub:
            sf = _f(fonts["bold"], 44)
            tw = sf.getlength(sub) / 2 + 36
            d.rounded_rectangle((W / 2 - tw, 400, W / 2 + tw, 460), 30, fill=(255, 214, 0))
            d.text((W / 2, 430), sub, font=sf, fill=(14, 14, 20), anchor="mm")
        r = " ".join(covers._rows(big))
        pt = covers._fit([r], fonts["title"], W * 0.9, 150, 70)
        _line(base, W / 2, 470, r, _f(fonts["title"], pt), sw=12, outer=(255, 255, 255), ow=8)
        if brand:
            ImageDraw.Draw(base).text((40, 36), brand, font=_f(fonts["bold"], 36), fill=(255, 255, 255),
                                      stroke_width=4, stroke_fill=(0, 0, 0))
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=93)
    return out


def _usable(p) -> bool:
    """거의 까맣거나 하얀(화면 전환) 사진은 뺀다."""
    try:
        from PIL import ImageStat
        m = ImageStat.Stat(Image.open(p).convert("L").resize((64, 64))).mean[0]
        return 25 < m < 235
    except Exception:
        return False


KO_NUM = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"]


def shout_footer(n: int) -> str:
    return f"{KO_NUM[n]} 명의 외침" if 0 < n < len(KO_NUM) else f"{n}명의 외침"


def relay_cover(video: Path, events: list, out: Path, fonts: dict, shout: str, sub: str, theme: dict,
                brand: str = "SaGA 일터아카데미") -> Path | None:
    """응원 릴레이 대표 표지: 외친 사람마다 얼굴이 가장 선명한 장면 한 장씩 → 9:16 모음."""
    if not events:
        return None
    ev = events if len(events) <= 5 else [events[round(i * (len(events) - 1) / 4)] for i in range(5)]
    shots = []
    for i, (a, b) in enumerate(ev):
        p = covers.sharp_face_frame(video, a, max(a + 0.3, b), out.parent / "_frames" / f"relay{i}.jpg")
        if p:
            shots.append(p)
    if not shots:
        return None
    return group_thumbnail(out, shots, shout, sub, fonts, vertical=True, footer=shout_footer(len(events)),
                           brand=brand, theme=theme)


# ── 한 번에 만들기 ──────────────────────────────────────────
def make(key: str, out_dir: Path, fonts: dict, cfg: dict, photos: list, f: dict) -> list[tuple[Path, str]]:
    """재생목록 key 의 확정 틀로 쇼츠 표지 + 가로 썸네일(+ 여러 사람이면 세로 모음)을 만든다."""
    P = preset(key)
    S = series.get(key)
    th = S["theme"]
    photos = [Path(p) for p in photos if p and _usable(p)]
    main = photos[0] if photos else None
    big, hook, who, role = _clean(f.get("big")), f.get("hook", ""), f.get("who", ""), f.get("role", "")
    target, sub = f.get("target", ""), f.get("sub", "")
    who_line = " · ".join(x for x in (who, role) if x)
    cta = (series.brand(cfg).get("cta") or [""])[0]
    res = []
    # 쇼츠 표지 (9:16)
    for st in P["shorts"]:
        kw = {"bubble": dict(big=big, who=who_line),
              "box": dict(hook=hook or who_line or S["name"], big=big),
              "answer": dict(hook=hook or who_line, big=covers.star_word(big), target=target or S["name"]),
              "card": dict(target=target or S["label"], big=big, stamp=f.get("stamp", "60초"), cta=cta)}[st]
        o = covers.shorts_cover(out_dir / f"쇼츠표지_{STYLE_KO[st]}.jpg", st, fonts, main, theme=th, **kw)
        res.append((o, f"쇼츠 표지 · {STYLE_KO[st]}"))
    # 가로 썸네일 (16:9)
    lo, o = P["long"], out_dir / "썸네일_가로.jpg"
    if lo == "group":
        group_thumbnail(o, photos, big, sub, fonts, theme=th)
        if len(photos) >= 3:
            v = group_thumbnail(out_dir / "썸네일_세로_모음.jpg", photos, big, sub, fonts, vertical=True,
                                footer=f.get("footer") or hook, theme=th)
            res.append((v, "세로 썸네일 · 여러 얼굴"))
    elif lo == "miracle":
        from .miracle import miracle_thumbnail
        miracle_thumbnail(o, big, fonts, main, S["name"], f.get("ghost", ""), th)
    elif lo == "diary":
        from .diary import diary_thumbnail
        diary_thumbnail(o, int(f.get("day") or 1), int(f.get("total") or 9), _clean(f.get("places")) or big, fonts,
                        main, photos[1] if len(photos) > 1 else None, series_label=hook or "비전트립",
                        sub_label=target, kicker=sub)
    elif lo == "testimony":
        thumbs.testimony_thumbnail(o, big, fonts, main, who, role, "SaGA 일터아카데미", th)
    elif lo == "talk":
        thumbs.talk_thumbnail(o, big, fonts, main, who, role, hook, None, logo="SaGA 일터아카데미", theme=th)
    elif lo == "hero":
        thumbs.hero_thumbnail(o, big, fonts, main, hook or target, "SaGA 일터아카데미", f.get("badge", ""), th)
    elif lo == "showcase":
        thumbs.showcase_thumbnail(o, big, fonts, main, hook, badge=f.get("badge", ""), channel=S["name"], theme=th)
    res.append((o, f"가로 썸네일 · {PRESETS.get(key, PRESETS['intro'])['desc'].split('/')[-1].strip()}"))
    return res
