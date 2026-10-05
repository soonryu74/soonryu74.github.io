#!/usr/bin/env python3
"""
qr.py — 이북의 영상 페이지에 QR 코드를 자동으로 채운다 (선택 사항).

쓰임:
    python3 qr.py mybook.html

동작:
    <div class="vwrap" data-v="YOUTUBE_ID"> 를 모두 찾아,
    같은 영상 페이지의 <img class="qr" ...> src 를 youtu.be/ID 를 가리키는
    인라인 SVG QR 로 교체한다. (segno 필요: pip install segno)

QR 이 필요 없으면 이 스크립트를 쓰지 말고, 템플릿의 <div class="vqr">...</div> 를
통째로 지우거나 링크 텍스트만 남겨도 된다.
"""
import re, sys, urllib.parse

def make_svg(url):
    import segno
    import io
    buf = io.StringIO()
    segno.make(url, error='m').save(buf, kind='svg', border=0, xmldecl=False, svgns=True, dark='#15130f')
    return buf.getvalue()

def main(path):
    try:
        import segno  # noqa
    except ImportError:
        print("segno 가 없습니다. 설치: pip install segno  (QR 없이 가려면 .vqr 블록을 삭제하세요)")
        return 1
    html = open(path, encoding='utf-8').read()
    ids = re.findall(r'class="vwrap"\s+data-v="([^"]+)"', html)
    if not ids:
        print("영상 페이지(.vwrap[data-v]) 를 찾지 못했습니다.")
        return 0
    # 각 영상 페이지 블록 단위로 교체
    def repl(m):
        block = m.group(0)
        vid = re.search(r'data-v="([^"]+)"', block)
        if not vid:
            return block
        url = "https://youtu.be/" + vid.group(1)
        svg = make_svg(url)
        datauri = "data:image/svg+xml;utf8," + urllib.parse.quote(svg)
        block = re.sub(r'(<img class="qr"[^>]*?src=")[^"]*(")', r'\g<1>' + datauri + r'\g<2>', block)
        return block
    # vidpg 블록을 넉넉히 잡아 교체
    html = re.sub(r'<div class="vidpg">.*?</div>\s*</div>\s*</div>\s*</section>', repl, html, flags=re.S)
    open(path, 'w', encoding='utf-8').write(html)
    print(f"QR {len(ids)}개 채움: {path}")
    return 0

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("사용법: python3 qr.py <ebook.html>")
        sys.exit(1)
    sys.exit(main(sys.argv[1]))
