#!/usr/bin/env python3
"""사랑의 베이커리 — 오프닝 로고 범퍼 1장 + 엔딩 카드 2장(A · B). 1280×720.  python3 make_boards.py → canvas/확정/*.dc.html"""
from pathlib import Path
HERE = Path(__file__).resolve().parent; W, H = 1280, 720
INK, DIM, YEL, CREAM = '#2A2320', '#7A6E62', '#F5B223', '#F6EFE0'
FONT_CSS = """@font-face{font-family:'Pretendard';src:url(fonts/Pretendard-Bold.otf);font-weight:700}
@font-face{font-family:'Pretendard';src:url(fonts/Pretendard-Regular.otf);font-weight:400}
body{margin:0}"""
def page(title, body, bg, color):
    return f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>{title}</title></head><body>
<x-dc><helmet><style>{FONT_CSS}</style></helmet>
<div style="position: relative; width: {W}px; height: {H}px; background: {bg}; font-family: 'Pretendard', sans-serif; color: {color}; overflow: hidden">
{body}
</div></x-dc></body></html>"""
def T(x, y, w, h, text, size, *, wt=700, color=None, align='center', lh=None, ls=0, extra=''):
    lh = lh or int(size * 1.4)
    return (f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; font-family: \'Pretendard\', sans-serif; '
            f'font-size: {size}px; line-height: {lh}px; font-weight: {wt}; color: {color}; text-align: {align}; letter-spacing: {ls}px; {extra}">{text}</div>')
def BOX(x, y, w, h, extra=''): return f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; {extra}"></div>'
def IMG(src, x, y, w, h, extra=''): return f'<img src="{src}" style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; object-fit: contain; {extra}">'

boards = {}
# ── 오프닝: 크림 바탕 · 로고 · 이름 · 노란 줄 · 한 줄 ──
boards['OPEN'] = page('오프닝', '\n'.join([
    BOX(0, 0, W, H, f'background: radial-gradient(ellipse at 50% 38%, #FFFBF2 0%, {CREAM} 55%, #EFE3CC 100%)'),
    IMG('재료/logo_mark.png', 510, 118, 260, 262),
    T(240, 408, 800, 100, '사랑의 베이커리', 72, color=INK, ls=-1),
    BOX(590, 522, 100, 8, f'background: {YEL}; border-radius: 4px'),
    T(240, 548, 800, 50, '함께 굽는 따뜻한 하루', 30, wt=400, color=DIM, ls=2),
]), CREAM, INK)
# ── 엔딩 카드: 어두운 따뜻한 바탕 · 로고 · 마무리 문장 · 영문 워드마크 ──
def ending(name, l1, l2):
    boards[name] = page('엔딩', '\n'.join([
        BOX(0, 0, W, H, 'background: radial-gradient(ellipse at 50% 30%, #2E2318 0%, #1A1410 60%, #120E0B 100%)'),
        IMG('재료/logo_mark.png', 550, 86, 180, 181),
        T(140, 318, 1000, 80, l1, 50, color=CREAM),
        T(140, 392, 1000, 80, l2, 50, color='#FFD36A'),
        BOX(590, 500, 100, 6, f'background: {YEL}; border-radius: 3px; opacity: 0.85'),
        IMG('재료/wordmark_white.png', 505, 548, 270, 43),
    ]), '#1A1410', CREAM)
ending('END_A', '한 사람의 일자리가 되도록,', '사랑의 베이커리가 함께하겠습니다.')
ending('END_B', '사람과 기술이 함께 만드는,', '사랑의 베이커리.')
out = HERE / 'canvas' / '확정'; out.mkdir(parents=True, exist_ok=True)
for k, v in boards.items(): (out / f'{k}.dc.html').write_text(v, encoding='utf-8')
print('boards:', ', '.join(boards))
