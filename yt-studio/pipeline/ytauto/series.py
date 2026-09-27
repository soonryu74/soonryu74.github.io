"""재생목록(시리즈)별 고정 틀: 색·꼬리표·제목 형식·마무리 안내.

사랑글로벌아카데미 일터선교&글로벌네트워크아카데미 7기 캠페인 기준.
config.json 의 "brand" 로 채널명·안내 문구를 바꿀 수 있다.
"""
from __future__ import annotations

SERIES: dict[str, dict] = {
    "intro":    {"name": "일터아카데미 소개", "label": "일터아카데미 7기",
                 "c1": "#0E1E3F", "c2": "#23407A", "accent": "#F2C14E"},
    "column":   {"name": "극동방송 1분 칼럼", "label": "극동방송 1분 칼럼",
                 "c1": "#0B3B3A", "c2": "#1E7A73", "accent": "#FFE27A"},
    "scic":     {"name": "SCIC", "label": "SCIC",
                 "c1": "#2A1650", "c2": "#6B3FA0", "accent": "#FFE14D"},
    "trip":     {"name": "비전트립", "label": "비전트립",
                 "c1": "#4A3212", "c2": "#B07A2E", "accent": "#FFFFFF"},
    "dean":     {"name": "학장 특강", "label": "학장 특강",
                 "c1": "#3E0F1C", "c2": "#932B43", "accent": "#FFD9A0"},
    "lecture":  {"name": "강의", "label": "강의",
                 "c1": "#123A22", "c2": "#2F7D45", "accent": "#FFF08A"},
    "referral": {"name": "추천 영상", "label": "일터아카데미 7기",
                 "c1": "#0E1E3F", "c2": "#23407A", "accent": "#F2C14E"},
}

BRAND_DEFAULT = {
    "channel_name": "사랑글로벌아카데미 SaGA",
    "program": "일터선교&글로벌네트워크아카데미",
    "cta": [
        "7기 모집",
        "카카오톡 ‘사랑글로벌아카데미’",
        "02-3495-8300 · saga121.com",
    ],
    "logo": "",
}


def get(key: str) -> dict:
    if key not in SERIES:
        raise SystemExit(f"알 수 없는 시리즈: {key}  (가능: {', '.join(SERIES)})")
    s = dict(SERIES[key])
    s["key"] = key
    s["theme"] = {"name": s["name"], "c1": s["c1"], "c2": s["c2"], "accent": s["accent"]}
    return s


def brand(cfg: dict) -> dict:
    b = dict(BRAND_DEFAULT)
    b.update({k: v for k, v in (cfg.get("brand") or {}).items() if v not in ("", None, [])})
    return b
