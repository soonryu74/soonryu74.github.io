"""대본 생성용 LLM 호출. 로컬(LM Studio·Ollama)과 클라우드(Gemini·OpenAI 호환)를 같은 방식으로 쓴다."""
from __future__ import annotations

import os
import sys

import requests


class LLMError(RuntimeError):
    pass


def _http(base_url: str) -> requests.Session:
    """내 컴퓨터(localhost) 서버는 회사 프록시를 거치지 않고 바로 연결한다."""
    s = requests.Session()
    if any(h in base_url for h in ("localhost", "127.0.0.1", "[::1]")):
        s.trust_env = False
    return s


def _api_key(cfg: dict) -> str:
    env = cfg.get("api_key_env") or ("GEMINI_API_KEY" if cfg["provider"] == "gemini" else "")
    return os.environ.get(env, "") if env else ""


def list_models(cfg: dict) -> list[str]:
    """로컬 서버에 올라와 있는 모델 이름. 연결 확인용."""
    if cfg["provider"] in ("gemini", "manual"):
        return []
    r = _http(cfg["base_url"]).get(cfg["base_url"].rstrip("/") + "/models", timeout=5,
                     headers=_auth_headers(cfg))
    r.raise_for_status()
    return [m.get("id", "") for m in r.json().get("data", [])]


def _auth_headers(cfg: dict) -> dict:
    key = _api_key(cfg)
    return {"Authorization": f"Bearer {key}"} if key else {}


def chat(messages: list[dict], cfg: dict) -> str:
    provider = cfg["provider"]
    if provider == "manual":
        return _manual(messages)
    if provider == "gemini":
        return _gemini(messages, cfg)
    return _openai_compatible(messages, cfg)


def _openai_compatible(messages: list[dict], cfg: dict) -> str:
    base = cfg["base_url"].rstrip("/")
    if not base:
        raise LLMError("llm.base_url 이 비어 있어요. config.json 을 확인해 주세요.")
    model = cfg.get("model")
    if not model:
        try:
            models = [m for m in list_models(cfg) if "embed" not in m.lower()]
        except requests.RequestException as e:
            raise LLMError(
                f"로컬 AI 서버({base})에 연결하지 못했어요. LM Studio 의 'Start Server' 또는 "
                f"'ollama serve' 가 켜져 있는지 확인해 주세요.\n  원인: {e}") from e
        if not models:
            raise LLMError("서버에 불러온 모델이 없어요. LM Studio 에서 모델을 먼저 Load 해 주세요.")
        model = models[0]
    body = {"model": model, "messages": messages, "temperature": cfg.get("temperature", 0.7)}
    try:
        r = _http(base).post(base + "/chat/completions", json=body, timeout=600,
                          headers=_auth_headers(cfg))
    except requests.RequestException as e:
        raise LLMError(f"AI 서버 호출 실패: {e}") from e
    if r.status_code >= 400:
        raise LLMError(f"AI 서버 오류 {r.status_code}: {r.text[:300]}")
    return r.json()["choices"][0]["message"]["content"]


def _gemini(messages: list[dict], cfg: dict) -> str:
    key = _api_key(cfg)
    if not key:
        raise LLMError("GEMINI_API_KEY 환경변수가 없어요. 설치 안내의 'API 키 넣기'를 봐 주세요.")
    model = cfg.get("model") or "gemini-2.5-flash"
    system = "\n".join(m["content"] for m in messages if m["role"] == "system")
    contents = [{"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]}
                for m in messages if m["role"] != "system"]
    body = {
        "contents": contents,
        "generationConfig": {"temperature": cfg.get("temperature", 0.7),
                             "responseMimeType": "application/json"},
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    r = requests.post(url, json=body, timeout=300, headers={"x-goog-api-key": key})
    if r.status_code >= 400:
        raise LLMError(f"Gemini 오류 {r.status_code}: {r.text[:300]}")
    parts = r.json()["candidates"][0]["content"]["parts"]
    return "".join(p.get("text", "") for p in parts)


def _manual(messages: list[dict]) -> str:
    """AI 서버 없이: 프롬프트를 보여 주고, ChatGPT·Claude 답변을 붙여 넣게 한다."""
    print("\n" + "=" * 60)
    print("아래 내용을 통째로 복사해 ChatGPT·Claude·Gemini 창에 붙여 넣으세요.")
    print("=" * 60 + "\n")
    for m in messages:
        print(m["content"] + "\n")
    print("=" * 60)
    print("AI 가 준 JSON 답변을 여기에 붙여 넣고, 마지막 줄에 END 만 입력한 뒤 Enter 를 누르세요.")
    lines = []
    for line in sys.stdin:
        if line.strip() == "END":
            break
        lines.append(line)
    return "".join(lines)
