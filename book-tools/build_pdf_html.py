#!/usr/bin/env python3
"""book.json → pdf.html (Paged.js 조판용, 신국판 152×225mm)"""
import json, html, sys
from inline import md_inline, block_html

book = json.load(open("book.json", encoding="utf-8"))

# 판형: sinkuk(신국판, POD 인쇄용) / a4(집에서 인쇄해 읽는 용)
FMT = sys.argv[1] if len(sys.argv) > 1 else "sinkuk"
PRESET = {
    "sinkuk": dict(size="152mm 225mm", margin="18mm 17mm 20mm 17mm", base="10.3pt",
                   lh="1.72", chgap="16mm 0 12mm 0", out="pdf.html"),
    "a4":     dict(size="A4", margin="22mm 24mm 22mm 24mm", base="11.2pt",
                   lh="1.80", chgap="14mm 0 11mm 0", out="pdf_a4.html"),
}[FMT]

CSS = """
@page {{
  size: {size};
  margin: {margin};
  @bottom-center {{ content: counter(page); font-size: 8.5pt; color: #333; }}
}}
@page :left {{ @top-left {{ content: "역학조사관"; font-size: 8pt; color: #777; letter-spacing: .12em; }} }}
@page :right {{ @top-right {{ content: string(chaptertitle); font-size: 8pt; color: #777; }} }}
@page blank {{ @bottom-center {{ content: none; }} @top-left {{ content: none; }} @top-right {{ content: none; }} }}
@page frontmatter {{ @bottom-center {{ content: none; }} @top-left {{ content: none; }} @top-right {{ content: none; }} }}
@page opener {{ @top-left {{ content: none; }} @top-right {{ content: none; }} @bottom-center {{ content: none; }} }}

html {{ font-size: {base}; }}
body {{
  font-family: "Noto Serif CJK KR", serif;
  line-height: {lh}; color: #111;
  word-break: keep-all; overflow-wrap: break-word;
}}
p {{ margin: 0; text-indent: 1em; text-align: justify; orphans: 2; widows: 2; }}
p.noindent {{ text-indent: 0; }}
strong {{ font-weight: 700; }} em {{ font-style: italic; }}

/* 표제지 */
.titlepage {{ page: frontmatter; page-break-after: always; text-align: center; }}
.titlepage .label {{ margin-top: 34mm; letter-spacing: .6em; font-size: 10pt; color: #7a6a4a; text-indent: 0; }}
.titlepage h1 {{ font-size: 34pt; font-weight: 900; letter-spacing: .1em; margin: 14mm 0 6mm 0; }}
.titlepage .sub {{ font-size: 11pt; color: #444; text-indent: 0; }}
.titlepage .edition {{ margin-top: 60mm; font-size: 9pt; color: #777; text-indent: 0; }}

/* 판권지 */
.copyright {{ page: frontmatter; page-break-after: always; font-size: 8.5pt; color: #555; }}
.copyright .box {{ margin-top: 150mm; border-top: .3pt solid #999; padding-top: 4mm; }}
.copyright p {{ text-indent: 0; text-align: left; line-height: 1.9; }}

/* 차례 */
.toc {{ page: frontmatter; page-break-after: always; }}
.toc h2 {{ text-align: center; font-size: 15pt; letter-spacing: .4em; margin: 10mm 0 12mm 0; }}
.toc .vol {{ font-weight: 900; font-size: 11pt; margin: 6mm 0 2mm 0; text-indent: 0; }}
.toc .part {{ font-weight: 700; font-size: 9.8pt; margin: 3.2mm 0 1.2mm 4mm; text-indent: 0; }}
.toc .ch {{ font-size: 9.3pt; margin: .9mm 0 .9mm 9mm; text-indent: 0; display: flex; align-items: baseline; }}
.toc .ch .t {{ order: 1; }}
.toc .ch .dots {{ order: 2; flex: 1; margin: 0 1.2mm; border-bottom: 1px dotted #999; transform: translateY(-2px); }}
.toc .ch .pg {{ order: 3; }}
.toc a {{ text-decoration: none; color: inherit; }}
.toc .ch .pg a::after {{ content: target-counter(attr(href), page); }}

/* 권 표지 */
.vol-page {{ page: opener; page-break-before: right; text-align: center; string-set: booktitle "역학조사관"; }}
.vol-page .inner {{ margin-top: 70mm; }}
.vol-page h1 {{ font-size: 22pt; font-weight: 900; letter-spacing: .06em; }}
.vol-page .rule {{ width: 24mm; border-top: .8pt solid #9a8a63; margin: 8mm auto 0 auto; }}

/* 부 표지 */
.part-page {{ page: opener; page-break-before: right; text-align: center; }}
.part-page h2 {{ margin-top: 78mm; font-size: 16pt; font-weight: 700; }}

/* 장 */
.chapter {{ page-break-before: always; }}
.chapter h3 {{ string-set: chaptertitle content(text); text-align: center; font-size: 13pt; font-weight: 700; margin: {chgap}; page-break-after: avoid; }}
p.dateline {{ text-indent: 0; text-align: center; font-style: italic; color: #555; margin-bottom: 7mm; }}
.chapter p:first-of-type:not(.dateline) {{ text-indent: 0; }}
""".format(**PRESET)

parts_html = []
A = parts_html.append

A(f"""<div class="titlepage">
<p class="label">장 편 소 설</p>
<h1>{book['title']}</h1>
<p class="sub">{html.escape(book['subtitle'])}</p>
<p class="edition">{html.escape(book['edition'])}</p>
</div>""")

A(f"""<div class="copyright"><div class="box">
<p><strong>역학조사관</strong> — {html.escape(book['subtitle'])}</p>
<p>{html.escape(book['edition'])}</p>
<p>지은이 {html.escape(book['author'])}</p>
<p>이 책의 인물과 사건은 실제 방역사에서 영감을 받은 허구입니다.</p>
</div></div>""")

# 차례 (앵커는 장 제목 id)
toc = ['<div class="toc"><h2>차 례</h2>']
n = 0
for vi, vol in enumerate(book["volumes"], 1):
    toc.append(f'<p class="vol">{md_inline(vol["title"])}</p>')
    for pi, part in enumerate(vol["parts"], 1):
        toc.append(f'<p class="part">{md_inline(part["title"])}</p>')
        for ch in part["chapters"]:
            n += 1
            toc.append(f'<p class="ch"><span class="t">{md_inline(ch["title"])}</span><span class="dots"></span><span class="pg"><a href="#ch{n:03d}"></a></span></p>')
toc.append("</div>")
A("\n".join(toc))

n = 0
for vi, vol in enumerate(book["volumes"], 1):
    A(f'<div class="vol-page"><div class="inner"><h1>{md_inline(vol["title"])}</h1><div class="rule"></div></div></div>')
    for pi, part in enumerate(vol["parts"], 1):
        A(f'<div class="part-page"><h2>{md_inline(part["title"])}</h2></div>')
        for ch in part["chapters"]:
            n += 1
            blocks = "\n".join(block_html(b) for b in ch["blocks"])
            A(f'<section class="chapter" id="ch{n:03d}"><h3>{md_inline(ch["title"])}</h3>\n{blocks}\n</section>')

doc = f"""<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<title>역학조사관</title>
<style>{CSS}</style>
<script src="paged.polyfill.js"></script>
</head><body>
{"".join(parts_html)}
</body></html>"""

open(PRESET["out"], "w", encoding="utf-8").write(doc)
print(PRESET["out"], "written,", len(doc), "chars")
