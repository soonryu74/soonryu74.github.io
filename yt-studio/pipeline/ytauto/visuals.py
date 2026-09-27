"""장면 배경 만들기. 무료 카드 → 로컬 Stable Diffusion → 온라인 이미지 API → 영상 생성 API 순으로 고를 수 있다.

어떤 방법이 실패해도 visual.fallback(기본 card)으로 대신 만들어 영상 제작이 멈추지 않게 한다.
"""
from __future__ import annotations

import base64
import os
import time
import urllib.parse
from pathlib import Path

import requests

from . import render

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_EXT = {".mp4", ".mov", ".webm", ".mkv"}


def make_visual(scene: dict, idx: int, total: int, workdir: Path, fmt: str, cfg: dict,
                fonts: dict, channel: str = "") -> Path:
    """장면 하나의 배경 파일(이미지 또는 영상) 경로를 돌려준다. 이미 있으면 다시 만들지 않는다."""
    vis = cfg["visual"]
    if scene.get("media"):  # 사용자가 직접 지정한 화면 녹화·이미지
        p = Path(scene["media"]).expanduser()
        if not p.is_absolute():
            p = (workdir / p).resolve()
        if p.exists():
            return p
        print(f"  ! 장면 {idx}: 지정한 파일이 없어요 → {p}")
    out_dir = workdir / "visuals"
    out_dir.mkdir(parents=True, exist_ok=True)
    provider = vis.get("provider", "card")
    if provider not in ("card", "folder"):  # AI 로 만든 그림은 비용이 드니 다시 쓰기
        for ext in (".mp4", ".png", ".jpg"):
            cached = out_dir / f"scene{idx:02d}{ext}"
            if cached.exists():
                return cached
    prompt = ", ".join(x for x in [scene.get("visual", ""), vis.get("style", "")] if x)
    try:
        if provider == "folder":
            return _from_folder(vis.get("folder", ""), idx)
        if provider == "sd-webui":
            return _sd_webui(prompt, out_dir / f"scene{idx:02d}.png", fmt, vis)
        if provider == "pollinations":
            return _pollinations(prompt, out_dir / f"scene{idx:02d}.jpg", fmt)
        if provider == "gemini":
            return _gemini_image(prompt, out_dir / f"scene{idx:02d}.png", fmt, vis)
        if provider == "veo":
            return _veo(prompt, out_dir / f"scene{idx:02d}.mp4", fmt, vis)
        if provider != "card":
            raise ValueError(f"알 수 없는 visual.provider: {provider}")
    except Exception as e:
        print(f"  ! 장면 {idx}: {provider} 실패 → {vis.get('fallback', 'card')} 로 대신합니다 ({e})")
    return render.scene_card(out_dir / f"scene{idx:02d}_card.png", fmt, fonts,
                             scene.get("keyword", ""), idx, total, channel)


def _dims(fmt: str, base: int = 1024) -> tuple[int, int]:
    return (576, 1024) if fmt == "shorts" else (1024, 576)


def _from_folder(folder: str, idx: int) -> Path:
    d = Path(folder).expanduser()
    files = sorted(p for p in d.iterdir() if p.suffix.lower() in IMAGE_EXT | VIDEO_EXT)
    if not files:
        raise FileNotFoundError(f"폴더에 이미지·영상이 없어요: {d}")
    return files[(idx - 1) % len(files)]


def _sd_webui(prompt: str, out: Path, fmt: str, vis: dict) -> Path:
    """AUTOMATIC1111 / Forge 를 --api 옵션으로 켠 로컬 Stable Diffusion."""
    w, h = _dims(fmt)
    body = {"prompt": prompt, "negative_prompt": "text, watermark, logo, letters, blurry",
            "width": w, "height": h, "steps": 25}
    r = requests.post(vis["sd_webui_url"].rstrip("/") + "/sdapi/v1/txt2img", json=body, timeout=600)
    r.raise_for_status()
    out.write_bytes(base64.b64decode(r.json()["images"][0].split(",", 1)[-1]))
    return out


def _pollinations(prompt: str, out: Path, fmt: str) -> Path:
    w, h = _dims(fmt)
    url = ("https://image.pollinations.ai/prompt/" + urllib.parse.quote(prompt)
           + f"?width={w}&height={h}&nologo=true")
    r = requests.get(url, timeout=180)
    r.raise_for_status()
    if not r.headers.get("content-type", "").startswith("image"):
        raise RuntimeError("이미지가 아닌 응답")
    out.write_bytes(r.content)
    return out


def _gemini_image(prompt: str, out: Path, fmt: str, vis: dict) -> Path:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY 가 없어요")
    model = vis.get("gemini_image_model", "gemini-2.5-flash-image")
    ratio = "9:16" if fmt == "shorts" else "16:9"
    body = {"contents": [{"parts": [{"text": f"{prompt}. Aspect ratio {ratio}. No text in the image."}]}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": ratio}}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    r = requests.post(url, json=body, timeout=300, headers={"x-goog-api-key": key})
    if r.status_code >= 400:
        raise RuntimeError(f"{r.status_code} {r.text[:200]}")
    for part in r.json()["candidates"][0]["content"]["parts"]:
        data = (part.get("inlineData") or part.get("inline_data") or {}).get("data")
        if data:
            out.write_bytes(base64.b64decode(data))
            return out
    raise RuntimeError("응답에 이미지가 없어요")


def _veo(prompt: str, out: Path, fmt: str, vis: dict) -> Path:
    """구글 Veo 로 짧은 영상 클립 생성 (유료 API). pip install google-genai 필요."""
    from google import genai
    from google.genai import types

    client = genai.Client()  # GEMINI_API_KEY 환경변수를 읽는다
    op = client.models.generate_videos(
        model=vis.get("veo_model", "veo-3.1-generate-preview"),
        prompt=prompt,
        config=types.GenerateVideosConfig(number_of_videos=1,
                                          aspect_ratio="9:16" if fmt == "shorts" else "16:9"),
    )
    waited = 0
    while not op.done:
        if waited > 900:
            raise TimeoutError("영상 생성이 15분을 넘었어요")
        time.sleep(15)
        waited += 15
        op = client.operations.get(op)
    video = op.response.generated_videos[0].video
    client.files.download(file=video)
    video.save(str(out))
    return out
