#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
출처 기관 로고 모으기: 각 꼭지 원문 주소의 사이트 아이콘을 내려받아
newsletter/issues/logos/ 에 저장하고, 샘플 JSON의 꼭지에 logo 로 기록한다.
(원문 대표 이미지를 주지 않는 학술지·기관이 많아, 최소한 어느 사이트인지 눈에 보이게 한다)

실행: python3 scripts/build_source_logos.py
"""
import os, re, json, glob, html, socket, time
import urllib.request, urllib.parse

ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "samples")
LOGOS   = os.path.join(ROOT, "newsletter", "issues", "logos")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

def force_ipv4():
    if getattr(socket, "_v4", False): return
    orig = socket.getaddrinfo
    socket.getaddrinfo = lambda h, *a, **k: [r for r in orig(h, *a, **k) if r[0] == socket.AF_INET] or orig(h, *a, **k)
    socket._v4 = True

def get(url, binary=False, limit=300000):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read(limit)
            return (r.geturl(), raw) if binary else (r.geturl(), raw.decode("utf-8", "replace"))
    except Exception:
        return (None, None)

def pick_link(topic):
    for r in topic.get("refs", []):
        _, _, link = r.partition(" — ")
        link = link.strip()
        if link.startswith("http") and "news.google.com" not in link:
            return link
    for r in topic.get("refs", []):
        _, _, link = r.partition(" — ")
        if link.strip().startswith("http"):
            return link.strip()
    return None

def find_icon(page_url, doc):
    """페이지에서 아이콘 주소를 찾고, 없으면 /favicon.ico 를 쓴다."""
    cands = re.findall(r'<link[^>]+rel=["\'][^"\']*(?:apple-touch-icon|icon)[^"\']*["\'][^>]*>', doc or "", re.I)
    urls = []
    for tag in cands:
        m = re.search(r'href=["\']([^"\']+)', tag)
        if m: urls.append(html.unescape(m.group(1)))
    u = urllib.parse.urlparse(page_url)
    urls.append("/favicon.ico")
    out = []
    for x in urls:
        if x.startswith("//"): out.append("https:" + x)
        elif x.startswith("/"): out.append(f"{u.scheme}://{u.netloc}{x}")
        elif x.startswith("http"): out.append(x)
    return out

def main():
    force_ipv4()
    os.makedirs(LOGOS, exist_ok=True)
    for path in sorted(glob.glob(os.path.join(SAMPLES, "*.json"))):
        data = json.load(open(path, encoding="utf-8")); changed = False
        print(os.path.basename(path))
        for t in data["draft"]["topics"]:
            link = pick_link(t)
            if not link: continue
            final, doc = get(link)
            if not final: 
                print("   · 접속 실패:", t["name"][:18]); continue
            host = re.sub(r"^www\.", "", urllib.parse.urlparse(final).netloc)
            saved = None
            for icon in find_icon(final, doc):
                _, raw = get(icon, binary=True)
                if raw and len(raw) > 500:
                    ext = ".png" if raw[:4] == b"\x89PNG" else (".svg" if b"<svg" in raw[:200] else ".ico")
                    name = re.sub(r"[^a-z0-9.-]", "_", host) + ext
                    open(os.path.join(LOGOS, name), "wb").write(raw)
                    saved = "logos/" + name
                    break
            if saved:
                t["logo"] = {"file": saved, "site": host, "url": final}
                changed = True
                print(f"   · {host} 로고 저장")
            else:
                t.pop("logo", None)
                print(f"   · {host} 아이콘 없음")
            time.sleep(0.3)
        if changed:
            json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
