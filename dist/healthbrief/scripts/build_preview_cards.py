#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
원문 미리보기 카드 만들기: 각 꼭지의 대표 출처에서 대표 이미지·제목·사이트명을 읽어
newsletter/samples/*.json 에 넣는다. (사진은 원문이 공유용으로 제공하는 대표 이미지)

실행: python3 scripts/build_preview_cards.py
"""
import os, re, json, glob, html, socket, time
import urllib.request, urllib.parse

ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "samples")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

def force_ipv4():
    if getattr(socket, "_v4", False): return
    orig = socket.getaddrinfo
    socket.getaddrinfo = lambda h, *a, **k: [r for r in orig(h, *a, **k) if r[0] == socket.AF_INET] or orig(h, *a, **k)
    socket._v4 = True

def fetch(url, tries=2):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ko,en;q=0.8"})
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.geturl(), r.read(400000).decode("utf-8", "replace")
        except Exception as e:
            if i == tries - 1:
                print("   ! 못 읽음:", str(e)[:60])
    return None, None

def meta(hdoc, *names):
    for n in names:
        m = re.search(r'<meta[^>]+(?:property|name)=["\']%s["\'][^>]*content=["\']([^"\']+)' % re.escape(n), hdoc, re.I)
        if not m:
            m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']%s["\']' % re.escape(n), hdoc, re.I)
        if m:
            return html.unescape(m.group(1)).strip()
    return ""

def pick_link(topic):
    links = []
    for r in topic.get("refs", []):
        _, _, link = r.partition(" — ")
        if link.startswith("http"): links.append(link.strip())
    if not links: return None
    direct = [l for l in links if "news.google.com" not in l]
    return (direct or links)[0]

def main():
    force_ipv4()
    for path in sorted(glob.glob(os.path.join(SAMPLES, "*.json"))):
        data = json.load(open(path, encoding="utf-8"))
        print(os.path.basename(path))
        changed = False
        for i, t in enumerate(data["draft"]["topics"], 1):
            link = pick_link(t)
            if not link: continue
            final, doc = fetch(link)
            if not doc: continue
            img = meta(doc, "og:image", "twitter:image", "twitter:image:src")
            if img and img.startswith("//"): img = "https:" + img
            if img and img.startswith("/"):
                u = urllib.parse.urlparse(final); img = f"{u.scheme}://{u.netloc}{img}"
            card = {
                "title": meta(doc, "og:title", "twitter:title") or (re.search(r"<title[^>]*>(.*?)</title>", doc, re.S|re.I).group(1).strip() if re.search(r"<title[^>]*>(.*?)</title>", doc, re.S|re.I) else ""),
                "site": meta(doc, "og:site_name") or re.sub(r"^www\.", "", urllib.parse.urlparse(final).netloc),
                "desc": meta(doc, "og:description", "description")[:220],
                "image": img, "url": final,
            }
            card["title"] = html.unescape(re.sub(r"\s+", " ", card["title"]))[:150]
            bad = re.match(r"^(redirecting|client challenge|just a moment|attention required|access denied|error)\.?$",
                           card["title"], re.I)
            if not card["title"] or bad or (not card["image"] and not card["desc"]):
                t.pop("card", None); changed = True
                print(f"   {i}. 건너뜀(쓸 만한 미리보기 없음)"); time.sleep(0.3); continue
            t["card"] = card; changed = True
            print(f"   {i}. {card['site']} | 이미지 {'있음' if img else '없음'} | {card['title'][:50]}")
            time.sleep(0.4)
        if changed:
            json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
