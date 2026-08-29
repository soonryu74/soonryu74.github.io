#!/usr/bin/env python3
"""book.json → reader.html (웹 전자책 리더 아티팩트)"""
import json

book = json.load(open("book.json", encoding="utf-8"))

# 장 목록 평탄화: [{vol, part, title, blocks}]
chapters = []
for vol in book["volumes"]:
    for part in vol["parts"]:
        for ch in part["chapters"]:
            chapters.append({
                "vol": vol["title"], "part": part["title"],
                "title": ch["title"], "blocks": ch["blocks"],
            })

data = json.dumps({"chapters": chapters}, ensure_ascii=False).replace("</", "<\\/")

HTML = """<title>역학조사관</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;900&family=Gowun+Batang:wght@400;700&display=swap">
<style>
:root {
  --paper: #faf8f3; --panel: #f1ede4; --ink: #24303e; --ink-soft: #5a6675;
  --line: #ddd6c8; --accent: #8a6d3b; --accent-soft: #b49a68;
  --navy: #10294a; --sel: #e9e2d2;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #0e1c2e; --panel: #0a1524; --ink: #dce4ee; --ink-soft: #8fa0b4;
    --line: #24374e; --accent: #d2b57c; --accent-soft: #9a8455;
    --navy: #d2b57c; --sel: #1a2c44;
  }
}
:root[data-theme="dark"] {
  --paper: #0e1c2e; --panel: #0a1524; --ink: #dce4ee; --ink-soft: #8fa0b4;
  --line: #24374e; --accent: #d2b57c; --accent-soft: #9a8455;
  --navy: #d2b57c; --sel: #1a2c44;
}
* { margin: 0; box-sizing: border-box; }
body {
  background: var(--paper); color: var(--ink);
  font-family: "Noto Serif KR", "Gowun Batang", serif;
  line-height: 1.85; word-break: keep-all;
}
a { color: inherit; }
.app { display: flex; min-height: 100vh; }

/* ── 차례 패널 ── */
nav {
  width: 300px; flex-shrink: 0; background: var(--panel);
  border-right: 1px solid var(--line);
  height: 100vh; overflow-y: auto; position: sticky; top: 0;
  padding: 22px 0 40px;
}
nav .bookmark { padding: 0 22px 14px; border-bottom: 1px solid var(--line); }
nav .bookmark .lbl { font-size: 11px; letter-spacing: .35em; color: var(--accent); }
nav .bookmark h1 { font-size: 21px; font-weight: 900; letter-spacing: .05em; margin-top: 4px; }
nav .vol { font-size: 12.5px; font-weight: 900; color: var(--accent); padding: 18px 22px 4px; letter-spacing: .05em; }
nav .part { font-size: 12px; font-weight: 600; color: var(--ink-soft); padding: 10px 22px 2px; }
nav button.ch {
  display: block; width: 100%; text-align: left; border: 0; background: none;
  font: inherit; font-size: 13px; color: var(--ink);
  padding: 4px 22px 4px 34px; cursor: pointer; line-height: 1.5;
}
nav button.ch:hover { background: var(--sel); }
nav button.ch.on { background: var(--sel); color: var(--accent); font-weight: 600; }
nav button.ch:focus-visible, .bar button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

/* ── 본문 ── */
main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.bar {
  position: sticky; top: 0; z-index: 5; background: var(--paper);
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 10px; padding: 10px 18px;
}
.bar .where { flex: 1; font-size: 12px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar button {
  border: 1px solid var(--line); background: var(--panel); color: var(--ink);
  font: inherit; font-size: 13px; padding: 4px 12px; border-radius: 3px; cursor: pointer;
}
.bar button:hover { border-color: var(--accent-soft); }
#menu-btn { display: none; }

.page { max-width: 39rem; width: 100%; margin: 0 auto; padding: 54px 26px 40px; flex: 1; }
.page .part-line { text-align: center; font-size: 12px; letter-spacing: .25em; color: var(--accent); margin-bottom: 10px; }
.page h2 { text-align: center; font-size: 22px; font-weight: 900; margin-bottom: 40px; text-wrap: balance; }
.page .dateline { text-align: center; font-style: italic; color: var(--ink-soft); margin-bottom: 34px; }
.page p { text-indent: 1em; text-align: justify; }
.page p.first { text-indent: 0; }
.footnav { display: flex; justify-content: space-between; gap: 12px; max-width: 39rem; margin: 0 auto; padding: 10px 26px 70px; }
.footnav button {
  border: 1px solid var(--line); background: var(--panel); color: var(--ink);
  font: inherit; font-size: 14px; padding: 10px 20px; border-radius: 3px; cursor: pointer; max-width: 46%;
  text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.footnav button:hover { border-color: var(--accent-soft); }
.footnav button:disabled { opacity: .35; cursor: default; }
.footnav .next { text-align: right; margin-left: auto; }

@media (max-width: 860px) {
  nav { position: fixed; left: 0; top: 0; z-index: 20; transform: translateX(-100%); transition: transform .2s; box-shadow: 4px 0 24px rgba(0,0,0,.25); }
  body.nav-open nav { transform: none; }
  #menu-btn { display: block; }
  .page { padding-top: 34px; }
}
@media (prefers-reduced-motion: reduce) { nav { transition: none; } }
</style>
<div class="app">
<nav id="nav" aria-label="차례"></nav>
<main>
  <div class="bar">
    <button id="menu-btn" aria-label="차례 열기">차례</button>
    <span class="where" id="where"></span>
    <button id="smaller" aria-label="글자 작게">가−</button>
    <button id="bigger" aria-label="글자 크게">가+</button>
  </div>
  <article class="page" id="page"></article>
  <div class="footnav">
    <button id="prev"></button>
    <button id="next" class="next"></button>
  </div>
</main>
</div>
<script type="application/json" id="book-data">__DATA__</script>
<script>
const DATA = JSON.parse(document.getElementById("book-data").textContent);
const CH = DATA.chapters;
const $ = id => document.getElementById(id);
let cur = 0, fontPx = 17;
try {
  const s = JSON.parse(localStorage.getItem("yhjsg-reader") || "{}");
  if (Number.isInteger(s.ch) && s.ch >= 0 && s.ch < CH.length) cur = s.ch;
  if (s.font >= 14 && s.font <= 24) fontPx = s.font;
} catch (e) {}

function save() { try { localStorage.setItem("yhjsg-reader", JSON.stringify({ch: cur, font: fontPx})); } catch (e) {} }

function esc(t) { return t.replace(/&/g,"&amp;").replace(/</g,"&lt;"); }
function inline(t) {
  return esc(t)
    .replace(/\\*\\*([^*\\n]+)\\*\\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\\*([^*\\n]+)\\*(?!\\*)/g, "$1<em>$2</em>")
    .replace(/\\n/g, "<br>");
}

// 차례
(function buildNav() {
  const nav = $("nav");
  let html = '<div class="bookmark"><div class="lbl">장 편 소 설</div><h1>역학조사관</h1></div>';
  let lastVol = "", lastPart = "";
  CH.forEach((c, i) => {
    if (c.vol !== lastVol) { html += `<div class="vol">${esc(c.vol)}</div>`; lastVol = c.vol; lastPart = ""; }
    if (c.part !== lastPart) { html += `<div class="part">${esc(c.part)}</div>`; lastPart = c.part; }
    html += `<button class="ch" data-i="${i}">${esc(c.title)}</button>`;
  });
  nav.innerHTML = html;
  nav.addEventListener("click", e => {
    const b = e.target.closest("button.ch");
    if (b) { go(+b.dataset.i); document.body.classList.remove("nav-open"); }
  });
})();

function go(i) {
  cur = Math.max(0, Math.min(CH.length - 1, i));
  const c = CH[cur];
  let html = `<div class="part-line">${esc(c.part)}</div><h2>${esc(c.title)}</h2>`;
  let firstP = true;
  for (const b of c.blocks) {
    if (b.type === "dateline") { html += `<div class="dateline">${inline(b.text)}</div>`; continue; }
    html += `<p class="${firstP ? "first" : ""}">${inline(b.text)}</p>`;
    firstP = false;
  }
  $("page").innerHTML = html;
  $("page").style.fontSize = fontPx + "px";
  $("where").textContent = `${c.vol.replace(/ —.*/, "")} · ${c.title}  (${cur + 1}/${CH.length})`;
  $("prev").textContent = cur > 0 ? "← " + CH[cur - 1].title : "처음";
  $("prev").disabled = cur === 0;
  $("next").textContent = cur < CH.length - 1 ? CH[cur + 1].title + " →" : "끝";
  $("next").disabled = cur === CH.length - 1;
  document.querySelectorAll("nav .ch").forEach(b => b.classList.toggle("on", +b.dataset.i === cur));
  const on = document.querySelector("nav .ch.on");
  if (on) on.scrollIntoView({ block: "nearest" });
  window.scrollTo(0, 0);
  save();
}

$("prev").onclick = () => go(cur - 1);
$("next").onclick = () => go(cur + 1);
$("menu-btn").onclick = () => document.body.classList.toggle("nav-open");
$("bigger").onclick = () => { fontPx = Math.min(24, fontPx + 1); $("page").style.fontSize = fontPx + "px"; save(); };
$("smaller").onclick = () => { fontPx = Math.max(14, fontPx - 1); $("page").style.fontSize = fontPx + "px"; save(); };
document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") go(cur - 1);
  if (e.key === "ArrowRight") go(cur + 1);
});
go(cur);
</script>
"""

out = HTML.replace("__DATA__", data)
open("reader.html", "w", encoding="utf-8").write(out)
print("reader.html", len(out), "chars")
