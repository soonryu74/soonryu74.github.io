#!/usr/bin/env python3
"""pdf.html (Paged.js) → 역학조사관_신국판.pdf"""
import sys, time
from playwright.sync_api import sync_playwright

src = sys.argv[1] if len(sys.argv) > 1 else "pdf.html"
out = sys.argv[2] if len(sys.argv) > 2 else "역학조사관_신국판.pdf"

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args=["--no-sandbox"])
    pg = b.new_page()
    pg.on("pageerror", lambda e: print("pageerror:", str(e)[:300]))
    pg.goto(f"file://{src}", wait_until="load", timeout=120000)
    t0 = time.time()
    # 페이지 수가 30초간 변하지 않고 1쪽 이상이면 렌더 완료로 간주
    pages = pg.evaluate("""() => new Promise(resolve => {
        let last = -1, stable = 0;
        const iv = setInterval(() => {
            const n = document.querySelectorAll('.pagedjs_page').length;
            if (n > 0 && n === last) { stable += 1; if (stable >= 10) { clearInterval(iv); resolve(n); } }
            else stable = 0;
            last = n;
        }, 3000);
    })""")
    print(f"paged.js rendered {pages} pages in {time.time()-t0:.0f}s")
    pg.pdf(path=out, prefer_css_page_size=True, print_background=True,
           margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
    b.close()
print("saved", out)
