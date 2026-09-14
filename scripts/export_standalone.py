#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
독립 저장소용 묶음 만들기: 지금 구조(newsletter/ 아래)를 새 저장소 루트 구조로 복사한다.
  → dist/healthbrief/  (그대로 새 저장소에 올리면 됨)

새 주소를 인자로 주면 site-config.json 의 baseUrl 도 바꿔 준다.
  python3 scripts/export_standalone.py https://healthbrief.github.io
"""
import os, re, sys, json, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(ROOT, "dist", "healthbrief")

# (원래 위치, 새 저장소에서의 위치)
COPY = [
    ("newsletter/index.html",        "index.html"),
    ("newsletter/paper.css",         "paper.css"),
    ("newsletter/email.js",          "email.js"),
    ("newsletter/subscribe.html",    "subscribe.html"),
    ("newsletter/subscribe-config.json", "subscribe-config.json"),
    ("newsletter/site-config.json",  "site-config.json"),
    ("newsletter/README.md",         "README.md"),
    ("newsletter/vendor",            "vendor"),
    ("newsletter/samples",           "samples"),
    ("newsletter/issues",            "issues"),
    ("data/newsletter/sources.json", "data/sources.json"),
    ("data/newsletter/feed.json",    "data/feed.json"),
    ("scripts/build_outbreak_feed.py",      "scripts/build_outbreak_feed.py"),
    ("scripts/render_newsletter_issues.py", "scripts/render_newsletter_issues.py"),
    ("scripts/build_trend_charts.py",       "scripts/build_trend_charts.py"),
    ("scripts/build_preview_cards.py",      "scripts/build_preview_cards.py"),
    ("scripts/build_source_logos.py",       "scripts/build_source_logos.py"),
]

# 새 구조에서 달라지는 경로
REWRITE = [
    ("../data/newsletter/sources.json", "data/sources.json"),
    ("../data/newsletter/feed.json",    "data/feed.json"),
    ('os.path.join(ROOT, "data", "newsletter", "sources.json")', 'os.path.join(ROOT, "data", "sources.json")'),
    ('os.path.join(ROOT, "data", "newsletter", "feed.json")',    'os.path.join(ROOT, "data", "feed.json")'),
    ('os.path.join(ROOT, "newsletter", "samples")',  'os.path.join(ROOT, "samples")'),
    ('os.path.join(ROOT, "newsletter", "issues")',   'os.path.join(ROOT, "issues")'),
    ('os.path.join(ROOT, "newsletter", "site-config.json")', 'os.path.join(ROOT, "site-config.json")'),
    ('data/newsletter/feed.json',  'data/feed.json'),
]

WORKFLOW = """name: 뉴스레터 소스 자동 수집

# 기관 발표·논문을 매일 모아 data/feed.json 을 갱신합니다. 별도 키가 필요 없습니다.
on:
  schedule:
    - cron: '0 20 * * *'    # UTC 20:00 = KST 05:00
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - name: 소스 수집
        run: python3 scripts/build_outbreak_feed.py
      - name: 변경 시 커밋
        run: |
          if git diff --quiet -- data/feed.json; then
            echo "변경 없음"
          else
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add data/feed.json
            git commit -m "뉴스레터 소스 자동 갱신"
            git push
          fi
"""

def rewrite(text):
    for a, b in REWRITE:
        text = text.replace(a, b)
    return text

def main():
    base = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else None
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)

    for src, dst in COPY:
        s = os.path.join(ROOT, src)
        d = os.path.join(OUT, dst)
        os.makedirs(os.path.dirname(d), exist_ok=True)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        elif os.path.exists(s):
            shutil.copy2(s, d)
        else:
            print("  · 없음(건너뜀):", src)

    # 경로 바꾸기
    for root, _, files in os.walk(OUT):
        for f in files:
            if not f.endswith((".html", ".py", ".js", ".json", ".md", ".yml")):
                continue
            fp = os.path.join(root, f)
            try:
                t = open(fp, encoding="utf-8").read()
            except Exception:
                continue
            n = rewrite(t)
            if n != t:
                open(fp, "w", encoding="utf-8").write(n)

    # 새 주소 반영
    cfg_path = os.path.join(OUT, "site-config.json")
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    if base:
        cfg["baseUrl"] = base
        json.dump(cfg, open(cfg_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    os.makedirs(os.path.join(OUT, ".github", "workflows"), exist_ok=True)
    open(os.path.join(OUT, ".github", "workflows", "newsletter.yml"), "w", encoding="utf-8").write(WORKFLOW)
    open(os.path.join(OUT, ".nojekyll"), "w").write("")

    n = sum(len(fs) for _, _, fs in os.walk(OUT))
    print(f"묶음 완성: {OUT} ({n}개 파일)")
    print("새 주소:", cfg["baseUrl"])
    print("\n다음 순서로 올리시면 됩니다:")
    print("  1. github.com/organizations/new 에서 조직 healthbrief 만들기(무료)")
    print("  2. 그 조직에 저장소 healthbrief.github.io 만들기(공개)")
    print("  3. 이 폴더의 파일을 저장소 루트에 올리기")
    print("  4. Settings → Pages → Source: main 브랜치 / 루트")
    print("  5. 몇 분 뒤 https://healthbrief.github.io 에서 열림")

if __name__ == "__main__":
    main()
