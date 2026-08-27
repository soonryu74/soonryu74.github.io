#!/usr/bin/env python3
"""book.json → EPUB3 (역학조사관.epub)"""
import json, zipfile, uuid, datetime, html
from inline import md_inline, block_html

book = json.load(open("book.json", encoding="utf-8"))
OUT = "역학조사관.epub"
BOOK_ID = "urn:uuid:" + str(uuid.uuid5(uuid.NAMESPACE_URL, "soonryu74/epidemiologist-novel"))
NOW = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

CSS = """
@namespace epub "http://www.idpf.org/2007/ops";
html { -epub-writing-mode: horizontal-tb; }
body { font-family: serif; line-height: 1.75; margin: 0 4%; word-break: keep-all; }
h1, h2, h3 { font-weight: 700; text-align: center; page-break-after: avoid; }
p { margin: 0; text-indent: 1em; text-align: justify; }
p.dateline { text-indent: 0; text-align: center; font-style: italic; color: #555; margin: 0 0 2em 0; }
p.noindent { text-indent: 0; }
.vol-page, .part-page { text-align: center; margin-top: 30%; }
.vol-page h1 { font-size: 1.9em; letter-spacing: .08em; }
.part-page h2 { font-size: 1.5em; }
.chapter h3 { font-size: 1.25em; margin: 3em 0 2.2em 0; }
.titlepage { text-align: center; margin-top: 22%; }
.titlepage .label { letter-spacing: .5em; font-size: .9em; color: #866; }
.titlepage h1 { font-size: 2.4em; margin: .4em 0 .2em 0; letter-spacing: .1em; }
.titlepage .sub { color: #555; margin-top: 1em; }
.titlepage .edition { margin-top: 4em; font-size: .85em; color: #888; }
.cover { text-align: center; margin: 0; }
.cover img { max-width: 100%; max-height: 100%; }
nav ol { list-style: none; padding-left: 1em; }
nav li { margin: .3em 0; }
"""

def xhtml(title, body):
    return f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko" lang="ko">
<head><meta charset="utf-8"/><title>{html.escape(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>{body}</body></html>"""

# ---- 문서 생성 ----
docs = []   # (filename, title, xhtml, in_spine, toc_level) toc_level: 0 vol,1 part,2 chapter, None skip
docs.append(("cover.xhtml", "표지", xhtml("표지", '<div class="cover" epub:type="cover"><img src="cover.png" alt="역학조사관 표지"/></div>'), True, None))
tp = f"""<div class="titlepage" epub:type="titlepage">
<p class="label noindent">장 편 소 설</p>
<h1>{book['title']}</h1>
<p class="sub noindent">{html.escape(book['subtitle'])}</p>
<p class="edition noindent">{html.escape(book['edition'])}</p>
</div>"""
docs.append(("title.xhtml", "속표지", xhtml("역학조사관", tp), True, None))

toc_entries = []  # (level, title, file)
n = 0
for vi, vol in enumerate(book["volumes"], 1):
    fn = f"vol{vi}.xhtml"
    docs.append((fn, vol["title"], xhtml(vol["title"], f'<div class="vol-page"><h1>{md_inline(vol["title"])}</h1></div>'), True, None))
    toc_entries.append((0, vol["title"], fn))
    for pi, part in enumerate(vol["parts"], 1):
        fn = f"vol{vi}_part{pi}.xhtml"
        docs.append((fn, part["title"], xhtml(part["title"], f'<div class="part-page"><h2>{md_inline(part["title"])}</h2></div>'), True, None))
        toc_entries.append((1, part["title"], fn))
        for ch in part["chapters"]:
            n += 1
            fn = f"ch{n:03d}.xhtml"
            body = [f'<section class="chapter" epub:type="chapter"><h3>{md_inline(ch["title"])}</h3>']
            body += [block_html(b) for b in ch["blocks"]]
            body.append("</section>")
            docs.append((fn, ch["title"], xhtml(ch["title"], "\n".join(body)), True, None))
            toc_entries.append((2, ch["title"], fn))

# ---- nav ----
def build_nav(entries):
    out = ["<ol>"]
    prev = 0
    for lvl, title, fn in entries:
        if lvl > prev:
            out.append("<ol>" * (lvl - prev))
        elif lvl < prev:
            out.append("</li>" + "</ol></li>" * (prev - lvl))
        else:
            out.append("</li>")
        out.append(f'<li><a href="{fn}">{md_inline(title)}</a>')
        prev = lvl
    out.append("</li>" + "</ol></li>" * prev)
    out.append("</ol>")
    s = "".join(out).replace("<ol></li>", "<ol>", 1)
    return s

nav_body = f"""<nav epub:type="toc" id="toc"><h2>차례</h2>{build_nav(toc_entries)}</nav>
<nav epub:type="landmarks" hidden=""><ol>
<li><a epub:type="cover" href="cover.xhtml">표지</a></li>
<li><a epub:type="toc" href="nav.xhtml">차례</a></li>
<li><a epub:type="bodymatter" href="vol1.xhtml">본문</a></li>
</ol></nav>"""
nav_doc = xhtml("차례", nav_body)

# ---- OPF ----
manifest, spine = [], []
manifest.append('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>')
manifest.append('<item id="css" href="style.css" media-type="text/css"/>')
manifest.append('<item id="cover-img" href="cover.png" media-type="image/png" properties="cover-image"/>')
for i, (fn, title, doc, in_spine, _) in enumerate(docs):
    manifest.append(f'<item id="d{i}" href="{fn}" media-type="application/xhtml+xml"/>')
    spine.append(f'<itemref idref="d{i}"/>')
spine.insert(2, '<itemref idref="nav"/>')  # 표지, 속표지 다음에 차례

opf = f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="ko">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">{BOOK_ID}</dc:identifier>
<dc:title>{html.escape(book['title'])}</dc:title>
<dc:creator>{html.escape(book['author'])}</dc:creator>
<dc:language>ko</dc:language>
<dc:description>{html.escape(book['subtitle'] + ' — ' + book['edition'])}</dc:description>
<meta property="dcterms:modified">{NOW}</meta>
<meta name="cover" content="cover-img"/>
</metadata>
<manifest>{''.join(manifest)}</manifest>
<spine>{''.join(spine)}</spine>
</package>"""

container = """<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>"""

with zipfile.ZipFile(OUT, "w") as z:
    z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
    z.writestr("META-INF/container.xml", container, compress_type=zipfile.ZIP_DEFLATED)
    z.writestr("OEBPS/content.opf", opf, compress_type=zipfile.ZIP_DEFLATED)
    z.writestr("OEBPS/nav.xhtml", nav_doc, compress_type=zipfile.ZIP_DEFLATED)
    z.writestr("OEBPS/style.css", CSS, compress_type=zipfile.ZIP_DEFLATED)
    z.write("cover.png", "OEBPS/cover.png", compress_type=zipfile.ZIP_DEFLATED)
    for fn, title, doc, _, _ in docs:
        z.writestr(f"OEBPS/{fn}", doc, compress_type=zipfile.ZIP_DEFLATED)

import os
print("built", OUT, os.path.getsize(OUT), "bytes,", len(docs), "docs")
