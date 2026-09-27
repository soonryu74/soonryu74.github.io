"""음성 만들기. 기본은 edge-tts(무료, 인터넷 필요)이고 문장별 시간표를 함께 돌려준다."""
from __future__ import annotations

import asyncio
import os
import re
import ssl
from pathlib import Path

from . import media


def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?。…])\s+|\n+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def _proportional(sentences: list[str], total: float, lead: float = 0.1) -> list[tuple[float, float, str]]:
    chars = sum(len(s) for s in sentences) or 1
    t, out = lead, []
    span = max(0.1, total - lead)
    for s in sentences:
        d = span * len(s) / chars
        out.append((t, t + d, s))
        t += d
    return out


def synthesize(text: str, out: Path, cfg: dict) -> list[tuple[float, float, str]]:
    """out(mp3)을 만들고 [(시작초, 끝초, 문장)] 을 돌려준다."""
    out.parent.mkdir(parents=True, exist_ok=True)
    provider = cfg.get("provider", "edge")
    if provider == "silent":
        dur = max(1.5, len(text) / 5.5)  # 한국어 낭독 속도 근사
        media.run(["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{dur:.2f}",
                   "-c:a", "libmp3lame", "-b:a", "64k", str(out)])
        return _proportional(split_sentences(text), dur)
    if provider == "edge":
        return asyncio.run(_edge(text, out, cfg))
    raise ValueError(f"알 수 없는 tts.provider: {provider}")


async def _edge(text: str, out: Path, cfg: dict) -> list[tuple[float, float, str]]:
    import edge_tts
    import edge_tts.communicate as comm

    ca = os.environ.get("SSL_CERT_FILE")
    if ca and Path(ca).exists():  # 회사망 등 사설 인증서 환경 존중
        comm._SSL_CTX = ssl.create_default_context(cafile=ca)
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or None
    kwargs = dict(voice=cfg.get("voice", "ko-KR-SunHiNeural"), rate=cfg.get("rate", "+0%"),
                  pitch=cfg.get("pitch", "+0Hz"), proxy=proxy)
    try:
        c = edge_tts.Communicate(text, boundary="SentenceBoundary", **kwargs)
    except TypeError:  # 옛 버전 edge-tts
        c = edge_tts.Communicate(text, **kwargs)
    cues: list[tuple[float, float, str]] = []
    with open(out, "wb") as f:
        async for chunk in c.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "SentenceBoundary":
                start = chunk["offset"] / 1e7
                cues.append((start, start + chunk["duration"] / 1e7, chunk["text"]))
    total = media.duration(str(out))
    if not cues:  # 문장 시간표를 못 받으면 글자 수 비율로 나눈다
        return _proportional(split_sentences(text), total)
    return cues


async def korean_voices() -> list[str]:
    import edge_tts
    vs = await edge_tts.list_voices()
    return [f'{v["ShortName"]} ({v["Gender"]})' for v in vs if v["Locale"].startswith("ko-")]
