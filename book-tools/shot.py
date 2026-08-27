#!/usr/bin/env python3
import sys
from playwright.sync_api import sync_playwright

src, out, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": w, "height": h})
    pg.goto(f"file://{src}")
    pg.wait_for_timeout(800)
    pg.screenshot(path=out, clip={"x": 0, "y": 0, "width": w, "height": h})
    b.close()
print("saved", out)
