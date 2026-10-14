/* 「표 서식째 복사」 — 보고서 본문을 한글(HWP)·워드에 Ctrl+V 하면 표·단위·출처가 그대로 들어가도록 클립보드에 HTML 로 넣는다.
   한글·워드는 붙여 넣을 때 <style> 블록이나 화면 CSS 를 거의 읽지 않으므로 표 테두리·칸 여백·머리 배경을 요소마다 인라인으로 박는다.
   서버·외부 요청 없음. 실패하면 false(호출하는 쪽이 워드 저장을 안내). */

const CELL = "border:1px solid #999;padding:3pt 5pt;font-size:9.5pt;vertical-align:top;";
const ROW_BG = { "row-pri": "#fdeceb", "row-watch": "#fff6e0", "rpt-me": "#e8f0fb" };
const TIER_COLOR = { "eq-t-priority": "#b3261e", "eq-t-watch": "#8a5a00", "eq-t-ok": "#1e6b34", "eq-t-na": "#555555" };

/** 보고서 article 요소 → 붙여넣기용 { html, text }. 원본 DOM 은 건드리지 않는다(복제본만 고침). */
export function pasteHtml(root, title = "") {
  if (!root) return null;
  const doc = root.cloneNode(true);
  // 화면 전용 요소(버튼·막대 장식)는 뺀다 — 워드 저장과 같은 규칙
  doc.querySelectorAll(".rpt-noprint, button, .rpt-bar, script, style").forEach((n) => n.remove());
  doc.querySelectorAll("table").forEach((t) => {
    if (t.classList.contains("eq-sbar-track")) return; // 점수 구성 막대는 자체 인라인 스타일(테두리 없음) 유지
    t.setAttribute("border", "1");
    t.setAttribute("cellspacing", "0");
    t.setAttribute("cellpadding", "4");
    t.setAttribute("style", "border-collapse:collapse;width:100%;margin:6pt 0;");
    t.querySelectorAll("tr").forEach((tr) => {
      const bg = Object.entries(ROW_BG).find(([c]) => tr.classList.contains(c))?.[1];
      tr.querySelectorAll("th, td").forEach((c) => {
        const head = c.tagName === "TH";
        c.setAttribute("style", CELL + (head ? "background:#eef2f7;font-weight:bold;" : bg ? `background:${bg};` : ""));
      });
    });
  });
  doc.querySelectorAll("h1").forEach((h) => h.setAttribute("style", "font-size:18pt;margin:0 0 6pt;"));
  doc.querySelectorAll("h2").forEach((h) => h.setAttribute("style", "font-size:14pt;margin:14pt 0 6pt;background:#e8f0fb;border-left:5pt solid #2a78d6;padding:3pt 8pt;"));
  doc.querySelectorAll("h3").forEach((h) => h.setAttribute("style", "font-size:12pt;margin:10pt 0 4pt;border-bottom:1pt solid #c9d6e8;"));
  doc.querySelectorAll(".muted").forEach((n) => n.setAttribute("style", `${n.getAttribute("style") || ""};color:#555555;`));
  doc.querySelectorAll(".eq-tier").forEach((n) => {
    const c = Object.entries(TIER_COLOR).find(([k]) => n.classList.contains(k))?.[1];
    if (c) n.setAttribute("style", `font-weight:bold;color:${c};`);
  });
  const body = `<div style="font-family:'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',sans-serif;font-size:10.5pt;line-height:1.55;color:#111111;">${doc.innerHTML}</div>`;
  const html = `<html><head><meta charset="utf-8">${title ? `<title>${title}</title>` : ""}</head><body>${body}</body></html>`;
  return { html, text: (root.innerText || doc.textContent || "").trim() };
}

/** text/html + text/plain 을 함께 클립보드에. ClipboardItem 이 없거나 거부되면 화면 밖 선택 영역 + execCommand("copy"). */
export async function copyRich(html, text) {
  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      await navigator.clipboard.write([new window.ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      })]);
      return true;
    }
  } catch { /* 아래 방법으로 */ }
  try {
    const box = document.createElement("div");
    box.contentEditable = "true";
    box.style.cssText = "position:fixed;left:-99999px;top:0;opacity:0;";
    box.innerHTML = html.replace(/^[\s\S]*<body>|<\/body>[\s\S]*$/g, "");
    document.body.appendChild(box);
    const range = document.createRange(); range.selectNodeContents(box);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    const ok = document.execCommand("copy");
    sel.removeAllRanges(); box.remove();
    return ok;
  } catch { return false; }
}
