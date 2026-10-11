"""Global Health Equity Radar v0.2 — 근거(evidence) 링크 확인.

global/data/evidence_registry.json 의 각 URL 을 실제로 GET 해서
  ① HTTP 200(리다이렉트 따라감) ② 페이지 <title> 에 expect_title 문구 포함 ③ 본문에 key_terms 가 모두 있음
을 확인하고 verified 블록(date·http_status·final_url·title_seen·terms_found·ok)을 기록한다.
확인에 실패한 출처는 ok=false 로 남고, build_global.py 가 화면용 global/data/evidence.json 에서 뺀다.
URL 은 이 스크립트로 실제 확인한 공개 문서만 등록한다(추측 URL 금지). 관련성은 전문가 검토 전이다.

사용: python3 scripts/verify_global_evidence.py   (네트워크 필요 — 결과를 registry 에 저장)
"""
import json, re, html, sys, datetime
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
REG = ROOT / "global" / "data" / "evidence_registry.json"
UA = {"User-Agent": "Mozilla/5.0 (link check; Health Equity Radar prototype)", "Accept-Language": "en"}

def check(src):
    out = {"date": datetime.date.today().isoformat(), "http_status": None, "final_url": None, "title_seen": None, "terms_found": [], "ok": False}
    try:
        r = requests.get(src["url"], headers=UA, timeout=45, allow_redirects=True)
    except Exception as e:  # 네트워크 오류는 실패로 기록
        out["error"] = type(e).__name__
        return out
    out["http_status"], out["final_url"] = r.status_code, r.url
    text = r.text if r.status_code == 200 else ""
    m = re.search(r"<title[^>]*>(.*?)</title>", text, re.S | re.I)
    title = re.sub(r"\s+", " ", html.unescape(m.group(1))).strip() if m else None
    out["title_seen"] = title
    body = re.sub(r"<[^>]+>", " ", html.unescape(text)).lower()
    out["terms_found"] = [t for t in src.get("key_terms", []) if t.lower() in body]
    out["ok"] = bool(r.status_code == 200 and title and src["expect_title"].lower() in title.lower()
                     and len(out["terms_found"]) == len(src.get("key_terms", [])) and r.url.split("#")[0].rstrip("/") == src["url"].rstrip("/"))
    if r.status_code == 200 and r.url.rstrip("/") != src["url"].rstrip("/"):
        out["note"] = "redirected — register the final URL instead"
    return out

def main():
    reg = json.loads(REG.read_text(encoding="utf-8"))
    ok = 0
    for s in reg["sources"]:
        v = check(s)
        s["verified"] = v
        ok += v["ok"]
        print(f"{'✔' if v['ok'] else '✘'} {s['id']}: {v['http_status']} · {v['title_seen']!r} · terms {len(v['terms_found'])}/{len(s.get('key_terms', []))}{' · ' + v.get('note', v.get('error', '')) if not v['ok'] else ''}")
    REG.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"확인 {ok}/{len(reg['sources'])}")
    return 0 if ok == len(reg["sources"]) else 2

if __name__ == "__main__":
    sys.exit(main())
