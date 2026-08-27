"""인라인 마크다운(** 굵게, * 기울임) → HTML 변환 공용 모듈."""
import html, re

def md_inline(s: str) -> str:
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*([^*\n]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", s)
    return s

def block_html(b: dict) -> str:
    if b["type"] == "dateline":
        return f'<p class="dateline">{md_inline(b["text"])}</p>'
    lines = b["text"].split("\n")
    return "<p>" + "<br/>".join(md_inline(l) for l in lines) + "</p>"
