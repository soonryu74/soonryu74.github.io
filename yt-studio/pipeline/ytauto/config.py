"""설정 불러오기. config.json 이 없으면 기본값만으로도 돌아간다."""
from __future__ import annotations

import copy
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent  # pipeline/

DEFAULTS: dict = {
    "channel_name": "",
    "language": "ko",
    "llm": {
        "provider": "lmstudio",
        "base_url": "",
        "model": "",
        "api_key_env": "",
        "temperature": 0.7,
    },
    "tts": {
        "provider": "edge",
        "voice": "ko-KR-SunHiNeural",
        "rate": "+0%",
        "pitch": "+0Hz",
    },
    "visual": {
        "provider": "card",
        "sd_webui_url": "http://127.0.0.1:7860",
        "gemini_image_model": "gemini-2.5-flash-image",
        "veo_model": "veo-3.1-generate-preview",
        "folder": "",
        "style": "clean, warm, soft light, minimal, no text",
        "fallback": "card",
    },
    "video": {
        "fps": 30,
        "burn_subtitles": True,
        "font_path": "",
        "subtitle_size": 0,
        "bgm_path": "",
        "bgm_volume": 0.12,
        "ken_burns": True,
        "subtitle_style": "boxed",
    },
    "fonts": {"title": "", "subtitle": "", "bold": ""},
    "thumbnail": {
        "layout": "split",
        "theme": "",
        "person_image": "",
        "variants": 3,
        "show_channel": True,
    },
    "upload": {
        "privacy": "private",
        "category_id": "28",
        "made_for_kids": False,
        "contains_synthetic_media": True,
        "upload_captions": True,
        "description_footer": "※ 이 영상의 음성과 일부 화면은 AI 도구로 만들었고, 내용은 직접 확인했습니다.",
    },
}

LLM_DEFAULT_URLS = {
    "lmstudio": "http://localhost:1234/v1",
    "ollama": "http://localhost:11434/v1",
}


def _merge(base: dict, extra: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in extra.items():
        if k.startswith("_"):
            continue  # 설명용 키
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        elif v not in ("", None) or k not in out:
            out[k] = v
    return out


def load_config(path: str | Path | None = None) -> dict:
    p = Path(path) if path else HERE / "config.json"
    cfg = DEFAULTS
    if p.exists():
        with open(p, encoding="utf-8") as f:
            cfg = _merge(DEFAULTS, json.load(f))
    elif path:
        raise FileNotFoundError(f"설정 파일을 찾을 수 없어요: {p}")
    cfg = copy.deepcopy(cfg)
    llm = cfg["llm"]
    if not llm.get("base_url"):
        llm["base_url"] = LLM_DEFAULT_URLS.get(llm["provider"], "")
    return cfg
