#!/usr/bin/env python3
"""「직지 상권을 찾습니다」 아트보드 생성 — canvas/anim (손그림 · 종이) · canvas/real (실사 · 시네마) 각 21장.
장면 번호 · 글(대본의 사실)은 두 판이 같고, 그림만 다르다: anim = SVG 선 그림(손맛), real = 사진(재료/bg/*.jpg).
python3 make_boards.py  →  canvas/anim/S01.dc.html … · canvas/real/S01.dc.html …"""
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
W, H = 1920, 1080

# ── 색 · 글꼴 ──
A = dict(bg='linear-gradient(160deg, #F6EFE0 0%, #EADFC9 100%)', ink='#2A2320', dim='#6E645A', red='#B5382A', gold='#B8923E', line='#2A2320', paper='#F6EFE0')
R = dict(bg='linear-gradient(180deg, #0F0D0B 0%, #1A1613 100%)', ink='#F2E9D8', dim='#A89C88', red='#D9533F', gold='#D8B66A', line='#D8B66A', paper='#141210')
FONT_CSS = """@font-face{font-family:'Myeongjo';src:url(fonts/NanumMyeongjoEB.ttf);font-weight:800}
@font-face{font-family:'Serif';src:url(fonts/NotoSerifKR-Bold.otf);font-weight:700}
@font-face{font-family:'Pen';src:url(fonts/NanumPenScript-Regular.ttf);font-weight:400}
@font-face{font-family:'Pretendard';src:url(fonts/Pretendard-Bold.otf);font-weight:700}
@font-face{font-family:'Pretendard';src:url(fonts/Pretendard-Regular.otf);font-weight:400}
body{margin:0}"""


def page(title, body, bg, color):
    return f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>{title}</title></head><body>
<x-dc><helmet><style>{FONT_CSS}</style></helmet>
<div style="position: relative; width: {W}px; height: {H}px; background: {bg}; font-family: 'Pretendard', sans-serif; color: {color}; overflow: hidden">
{body}
</div></x-dc></body></html>"""


def T(x, y, w, h, text, size, *, fam='Pretendard', wt=400, color=None, align='left', lh=None, ls=0, extra=''):
    lh = lh or int(size * 1.35)
    return (f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; font-family: \'{fam}\', sans-serif; '
            f'font-size: {size}px; line-height: {lh}px; font-weight: {wt}; color: {color}; text-align: {align}; letter-spacing: {ls}px; {extra}">{text}</div>')


def BOX(x, y, w, h, extra=''):
    return f'<div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; {extra}"></div>'


def SVG(x, y, w, h, inner, hand='brush', vb=None, extra=''):
    vb = vb or f'0 0 {w} {h}'
    dh = f'data-hand="{hand}" ' if hand else ''
    return (f'<svg {dh}style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; {extra}" viewBox="{vb}" '
            f'xmlns="http://www.w3.org/2000/svg">{inner}</svg>')


def IMG(src, x=0, y=0, w=W, h=H, extra=''):
    return f'<img src="{src}" style="position: absolute; left: {x}px; top: {y}px; width: {w}px; height: {h}px; object-fit: cover; {extra}">'


# ── 선 그림 (anim) — 조각마다 따로 svg: 움직임 단위 ──
def S(stroke, w=5, fill='none', cap='round'):
    return f'stroke="{stroke}" stroke-width="{w}" fill="{fill}" stroke-linecap="{cap}" stroke-linejoin="round"'


def book(x, y, w, h, c, dashed=False, fill='none'):
    """다섯 구멍 실 제본 책 — 표지 + 등쪽 실 다섯 땀"""
    d = ' stroke-dasharray="14 12"' if dashed else ''
    st = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" {S(c, 5, fill)}{d}/>']
    for i in range(5):
        yy = y + h * (0.12 + 0.19 * i)
        st.append(f'<line x1="{x + 10}" y1="{yy}" x2="{x + 34}" y2="{yy}" {S(c, 4)}{d}/>')
    return ''.join(st)


def candle(x, y, c, red):
    return (f'<rect x="{x - 12}" y="{y}" width="24" height="90" rx="4" {S(c, 4)}/>'
            f'<path d="M {x} {y - 8} C {x - 16} {y - 30} {x - 6} {y - 48} {x} {y - 60} C {x + 6} {y - 48} {x + 16} {y - 30} {x} {y - 8} Z" {S(red, 4, red)}/>'
            f'<line x1="{x - 26}" y1="{y + 90}" x2="{x + 26}" y2="{y + 90}" {S(c, 5)}/>')


def monk(x, y, s, c, red, face_right=True):
    """스님 옆모습 — 민머리 · 검은 장삼 · 붉은 가사 한쪽 어깨 (단순 선)"""
    f = 1 if face_right else -1
    return (f'<g transform="translate({x} {y}) scale({s * f} {s})">'
            f'<circle cx="0" cy="0" r="34" {S(c, 5)}/>'
            f'<path d="M -40 40 C -70 90 -70 170 -60 260 L 60 260 C 70 170 70 90 40 40 Z" {S(c, 5)}/>'
            f'<path d="M -30 48 C 10 70 40 110 40 160 L 60 260 L 62 262" {S(red, 6)}/>'
            f'<path d="M 40 120 L 120 150" {S(c, 5)}/></g>')


def anim_boards():
    c, red, gold, dim = A['ink'], A['red'], A['gold'], A['dim']
    B = {}
    # S01 실종 안내 — 손그림 휴대폰 + 문자
    B['S01'] = [
        SVG(640, 150, 640, 820, f'<rect x="20" y="20" width="600" height="780" rx="56" {S(c, 7)}/><line x1="250" y1="60" x2="390" y2="60" {S(c, 6)}/>'
                                f'<rect x="80" y="220" width="480" height="330" rx="22" {S(c, 5)}/>', 'pen'),
        T(720, 240, 480, 40, '오후 2:17', 26, color=dim, align='center'),
        SVG(740, 395, 40, 40, f'<circle cx="20" cy="20" r="12" {S(red, 4, red)}/>', 'pen'),
        T(790, 390, 420, 44, '[실종 안내]', 30, wt=700, color=red),
        T(760, 440, 460, 60, '직지 상권 (直指 卷上)', 42, fam='Serif', wt=700, color=c),
        T(760, 512, 460, 150, '1377년 여름 청주 흥덕사에서 태어남<br>특징: 금속활자로 찍은 책 · 표지 「直指」<br>동생(하권)이 파리에서 찾고 있습니다', 27, color=c, lh=44),
        T(120, 60, 700, 50, '649년 전에 헤어진 형을 찾습니다', 40, fam='Pen', color=dim),
    ]
    # S02 흥덕사지 + 제목
    hall = (f'<path d="M 60 330 L 740 330 L 700 250 C 500 200 300 200 100 250 Z" {S(c, 6)}/>'       # 지붕
            f'<path d="M 40 332 C 20 300 10 280 5 260" {S(c, 5)}/><path d="M 760 332 C 780 300 790 280 795 260" {S(c, 5)}/>'
            f'<line x1="140" y1="330" x2="140" y2="520" {S(c, 6)}/><line x1="300" y1="330" x2="300" y2="520" {S(c, 6)}/>'
            f'<line x1="500" y1="330" x2="500" y2="520" {S(c, 6)}/><line x1="660" y1="330" x2="660" y2="520" {S(c, 6)}/>'
            f'<rect x="90" y="520" width="620" height="40" {S(c, 6)}/><line x1="0" y1="600" x2="800" y2="600" {S(c, 5)}/>')
    pagoda = (f'<rect x="60" y="300" width="120" height="30" {S(c, 5)}/><rect x="80" y="230" width="80" height="70" {S(c, 5)}/>'
              f'<path d="M 30 230 L 210 230 L 180 205 L 60 205 Z" {S(c, 5)}/><rect x="90" y="150" width="60" height="55" {S(c, 5)}/>'
              f'<path d="M 45 150 L 195 150 L 170 128 L 70 128 Z" {S(c, 5)}/><rect x="97" y="80" width="46" height="48" {S(c, 5)}/>'
              f'<path d="M 55 80 L 185 80 L 165 60 L 75 60 Z" {S(c, 5)}/><line x1="120" y1="60" x2="120" y2="10" {S(c, 5)}/>')
    B['S02'] = [
        SVG(1000, 300, 800, 620, hall, 'brush'),
        SVG(760, 340, 240, 340, pagoda, 'brush'),
        T(120, 300, 820, 70, '청주 흥덕사지 — 우리가 태어난 집', 34, color=dim, ls=2),
        T(120, 390, 900, 300, '직지 상권을<br>찾습니다', 124, fam='Myeongjo', wt=800, color=c, lh=150),
        T(124, 720, 900, 60, '649년 전 함께 태어난 형에게', 40, fam='Pen', color=red),
        SVG(120, 700, 560, 24, f'<path d="M 4 12 C 150 2 400 22 556 10" {S(red, 6)}/>', 'brush'),
    ]
    # S03 A1 공방 — 밀랍 주조
    B['S03'] = [
        SVG(80, 120, 1000, 820, f'<line x1="0" y1="700" x2="1000" y2="700" {S(c, 5)}/>'
                                f'<rect x="620" y="560" width="360" height="24" {S(c, 5)}/><line x1="660" y1="584" x2="660" y2="700" {S(c, 5)}/><line x1="940" y1="584" x2="940" y2="700" {S(c, 5)}/>'
                                f'<path d="M 700 560 L 700 470 M 700 500 L 660 480 M 700 520 L 740 500 M 700 480 L 735 460 M 700 540 L 665 520" {S(gold, 5)}/>'   # 활자 가지
                                f'<circle cx="662" cy="478" r="7" {S(gold, 3, gold)}/><circle cx="742" cy="498" r="7" {S(gold, 3, gold)}/><circle cx="737" cy="458" r="7" {S(gold, 3, gold)}/><circle cx="663" cy="518" r="7" {S(gold, 3, gold)}/>', 'brush'),
        SVG(160, 300, 300, 560, monk(150, 60, 1.0, c, red, True), 'brush'),
        SVG(420, 340, 280, 520, monk(140, 60, 0.95, c, red, False), 'brush'),
        SVG(300, 560, 300, 260, f'<path d="M 60 40 L 180 10 L 230 90 L 110 120 Z" {S(c, 6)}/><path d="M 180 10 C 200 60 150 120 110 170" {S(red, 6)}/>'      # 도가니 · 쇳물
                                f'<rect x="90" y="170" width="140" height="60" rx="6" {S(c, 6)}/>'
                                f'<circle cx="150" cy="140" r="5" {S(red, 3, red)}/><circle cx="175" cy="110" r="4" {S(red, 3, red)}/><circle cx="130" cy="100" r="4" {S(red, 3, red)}/>', 'brush'),
        T(1180, 300, 640, 60, '1377 · 청주 흥덕사 공방', 34, color=dim, ls=2),
        T(1180, 370, 680, 240, '금속활자로<br>우리를 펴내던 밤', 76, fam='Myeongjo', wt=800, color=c, lh=100),
        T(1180, 640, 640, 100, '석찬 · 달잠 스님이 간행을 주선하고<br>묘덕 스님이 시주했습니다', 30, color=dim, lh=46),
    ]
    # S04 A2 먹 바르고 찍기
    grid = ''.join(f'<line x1="{60 + i * 44}" y1="40" x2="{60 + i * 44}" y2="300" {S(c, 3)}/>' for i in range(11)) + \
           ''.join(f'<line x1="60" y1="{40 + j * 52}" x2="500" y2="{40 + j * 52}" {S(c, 3)}/>' for j in range(6))
    B['S04'] = [
        SVG(140, 200, 560, 360, f'<rect x="40" y="20" width="480" height="300" rx="6" {S(c, 7)}/>{grid}', 'pen'),
        SVG(520, 120, 420, 360, f'<path d="M 60 300 C 120 220 200 160 300 120" {S(c, 8)}/><path d="M 280 130 C 330 90 380 60 400 40 L 360 20 C 330 60 300 90 260 120 Z" {S(c, 6, c)}/>'
                                f'<path d="M 40 320 C 70 300 110 290 150 300 C 130 330 80 340 40 320 Z" {S(c, 5)}/>', 'brush'),            # 붓과 손
        SVG(1120, 360, 700, 400, book(60, 60, 260, 300, c) + book(380, 80, 220, 280, c), 'brush'),
        T(1100, 180, 760, 60, '같은 해 여름 · 같은 절에서', 34, color=dim, ls=2),
        T(1100, 240, 760, 100, '형은 상권, 저는 하권', 66, fam='Myeongjo', wt=800, color=c),
        T(1180, 790, 260, 48, '卷上', 40, fam='Serif', wt=700, color=c, align='center'),
        T(1500, 790, 220, 48, '卷下', 40, fam='Serif', wt=700, color=c, align='center'),
        T(140, 60, 900, 50, '금속활자에 먹을 바르고 한지를 문질러 찍습니다', 36, fam='Pen', color=dim),
    ]
    # S05 간기 카드
    B['S05'] = [
        T(120, 200, 1680, 60, '직지 하권 끝장에 적힌 간행 기록', 32, color=dim, align='center', ls=3),
        T(120, 290, 1680, 130, '宣光七年丁巳七月　日', 104, fam='Serif', wt=700, color=c, align='center', ls=6),
        T(120, 430, 1680, 110, '淸州牧外興德寺鑄字印施', 84, fam='Serif', wt=700, color=c, align='center', ls=6),
        SVG(1236, 282, 250, 150, f'<rect x="10" y="10" width="230" height="130" rx="8" {S(red, 7)}/>', 'brush'),
        T(120, 600, 1680, 60, '1377년 7월 ○일, 청주목 교외 흥덕사에서 금속활자로 찍어 펴냄', 38, color=c, align='center'),
        T(120, 690, 1680, 60, '「日」 앞 날짜 칸이 비어 있습니다 — 태어난 날은 아무도 모릅니다', 44, fam='Pen', color=red, align='center'),
    ]
    # S06 A3 두 권이 갈라짐
    B['S06'] = [
        SVG(300, 300, 1320, 560, f'<path d="M 40 420 L 1280 420 L 1240 480 L 80 480 Z" {S(c, 6)}/><line x1="120" y1="480" x2="120" y2="540" {S(c, 6)}/><line x1="1200" y1="480" x2="1200" y2="540" {S(c, 6)}/>', 'brush'),
        SVG(420, 340, 320, 360, book(30, 30, 260, 300, c, dashed=True), 'pencil'),
        SVG(900, 340, 320, 360, book(30, 30, 260, 300, c), 'brush'),
        SVG(1360, 420, 120, 240, candle(60, 100, c, red), 'brush'),
        T(120, 140, 1680, 70, '언제 어디서 헤어졌는지, 저도 모릅니다', 48, fam='Myeongjo', wt=800, color=c, align='center'),
        T(450, 250, 260, 50, '卷上', 40, fam='Serif', wt=700, color=dim, align='center'),
        T(930, 250, 260, 50, '卷下', 40, fam='Serif', wt=700, color=c, align='center'),
    ]
    # S07 A4 파리 경매장
    heads = ''.join(f'<circle cx="{80 + i * 95}" cy="{330 + (i % 2) * 14}" r="26" {S(c, 4)}/><path d="M {52 + i * 95} {318 + (i % 2) * 14} L {108 + i * 95} {318 + (i % 2) * 14}" {S(c, 5)}/>' for i in range(9))
    B['S07'] = [
        SVG(100, 200, 960, 700, f'<rect x="300" y="60" width="300" height="200" rx="6" {S(c, 6)}/><line x1="300" y1="260" x2="600" y2="260" {S(c, 6)}/>'    # 연단
                                f'<circle cx="450" cy="0" r="30" {S(c, 5)}/><path d="M 420 40 L 480 40 L 500 150 L 400 150 Z" {S(c, 5)}/>'                 # 경매사
                                f'<path d="M 480 60 L 560 20" {S(c, 6)}/><rect x="540" y="0" width="50" height="26" rx="6" transform="rotate(-25 565 13)" {S(c, 5, c)}/>'  # 망치
                                f'{heads}<line x1="0" y1="420" x2="960" y2="420" {S(c, 4)}/>', 'pen'),
        SVG(1200, 420, 460, 400, f'<rect x="80" y="260" width="300" height="30" rx="4" {S(c, 5)}/><line x1="230" y1="290" x2="230" y2="360" {S(c, 5)}/>'
                                 + book(130, 70, 200, 190, c) + f'<rect x="300" y="200" width="90" height="56" rx="4" {S(c, 4)}/>', 'brush'),
        T(1500, 622, 90, 50, '711', 34, wt=700, color=red, align='center'),
        T(120, 100, 1000, 60, '1911 · 파리 드루오 경매장', 34, color=dim, ls=2),
        T(1200, 160, 640, 200, '711번<br>180프랑', 90, fam='Myeongjo', wt=800, color=c, lh=110),
        T(1200, 380, 640, 50, '저는 그렇게 팔렸습니다', 40, fam='Pen', color=red),
    ]
    # S08 경로 카드 청주→파리
    B['S08'] = [
        SVG(260, 220, 1400, 420, f'<path d="M 1300 360 C 1100 40 400 40 90 300" {S(gold, 7)} stroke-dasharray="22 18"/>'
                                 f'<path d="M 130 260 L 80 310 L 150 320 Z" {S(gold, 6, gold)}/><circle cx="1300" cy="360" r="14" {S(gold, 5, gold)}/>', 'brush'),
        T(1500, 600, 300, 60, '청주', 48, fam='Myeongjo', wt=800, color=c),
        T(250, 560, 300, 60, '파리', 48, fam='Myeongjo', wt=800, color=c),
        T(120, 760, 1680, 60, '1896~1906 프랑스 공사 수집  →  1911 경매 711번 · 180프랑  →  1950 유증 · 프랑스 국립도서관', 32, color=dim, align='center'),
        T(120, 120, 1680, 60, '하권이 간 길', 36, color=dim, align='center', ls=4),
    ]
    # S09 A5 1972 파리 도서관 (뒷모습)
    shelves = ''.join(f'<line x1="40" y1="{60 + j * 90}" x2="700" y2="{60 + j * 90}" {S(c, 4)}/>' for j in range(5)) + \
              ''.join(f'<rect x="{60 + i * 48}" y="{70 + (i * 7) % 3 * 10}" width="30" height="{70 - (i * 7) % 3 * 10}" {S(c, 3)}/>' for i in range(13))
    B['S09'] = [
        SVG(120, 120, 760, 520, shelves, 'pen'),
        SVG(760, 300, 760, 640, f'<circle cx="380" cy="80" r="52" {S(c, 5)}/><path d="M 330 60 C 350 20 410 20 430 60" {S(c, 5, c)}/>'        # 뒷머리
                                f'<path d="M 300 150 C 250 200 240 300 250 420 L 510 420 C 520 300 510 200 460 150 Z" {S(c, 5)}/>'              # 어깨 · 가디건
                                f'<path d="M 250 420 L 510 420" {S(c, 5)}/><rect x="60" y="440" width="640" height="26" {S(c, 5)}/>'
                                + book(300, 380, 160, 70, c) +
                                f'<path d="M 620 440 L 620 330 L 700 300" {S(c, 5)}/><path d="M 650 300 C 660 270 740 270 750 300 Z" {S(gold, 5, gold)}/>', 'brush'),   # 초록 등
        T(1120, 160, 700, 60, '1972 · 파리 국립도서관', 34, color=dim, ls=2),
        T(1120, 230, 760, 220, '잠들어 있던 저를<br>세상에 알린 손', 70, fam='Myeongjo', wt=800, color=c, lh=92),
        T(1120, 480, 700, 50, '한 한국인 연구자의 뒷모습', 36, fam='Pen', color=red),
    ]
    # S10 2001 카드
    B['S10'] = [
        T(120, 240, 1680, 60, '지금 남아 있는 가장 오래된 금속활자본', 40, color=c, align='center'),
        T(120, 330, 1680, 200, '2001', 170, fam='Myeongjo', wt=800, color=gold, align='center'),
        T(120, 560, 1680, 70, '유네스코 세계기록유산', 54, fam='Myeongjo', wt=800, color=c, align='center'),
        SVG(760, 650, 400, 20, f'<path d="M 4 10 C 100 2 300 18 396 8" {S(red, 6)}/>', 'brush'),
        T(120, 690, 1680, 60, '등재를 결정한 국제회의가 열린 곳 — 청주', 36, fam='Pen', color=red, align='center'),
    ]
    # S11 A6 1985 운천동 공사장
    B['S11'] = [
        SVG(1060, 140, 820, 480, f'<rect x="420" y="240" width="300" height="140" rx="10" {S(c, 5)}/><rect x="360" y="380" width="420" height="60" rx="14" {S(c, 5)}/>'   # 굴착기
                                 f'<path d="M 420 260 L 220 120 L 80 220" {S(c, 6)}/><path d="M 80 220 L 40 300 L 120 320 L 140 250 Z" {S(c, 5)}/>'
                                 f'<line x1="0" y1="440" x2="820" y2="440" {S(c, 5)}/>', 'pen'),
        SVG(140, 420, 900, 520, f'<path d="M 0 300 C 200 260 400 320 600 280 C 750 250 850 300 900 280 L 900 520 L 0 520 Z" {S(c, 6)}/>'       # 흙
                                f'<path d="M 420 300 C 470 250 560 250 600 300 C 570 330 480 340 420 300 Z" {S(gold, 6, gold)}/>'            # 쇠북 조각
                                f'<path d="M 520 150 L 700 60" {S(c, 8)}/><path d="M 500 160 L 540 140 L 560 190 L 520 210 Z" {S(c, 5, c)}/>'      # 붓
                                f'<path d="M 700 60 C 760 30 820 60 860 20 C 820 100 760 120 700 100 Z" {S(c, 5)}/>', 'brush'),                 # 장갑 낀 손
        T(120, 150, 900, 60, '1985 · 청주 운천동 공사장', 34, color=dim, ls=2),
        T(120, 220, 900, 180, '「흥덕사」가 새겨진<br>쇠북 조각', 70, fam='Myeongjo', wt=800, color=c, lh=92),
        T(500, 880, 400, 48, '興德寺', 40, fam='Serif', wt=700, color=gold, align='center'),
    ]
    # S12 문패 카드
    B['S12'] = [
        T(120, 220, 1680, 180, '1985', 150, fam='Myeongjo', wt=800, color=gold, align='center'),
        T(120, 420, 1680, 60, '청주 운천동 공사장에서 「흥덕사」를 새긴 쇠북 조각 출토', 40, color=c, align='center'),
        T(120, 520, 1680, 120, '우리 집 문패였습니다', 96, fam='Myeongjo', wt=800, color=c, align='center'),
        SVG(560, 640, 800, 24, f'<path d="M 4 12 C 200 2 600 22 796 10" {S(red, 7)}/>', 'brush'),
        T(120, 720, 1680, 60, '그 자리에 1992년, 청주고인쇄박물관', 36, fam='Pen', color=dim, align='center'),
    ]
    # S13 A7 상상도 — 목판 새기는 손 · 활자가 모여 형의 모습
    types = ''.join(f'<rect x="{40 + (i * 37) % 300}" y="{20 + (i * 53) % 260}" width="18" height="24" rx="3" {S(gold, 3, gold)}/>' for i in range(26))
    B['S13'] = [
        SVG(120, 220, 820, 620, f'<rect x="60" y="140" width="520" height="380" rx="8" {S(c, 7)}/>'
                                + ''.join(f'<line x1="{120 + i * 60}" y1="180" x2="{120 + i * 60}" y2="480" {S(c, 3)} stroke-dasharray="6 10"/>' for i in range(8)) +
                                f'<path d="M 560 80 L 640 20" {S(c, 8)}/><path d="M 540 90 L 575 70 L 600 110 L 565 130 Z" {S(c, 5, c)}/>'            # 칼
                                f'<path d="M 640 20 C 690 0 760 30 800 0 C 770 80 700 100 640 70 Z" {S(c, 5)}/>'                                   # 손
                                f'<path d="M 300 560 C 330 540 360 560 400 540" {S(c, 4)}/><path d="M 420 580 C 450 560 480 580 520 560" {S(c, 4)}/>', 'brush'),
        SVG(1000, 180, 840, 700, f'<g opacity="0.95">{types}</g>' + book(300, 120, 300, 360, c, dashed=True), 'pencil'),
        T(120, 100, 900, 60, '1378 · 이듬해 나무에 새겨 찍은 목판본', 34, color=dim, ls=2),
        T(1000, 60, 840, 50, '형의 얼굴은 몰라도, 형이 한 말은 압니다', 40, fam='Pen', color=red, align='center'),
        T(1480, 110, 380, 44, '상상도 · 실물 아님', 26, wt=700, color=red, align='center', extra=f'border: 3px solid {red}; border-radius: 22px; line-height: 38px'),
    ]
    # S14 상태 카드 卷上 / 卷下
    B['S14'] = [
        SVG(300, 300, 560, 480, f'<rect x="10" y="10" width="540" height="460" rx="10" {S(c, 5)} stroke-dasharray="18 14"/>', 'pencil'),
        SVG(1060, 300, 560, 480, f'<rect x="10" y="10" width="540" height="460" rx="10" {S(c, 6)}/>', 'brush'),
        T(300, 360, 560, 100, '卷上', 84, fam='Serif', wt=700, color=dim, align='center'),
        T(300, 480, 560, 60, '상권 · 금속활자본', 40, color=c, align='center'),
        T(300, 560, 560, 60, '행방을 모름', 44, fam='Pen', color=red, align='center'),
        T(300, 640, 560, 50, '내용은 1378년 목판본으로 전함', 28, color=dim, align='center'),
        T(1060, 360, 560, 100, '卷下', 84, fam='Serif', wt=700, color=c, align='center'),
        T(1060, 480, 560, 60, '하권 · 38장', 40, color=c, align='center'),
        T(1060, 560, 560, 60, '첫 장이 없음', 44, fam='Pen', color=gold, align='center'),
        T(1060, 640, 560, 50, '프랑스 국립도서관 소장', 28, color=dim, align='center'),
    ]
    # S15 L2 고인쇄박물관 · S16 L3 수암골
    B['S15'] = [
        SVG(160, 200, 1100, 700, f'<path d="M 40 360 L 1060 360 L 1000 220 C 800 170 300 170 100 220 Z" {S(c, 6)}/>'
                                 f'<rect x="120" y="360" width="860" height="260" {S(c, 6)}/>' + ''.join(f'<rect x="{170 + i * 150}" y="400" width="90" height="180" {S(c, 4)}/>' for i in range(5)) +
                                 f'<line x1="0" y1="660" x2="1100" y2="660" {S(c, 5)}/>', 'pen'),
        SVG(1280, 520, 520, 380, f'<path d="M 60 300 L 260 240 L 460 300 L 460 320 L 260 262 L 60 320 Z" {S(gold, 6)}/>'       # 펼친 책 조형물
                                 f'<path d="M 60 300 C 120 230 200 230 260 240 C 320 230 400 230 460 300" {S(gold, 6)}/><rect x="200" y="320" width="120" height="40" {S(c, 5)}/>', 'brush'),
        T(120, 100, 1200, 60, '오늘 · 청주고인쇄박물관', 34, color=dim, ls=2),
        T(120, 40, 1680, 50, '청주는 1996년부터 형을 찾고 있습니다', 42, fam='Pen', color=red),
    ]
    B['S16'] = [
        SVG(120, 160, 1680, 760, f'<path d="M 0 700 L 400 700 L 400 620 L 700 620 L 700 540 L 1000 540 L 1000 460 L 1680 460" {S(c, 6)}/>'    # 계단 골목
                                 f'<path d="M 60 560 L 60 380 L 180 300 L 300 380 L 300 560" {S(c, 5)}/><rect x="130" y="440" width="60" height="100" {S(c, 4)}/>'
                                 f'<path d="M 460 480 L 460 320 L 580 250 L 700 320 L 700 480" {S(c, 5)}/><rect x="540" y="380" width="60" height="80" {S(c, 4)}/>'
                                 f'<path d="M 780 400 L 780 260 L 900 190 L 1020 260 L 1020 400" {S(c, 5)}/>'
                                 f'<path d="M 1120 320 L 1120 200 L 1240 130 L 1360 200 L 1360 320" {S(c, 5)}/>'
                                 f'<path d="M 1400 180 C 1440 120 1520 120 1560 180 C 1600 120 1660 140 1660 200" {S(c, 4)}/>', 'pen'),
        T(120, 80, 1200, 60, '오늘 · 청주 수암골', 34, color=dim, ls=2),
        T(120, 130, 1680, 50, '청주는 1996년부터 형을 찾고 있습니다', 42, fam='Pen', color=red),
    ]
    # S17 직지 찾기 카드
    B['S17'] = [
        T(120, 260, 1680, 160, '직지 찾기', 130, fam='Myeongjo', wt=800, color=red, align='center'),
        T(120, 450, 1680, 70, '1996년, 청주 시민들이 시작했습니다', 50, wt=700, color=c, align='center'),
        T(120, 560, 1680, 120, '1378년 목판본은 찾아냈지만<br>금속활자본 상권은 아직입니다', 36, color=dim, align='center', lh=56),
        SVG(560, 420, 800, 24, f'<path d="M 4 12 C 200 2 600 22 796 10" {S(gold, 7)}/>', 'brush'),
    ]
    # S18 A8 다락 · 보자기
    rays = ''.join(f'<line x1="300" y1="240" x2="{120 + i * 90}" y2="520" {S(gold, 3)} stroke-dasharray="4 14"/>' for i in range(5))
    B['S18'] = [
        SVG(120, 120, 800, 820, f'<rect x="140" y="120" width="320" height="120" rx="6" {S(c, 6)}/><path d="M 140 120 L 300 20 L 460 120" {S(c, 6)}/>'     # 열린 다락문
                                f'{rays}<line x1="200" y1="240" x2="200" y2="760" {S(c, 6)}/><line x1="400" y1="240" x2="400" y2="760" {S(c, 6)}/>'
                                + ''.join(f'<line x1="200" y1="{320 + j * 90}" x2="400" y2="{320 + j * 90}" {S(c, 5)}/>' for j in range(5)) +
                                f'<circle cx="560" cy="520" r="40" {S(c, 5)}/><path d="M 520 560 C 500 620 500 700 520 760 L 600 760 C 620 700 620 620 600 560 Z" {S(gold, 5)}/>'
                                f'<path d="M 520 580 L 420 500" {S(c, 5)}/>', 'brush'),
        SVG(1020, 300, 800, 600, f'<rect x="80" y="300" width="640" height="240" rx="10" {S(c, 6)}/><path d="M 80 300 L 120 200 L 760 200 L 720 300" {S(c, 6)}/>'    # 궤짝
                                 f'<path d="M 260 420 C 300 340 500 340 540 420 C 560 470 520 500 400 500 C 280 500 240 470 260 420 Z" {S(red, 6)}/>'               # 보자기
                                 f'<path d="M 380 370 L 420 330 L 450 370" {S(red, 5)}/>', 'brush'),
        T(1020, 160, 800, 60, '어쩌면, 어느 집 다락', 34, color=dim, ls=2),
        T(1020, 220, 800, 50, '낡은 보자기 속에 있을지 모릅니다', 40, fam='Pen', color=red, align='center'),
        T(1480, 110, 380, 44, '상상도 · 실물 아님', 26, wt=700, color=red, align='center', extra=f'border: 3px solid {red}; border-radius: 22px; line-height: 38px'),
    ]
    # S19 A9 하권 옆의 빈자리
    B['S19'] = [
        SVG(300, 300, 1320, 560, f'<path d="M 40 420 L 1280 420 L 1240 480 L 80 480 Z" {S(c, 6)}/><line x1="120" y1="480" x2="120" y2="540" {S(c, 6)}/><line x1="1200" y1="480" x2="1200" y2="540" {S(c, 6)}/>', 'brush'),
        SVG(420, 340, 320, 360, f'<rect x="30" y="30" width="260" height="300" rx="4" {S(dim, 4)} stroke-dasharray="10 14"/>', 'pencil'),
        SVG(900, 340, 320, 360, book(30, 30, 260, 300, c), 'brush'),
        SVG(1360, 420, 120, 240, candle(60, 100, c, red), 'brush'),
        T(120, 120, 1680, 120, '오래된 책에서 이 글자를 보시면', 46, fam='Myeongjo', wt=800, color=c, align='center'),
        T(450, 450, 260, 100, '直指 卷上', 56, fam='Serif', wt=700, color=red, align='center'),
        T(120, 200, 1680, 60, '청주에 알려 주세요', 48, fam='Pen', color=red, align='center'),
    ]
    # S20 엔딩
    B['S20'] = [
        T(120, 230, 1680, 150, '직지 상권을 찾습니다', 120, fam='Myeongjo', wt=800, color=red, align='center'),
        T(120, 400, 1680, 140, '直指 卷上', 110, fam='Serif', wt=700, color=c, align='center', ls=20),
        SVG(560, 560, 800, 24, f'<path d="M 4 12 C 200 2 600 22 796 10" {S(c, 6)}/>', 'brush'),
        T(120, 620, 1680, 120, '하권은 파리에, 상권은 어딘가에<br>우리 집은 청주에', 44, color=c, align='center', lh=64),
    ]
    # S21 만든 방법
    B['S21'] = [
        T(120, 300, 1680, 60, '만든 방법', 40, wt=700, color=c, align='center'),
        T(120, 400, 1680, 360, '기획 · 대본 · 내레이션: 출품자 직접<br>그림: 코드로 그린 손그림 애니메이션(SVG) · 배경음: 코드 생성<br>글자 · 지도 · 정보 카드: 직접 디자인(코드)<br>글꼴: 나눔명조 · 나눔펜 · Noto Serif KR · Pretendard (OFL)<br>자료: 프랑스 국립도서관 · 청주고인쇄박물관 · 한국민족문화대백과사전', 30, color=dim, align='center', lh=56),
    ]
    return B


def real_boards():
    c, red, gold, dim = R['ink'], R['red'], R['gold'], R['dim']
    BG = lambda k: 'img/' + k + '.jpg'
    shade = BOX(0, 0, W, H, 'background: linear-gradient(90deg, rgba(10,8,6,0.78) 0%, rgba(10,8,6,0.35) 55%, rgba(10,8,6,0.05) 100%)')
    shade_b = BOX(0, 0, W, H, 'background: linear-gradient(180deg, rgba(10,8,6,0.0) 40%, rgba(10,8,6,0.75) 100%)')
    LABEL = lambda txt: T(1480, 80, 380, 44, txt, 24, wt=700, color=gold, align='center', extra=f'border: 2px solid {gold}; border-radius: 22px; line-height: 40px')
    B = {}
    B['S01'] = [
        BOX(640, 150, 640, 780, f'background: #1C1917; border-radius: 56px; border: 3px solid #3A332C'),
        BOX(720, 370, 480, 330, 'background: #2A2521; border-radius: 22px'),
        T(720, 240, 480, 40, '오후 2:17', 26, color=dim, align='center'),
        BOX(748, 404, 14, 14, f'background: {red}; border-radius: 7px'),
        T(776, 390, 420, 44, '[실종 안내]', 28, wt=700, color=red),
        T(750, 440, 440, 60, '직지 상권 (直指 卷上)', 40, fam='Serif', wt=700, color=c),
        T(750, 512, 440, 150, '1377년 여름 청주 흥덕사에서 태어남<br>특징: 금속활자로 찍은 책 · 표지 「直指」<br>동생(하권)이 파리에서 찾고 있습니다', 26, color='#D8CDB9', lh=42),
    ]
    B['S02'] = [IMG(BG('L1')), shade,
                T(120, 300, 820, 70, '청주 흥덕사지', 34, color=gold, ls=4),
                T(120, 390, 1000, 300, '직지 상권을<br>찾습니다', 124, fam='Myeongjo', wt=800, color=c, lh=150),
                T(124, 720, 900, 60, '649년 전 함께 태어난 형에게', 40, color='#D8CDB9'),
                T(1480, 80, 380, 44, '실사', 24, wt=700, color=gold, align='center', extra=f'border: 2px solid {gold}; border-radius: 22px; line-height: 40px')]
    B['S03'] = [IMG(BG('A1')), shade_b, LABEL('AI 재현'),
                T(120, 820, 1200, 60, '1377 · 청주 흥덕사 공방', 34, color=gold, ls=2),
                T(120, 880, 1600, 100, '금속활자로 우리를 펴내던 밤', 64, fam='Myeongjo', wt=800, color=c)]
    B['S04'] = [IMG(BG('A2')), shade_b, LABEL('AI 재현'),
                T(120, 820, 1200, 60, '같은 해 여름 · 같은 절에서', 34, color=gold, ls=2),
                T(120, 880, 1600, 100, '형은 상권, 저는 하권', 64, fam='Myeongjo', wt=800, color=c)]
    B['S05'] = [
        T(120, 200, 1680, 60, '직지 하권 끝장에 적힌 간행 기록', 32, color=dim, align='center', ls=3),
        T(120, 290, 1680, 130, '宣光七年丁巳七月　日', 104, fam='Serif', wt=700, color=c, align='center', ls=6),
        T(120, 430, 1680, 110, '淸州牧外興德寺鑄字印施', 84, fam='Serif', wt=700, color=c, align='center', ls=6),
        BOX(1246, 292, 230, 130, f'border: 5px solid {red}; border-radius: 8px'),
        T(120, 600, 1680, 60, '1377년 7월 ○일, 청주목 교외 흥덕사에서 금속활자로 찍어 펴냄', 38, color=c, align='center'),
        T(120, 690, 1680, 60, '「日」 앞 날짜 칸이 비어 있습니다 — 태어난 날은 아무도 모릅니다', 40, wt=700, color=red, align='center'),
    ]
    B['S06'] = [IMG(BG('A3')), shade_b, LABEL('AI 재현'),
                T(120, 880, 1600, 100, '언제 어디서 헤어졌는지, 저도 모릅니다', 56, fam='Myeongjo', wt=800, color=c)]
    B['S07'] = [IMG(BG('A4')), shade, LABEL('AI 재현'),
                T(120, 300, 900, 60, '1911 · 파리 드루오 경매장', 34, color=gold, ls=2),
                T(120, 370, 900, 230, '711번<br>180프랑', 96, fam='Myeongjo', wt=800, color=c, lh=116),
                T(120, 640, 900, 50, '저는 그렇게 팔렸습니다', 36, color='#D8CDB9')]
    B['S08'] = [
        T(120, 120, 1680, 60, '하권이 간 길', 36, color=gold, align='center', ls=4),
        SVG(260, 220, 1400, 420, f'<path d="M 1300 360 C 1100 40 400 40 90 300" stroke="{gold}" stroke-width="6" fill="none" stroke-dasharray="22 18" stroke-linecap="round"/>'
                                 f'<path d="M 130 260 L 80 310 L 150 320 Z" stroke="{gold}" stroke-width="5" fill="{gold}"/><circle cx="1300" cy="360" r="14" stroke="{gold}" stroke-width="5" fill="{gold}"/>', None),
        T(1500, 600, 300, 60, '청주', 48, fam='Myeongjo', wt=800, color=c),
        T(250, 560, 300, 60, '파리', 48, fam='Myeongjo', wt=800, color=c),
        T(120, 760, 1680, 60, '1896~1906 프랑스 공사 수집  →  1911 경매 711번 · 180프랑  →  1950 유증 · 프랑스 국립도서관', 30, color=dim, align='center'),
    ]
    B['S09'] = [IMG(BG('A5')), shade, LABEL('AI 재현'),
                T(120, 300, 900, 60, '1972 · 파리 국립도서관', 34, color=gold, ls=2),
                T(120, 370, 1000, 230, '잠들어 있던 저를<br>세상에 알린 손', 80, fam='Myeongjo', wt=800, color=c, lh=104)]
    B['S10'] = [
        T(120, 240, 1680, 60, '지금 남아 있는 가장 오래된 금속활자본', 40, color=c, align='center'),
        T(120, 330, 1680, 200, '2001', 170, fam='Myeongjo', wt=800, color=gold, align='center'),
        T(120, 560, 1680, 70, '유네스코 세계기록유산', 54, fam='Myeongjo', wt=800, color=c, align='center'),
        BOX(860, 660, 200, 4, f'background: {gold}'),
        T(120, 690, 1680, 60, '등재를 결정한 국제회의가 열린 곳 — 청주', 34, color=dim, align='center'),
    ]
    B['S11'] = [IMG(BG('A6')), shade_b, LABEL('AI 재현'),
                T(120, 820, 1200, 60, '1985 · 청주 운천동 공사장', 34, color=gold, ls=2),
                T(120, 880, 1600, 100, '「흥덕사」가 새겨진 쇠북 조각', 64, fam='Myeongjo', wt=800, color=c)]
    B['S12'] = [
        T(120, 220, 1680, 180, '1985', 150, fam='Myeongjo', wt=800, color=gold, align='center'),
        T(120, 420, 1680, 60, '청주 운천동 공사장에서 「흥덕사」를 새긴 쇠북 조각 출토', 38, color=c, align='center'),
        T(120, 520, 1680, 120, '우리 집 문패였습니다', 96, fam='Myeongjo', wt=800, color=c, align='center'),
        BOX(560, 660, 800, 4, f'background: {red}'),
        T(120, 700, 1680, 60, '그 자리에 1992년, 청주고인쇄박물관', 34, color=dim, align='center'),
    ]
    B['S13'] = [IMG(BG('A7a'), 0, 0, 960, 1080), IMG(BG('A7b'), 960, 0, 960, 1080), shade_b, LABEL('AI 상상도 · 실물 아님'),
                T(120, 820, 1200, 60, '1378 · 이듬해 나무에 새겨 찍은 목판본', 34, color=gold, ls=2),
                T(120, 880, 1680, 100, '형의 얼굴은 몰라도, 형이 한 말은 압니다', 60, fam='Myeongjo', wt=800, color=c)]
    B['S14'] = [
        BOX(300, 300, 560, 480, f'border: 3px dashed {dim}; border-radius: 10px'),
        BOX(1060, 300, 560, 480, f'border: 3px solid {gold}; border-radius: 10px'),
        T(300, 360, 560, 100, '卷上', 84, fam='Serif', wt=700, color=dim, align='center'),
        T(300, 480, 560, 60, '상권 · 금속활자본', 40, color=c, align='center'),
        T(300, 560, 560, 60, '행방을 모름', 44, wt=700, color=red, align='center'),
        T(300, 640, 560, 50, '내용은 1378년 목판본으로 전함', 28, color=dim, align='center'),
        T(1060, 360, 560, 100, '卷下', 84, fam='Serif', wt=700, color=c, align='center'),
        T(1060, 480, 560, 60, '하권 · 38장', 40, color=c, align='center'),
        T(1060, 560, 560, 60, '첫 장이 없음', 44, wt=700, color=gold, align='center'),
        T(1060, 640, 560, 50, '프랑스 국립도서관 소장', 28, color=dim, align='center'),
    ]
    B['S15'] = [IMG(BG('L2')), shade_b, T(1480, 80, 380, 44, '실사', 24, wt=700, color=gold, align='center', extra=f'border: 2px solid {gold}; border-radius: 22px; line-height: 40px'),
                T(120, 820, 1200, 60, '오늘 · 청주고인쇄박물관', 34, color=gold, ls=2),
                T(120, 880, 1600, 100, '청주는 1996년부터 형을 찾고 있습니다', 56, fam='Myeongjo', wt=800, color=c)]
    B['S16'] = [IMG(BG('L3')), shade_b, T(1480, 80, 380, 44, '실사', 24, wt=700, color=gold, align='center', extra=f'border: 2px solid {gold}; border-radius: 22px; line-height: 40px'),
                T(120, 820, 1200, 60, '오늘 · 청주 수암골', 34, color=gold, ls=2),
                T(120, 880, 1600, 100, '청주는 1996년부터 형을 찾고 있습니다', 56, fam='Myeongjo', wt=800, color=c)]
    B['S17'] = [
        T(120, 260, 1680, 160, '직지 찾기', 130, fam='Myeongjo', wt=800, color=red, align='center'),
        T(120, 450, 1680, 70, '1996년, 청주 시민들이 시작했습니다', 50, wt=700, color=c, align='center'),
        T(120, 560, 1680, 120, '1378년 목판본은 찾아냈지만<br>금속활자본 상권은 아직입니다', 36, color=dim, align='center', lh=56),
    ]
    B['S18'] = [IMG(BG('A8a'), 0, 0, 960, 1080), IMG(BG('A8b'), 960, 0, 960, 1080), shade_b, LABEL('AI 상상도 · 실물 아님'),
                T(120, 820, 1200, 60, '어쩌면, 어느 집 다락', 34, color=gold, ls=2),
                T(120, 880, 1680, 100, '낡은 보자기 속에 있을지 모릅니다', 60, fam='Myeongjo', wt=800, color=c)]
    B['S19'] = [IMG(BG('A9')), shade, LABEL('AI 재현'),
                T(120, 300, 1000, 60, '오래된 책에서 이 글자를 보시면', 40, color=c),
                T(120, 380, 1000, 150, '直指 卷上', 120, fam='Serif', wt=700, color=gold, ls=14),
                T(120, 580, 1000, 60, '청주에 알려 주세요', 48, fam='Myeongjo', wt=800, color=c)]
    B['S20'] = [
        T(120, 230, 1680, 150, '직지 상권을 찾습니다', 120, fam='Myeongjo', wt=800, color=red, align='center'),
        T(120, 400, 1680, 140, '直指 卷上', 110, fam='Serif', wt=700, color=c, align='center', ls=20),
        BOX(860, 580, 200, 4, f'background: {gold}'),
        T(120, 620, 1680, 120, '하권은 파리에, 상권은 어딘가에<br>우리 집은 청주에', 44, color=c, align='center', lh=64),
    ]
    B['S21'] = [
        T(120, 300, 1680, 60, '만든 방법', 40, wt=700, color=c, align='center'),
        T(120, 400, 1680, 360, '기획 · 대본 · 내레이션: 출품자 직접<br>AI 이미지: 생성형 AI(도구명 기재) · 편집 · 카메라 · 전환: 코드<br>글자 · 지도 · 정보 카드: 직접 디자인(코드) · 배경음: 코드 생성<br>글꼴: 나눔명조 · Noto Serif KR · Pretendard (OFL)<br>자료: 프랑스 국립도서관 · 청주고인쇄박물관 · 한국민족문화대백과사전', 30, color=dim, align='center', lh=56),
    ]
    return B


TITLES = {'S01': '실종 안내', 'S02': '흥덕사지 · 제목', 'S03': 'A1 공방 주조', 'S04': 'A2 먹 바르고 찍기', 'S05': '간기 七月 日', 'S06': 'A3 두 권이 갈라짐',
          'S07': 'A4 1911 파리 경매', 'S08': '청주→파리 경로', 'S09': 'A5 1972 파리 도서관', 'S10': '2001 세계기록유산', 'S11': 'A6 1985 운천동', 'S12': '우리 집 문패',
          'S13': 'A7 상상도', 'S14': '卷上 · 卷下', 'S15': 'L2 고인쇄박물관', 'S16': 'L3 수암골', 'S17': '직지 찾기', 'S18': 'A8 다락 보자기', 'S19': 'A9 빈자리',
          'S20': '엔딩', 'S21': '만든 방법'}

if __name__ == '__main__':
    try:
        import anim_collage; AB = anim_collage.boards()      # v2 — 손그림 + 옛 사진 콜라주
    except ImportError:
        AB = anim_boards()
    for name, boards, pal in (('anim', AB, A), ('real', real_boards(), R)):
        d = HERE / 'canvas' / name; d.mkdir(parents=True, exist_ok=True)
        for k, els in boards.items():
            (d / f'{k}.dc.html').write_text(page(f'{k} · {TITLES[k]}', '\n'.join(els), pal['bg'], pal['ink']), encoding='utf-8')
        print(name, len(boards))
