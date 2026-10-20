"""카드뉴스 6컷을 1080x1080 PNG(300dpi 메타)로 내보내기.
사용: python3 export.py   (Playwright + Chromium 필요: pip install playwright && playwright install chromium)
"""
import os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    exe = os.environ.get("CHROMIUM_PATH") or ("/opt/pw-browsers/chromium" if os.path.exists("/opt/pw-browsers/chromium") else None)
    b = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
    pg = b.new_page(viewport={"width": 1200, "height": 1200}, device_scale_factor=1)
    pg.goto((HERE / "index.html").as_uri(), wait_until="networkidle")
    pg.wait_for_timeout(800)  # 웹폰트 로딩 여유
    for i in range(1, 7):
        el = pg.locator(f"#c{i}")
        el.screenshot(path=str(OUT / f"card-{i}.png"), type="png")
        print("saved", OUT / f"card-{i}.png")
    b.close()

# 300dpi 메타데이터 기록(PIL 있으면)
try:
    from PIL import Image
    for i in range(1, 7):
        f = OUT / f"card-{i}.png"
        im = Image.open(f).crop((0, 0, 1080, 1080)); im.save(f, dpi=(300, 300))
    print("dpi=300 written")
except ImportError:
    print("Pillow 없음: dpi 메타 생략 (pip install pillow)")
