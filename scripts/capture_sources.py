#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
원문 화면 캡처: 각 꼭지의 대표 출처 페이지 상단을 그림으로 저장한다.
  newsletter/samples/*.json  →  newsletter/issues/shots/<호>-<번호>.jpg

- 원문 페이지의 '윗부분(제목·기관 영역)'만 담고, 뉴스레터에는 출처와 원문 링크를 함께 싣는다.
- 열리지 않는 주소는 건너뛴다(차단·로그인 필요 등).
실행: python3 scripts/capture_sources.py
"""
import os, json, glob, re, sys

PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or ""

ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "newsletter", "samples")
SHOTS   = os.path.join(ROOT, "newsletter", "issues", "shots")
CHROME  = "/opt/pw-browsers/chromium"
W, H    = 1280, 620          # 캡처 크기(상단 영역)

HIDE = """
  (() => {
    const bad = /cookie|consent|gdpr|banner|paywall|newsletter-signup|onetrust|modal|overlay|subscribe/i;
    document.querySelectorAll('div,section,aside,dialog').forEach(el => {
      const s = getComputedStyle(el);
      if ((s.position === 'fixed' || s.position === 'sticky') &&
          (bad.test(el.className || '') || bad.test(el.id || ''))) el.remove();
    });
    document.querySelectorAll('[id*=onetrust],[class*=cookie],[class*=consent]').forEach(el => el.remove());
    document.body.style.overflow = 'visible';
  })();
"""

def pick_link(topic):
    """꼭지에서 캡처할 대표 주소 — 기관·학술지 주소를 뉴스 중계 주소보다 먼저 고른다."""
    links = []
    for r in topic.get("refs", []):
        _, _, link = r.partition(" — ")
        if link.startswith("http"):
            links.append(link.strip())
    if not links:
        return None
    direct = [l for l in links if "news.google.com" not in l]
    return (direct or links)[0]

def main():
    from playwright.sync_api import sync_playwright
    os.makedirs(SHOTS, exist_ok=True)
    jobs = []
    for path in sorted(glob.glob(os.path.join(SAMPLES, "*.json"))):
        data = json.load(open(path, encoding="utf-8"))
        stem = os.path.basename(path).replace(".json", "")
        for i, t in enumerate(data["draft"]["topics"], 1):
            link = pick_link(t)
            if link:
                jobs.append((path, data, stem, i, t, link))

    changed = set()
    with sync_playwright() as p:
        launch_args = {"executable_path": CHROME}
        if PROXY:                       # 이 환경에서는 프록시를 거쳐야 바깥 사이트에 닿는다
            launch_args["proxy"] = {"server": PROXY}
        br = p.chromium.launch(**launch_args)
        ctx = br.new_context(viewport={"width": W, "height": H},
                             user_agent=("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                                         "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
                             locale="ko-KR", ignore_https_errors=True)
        for path, data, stem, i, t, link in jobs:
            name = f"{stem}-{i}.jpg"
            out = os.path.join(SHOTS, name)
            pg = ctx.new_page()
            try:
                pg.goto(link, wait_until="domcontentloaded", timeout=35000)
                pg.wait_for_timeout(2500)
                pg.evaluate(HIDE)
                pg.wait_for_timeout(400)
                pg.screenshot(path=out, type="jpeg", quality=78,
                              clip={"x": 0, "y": 0, "width": W, "height": H})
                host = re.sub(r"^www\.", "", pg.url.split("/")[2]) if "://" in pg.url else ""
                t["shot"] = {"file": "shots/" + name, "site": host, "url": pg.url}
                changed.add(path)
                print(f"  캡처: {name}  ({host})")
            except Exception as ex:
                t.pop("shot", None)
                print(f"  건너뜀: {name} — {str(ex)[:70]}")
            finally:
                pg.close()
        br.close()

    for path in changed:
        data = next(d for p2, d, *_ in jobs if p2 == path)
        json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("완료:", len(changed), "개 호 갱신")

if __name__ == "__main__":
    main()
