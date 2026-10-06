"""애니 판 아트보드 v2 — «손그림 전단 위에 붙인 옛 사진» 콜라주. make_boards.py 가 불러 쓴다.
사진 = 재료/ph_<키>.jpg (sepia.py 로 만든 세피아) · 출처는 재료/archive/credits.json"""
import json
from pathlib import Path

from make_boards import T, SVG, IMG, BOX, S, book, candle, monk, A, W, H

c, red, gold, dim = A['ink'], A['red'], A['gold'], A['dim']
HERE = Path(__file__).resolve().parent
CRED = json.loads((HERE / '재료/archive/credits.json').read_text(encoding='utf-8')) if (HERE / '재료/archive/credits.json').exists() else {}


def has(key): return (HERE / f'재료/ph_{key}.jpg').exists()


def PHOTO(x, y, w, h, key, rot=-2, cap='', tape='both'):
    """종이에 테이프로 붙인 옛 사진 — 흰 테 + 사진 + 테이프 두 조각 + 손글씨 설명"""
    pad = 18
    els = [BOX(x, y, w + pad * 2, h + pad * 2 + 40, f'background: #FBF7EE; box-shadow: 0 10px 28px rgba(40,30,20,0.25); transform: rotate({rot}deg)'),
           IMG(f'재료/ph_{key}.jpg', x + pad, y + pad, w, h, f'transform: rotate({rot}deg)')]
    tp = f'<rect x="0" y="0" width="150" height="40" rx="3" fill="#E9D9A8" fill-opacity="0.85" stroke="#C9B57A" stroke-width="2" transform="rotate(-30 75 20)"/>'
    if tape in ('both', 'left'): els.append(SVG(x - 40, y - 12, 170, 70, tp, None))
    if tape in ('both', 'right'): els.append(SVG(x + w - 90, y - 12, 170, 70, tp.replace('rotate(-30', 'rotate(28'), None))
    if cap: els.append(T(x + pad, y + pad + h + 2, w, 36, cap, 26, fam='Pen', color=dim, align='center', extra=f'transform: rotate({rot}deg)'))
    return els


def CARD(x, y, w, h, inner, rot=-2, cap='', hand='brush'):
    """사진이 없을 때 — 같은 흰 테 안에 선 그림 엽서"""
    pad = 18
    els = [BOX(x, y, w + pad * 2, h + pad * 2 + 40, f'background: #FBF7EE; box-shadow: 0 10px 28px rgba(40,30,20,0.25); transform: rotate({rot}deg)'),
           BOX(x + pad, y + pad, w, h, f'background: #EFE6D2; transform: rotate({rot}deg)'),
           SVG(x + pad, y + pad, w, h, inner, hand, extra=f'transform: rotate({rot}deg)')]
    tp = f'<rect x="0" y="0" width="150" height="40" rx="3" fill="#E9D9A8" fill-opacity="0.85" stroke="#C9B57A" stroke-width="2" transform="rotate(-30 75 20)"/>'
    els.append(SVG(x - 40, y - 12, 170, 70, tp, None)); els.append(SVG(x + w - 90, y - 12, 170, 70, tp.replace('rotate(-30', 'rotate(28'), None))
    if cap: els.append(T(x + pad, y + pad + h + 2, w, 36, cap, 26, fam='Pen', color=dim, align='center', extra=f'transform: rotate({rot}deg)'))
    return els


def ship(w, h):
    return (f'<path d="M {w*0.1} {h*0.62} L {w*0.9} {h*0.62} L {w*0.8} {h*0.82} L {w*0.2} {h*0.82} Z" {S(c, 5)}/>'
            f'<rect x="{w*0.3}" y="{h*0.42}" width="{w*0.4}" height="{h*0.2}" {S(c, 5)}/><rect x="{w*0.44}" y="{h*0.22}" width="{w*0.12}" height="{h*0.2}" {S(c, 5)}/>'
            f'<path d="M {w*0.5} {h*0.2} C {w*0.55} {h*0.1} {w*0.65} {h*0.12} {w*0.7} {h*0.05}" {S(dim, 4)}/>'
            f'<path d="M 0 {h*0.88} C {w*0.2} {h*0.8} {w*0.4} {h*0.95} {w*0.6} {h*0.88} C {w*0.8} {h*0.8} {w*0.9} {h*0.92} {w} {h*0.88}" {S(c, 4)}/>')


def gavel(w, h):
    return (f'<path d="M {w*0.2} {h*0.7} L {w*0.6} {h*0.3}" {S(c, 9)}/><rect x="{w*0.55}" y="{h*0.18}" width="{w*0.25}" height="{h*0.16}" rx="8" transform="rotate(45 {w*0.67} {h*0.26})" {S(c, 6, c)}/>'
            f'<rect x="{w*0.1}" y="{h*0.78}" width="{w*0.5}" height="{h*0.1}" rx="6" {S(c, 5)}/>')


def hall(w, h):
    return (f'<path d="M {w*0.08} {h*0.5} L {w*0.92} {h*0.5} L {w*0.86} {h*0.32} C {w*0.65} {h*0.22} {w*0.35} {h*0.22} {w*0.14} {h*0.32} Z" {S(c, 5)}/>'
            + ''.join(f'<line x1="{w*(0.2+i*0.2)}" y1="{h*0.5}" x2="{w*(0.2+i*0.2)}" y2="{h*0.8}" {S(c, 5)}/>' for i in range(4)) +
            f'<rect x="{w*0.12}" y="{h*0.8}" width="{w*0.76}" height="{h*0.06}" {S(c, 5)}/><line x1="0" y1="{h*0.92}" x2="{w}" y2="{h*0.92}" {S(c, 4)}/>')


def credit_line():
    seen = []
    for k, v in CRED.items():
        a = (v.get('artist') or '').split('(')[0].strip()[:24]; lic = v.get('license', '')
        s = f"{a} ({lic})" if a else lic
        if s and s not in seen: seen.append(s)
    return ' · '.join(seen[:8])


def boards():
    B = {}
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
    B['S02'] = [
        *(PHOTO(1060, 200, 720, 520, 'heung3' if has('heung3') else 'heung1', rot=2, cap='청주 흥덕사지 · 오늘') if (has('heung3') or has('heung1')) else CARD(1060, 200, 720, 520, hall(720, 520), rot=2, cap='청주 흥덕사지 · 복원 금당')),
        T(120, 300, 820, 70, '청주 흥덕사지 — 우리가 태어난 집', 34, color=dim, ls=2),
        T(120, 390, 900, 300, '직지 상권을<br>찾습니다', 124, fam='Myeongjo', wt=800, color=c, lh=150),
        T(124, 720, 900, 60, '649년 전 함께 태어난 형에게', 40, fam='Pen', color=red),
        SVG(120, 700, 560, 24, f'<path d="M 4 12 C 150 2 400 22 556 10" {S(red, 6)}/>', 'brush'),
    ]
    B['S03'] = [
        *PHOTO(100, 180, 640, 460, 'museum_type' if has('museum_type') else 'jikji_plate', rot=-3, cap='복원 금속활자판 · 청주고인쇄박물관'),
        SVG(800, 240, 420, 560, f'<path d="M 90 100 L 230 60 L 290 170 L 150 210 Z" {S(c, 6)}/><path d="M 230 60 C 260 130 220 220 170 300" {S(red, 7)}/>'
                                f'<rect x="120" y="300" width="170" height="70" rx="6" {S(c, 6)}/>'
                                f'<circle cx="200" cy="230" r="6" {S(red, 3, red)}/><circle cx="235" cy="180" r="5" {S(red, 3, red)}/><circle cx="180" cy="150" r="5" {S(red, 3, red)}/><circle cx="260" cy="120" r="4" {S(red, 3, red)}/>'
                                f'<line x1="0" y1="420" x2="420" y2="420" {S(c, 5)}/>'
                                f'<path d="M 60 420 L 60 250 M 60 300 L 20 270 M 60 320 L 100 290 M 60 270 L 95 245" {S(gold, 5)}/>'
                                f'<circle cx="22" cy="268" r="7" {S(gold, 3, gold)}/><circle cx="102" cy="288" r="7" {S(gold, 3, gold)}/><circle cx="97" cy="243" r="7" {S(gold, 3, gold)}/>', 'brush'),
        T(1240, 240, 640, 60, '1377 · 청주 흥덕사 공방', 34, color=dim, ls=2),
        T(1240, 310, 680, 240, '금속활자로<br>우리를 펴내던 밤', 76, fam='Myeongjo', wt=800, color=c, lh=100),
        T(1240, 580, 640, 100, '석찬 · 달잠 스님이 간행을 주선하고<br>묘덕 스님이 시주했습니다', 30, color=dim, lh=46),
        T(1240, 700, 640, 50, '쇳물을 흙 거푸집에 붓습니다', 34, fam='Pen', color=red),
    ]
    B['S04'] = [
        *PHOTO(120, 200, 620, 420, 'jikji_plate', rot=2, cap='직지 금속활자판 복원 · 청주고인쇄박물관'),
        SVG(560, 120, 420, 360, f'<path d="M 60 300 C 120 220 200 160 300 120" {S(c, 8)}/><path d="M 280 130 C 330 90 380 60 400 40 L 360 20 C 330 60 300 90 260 120 Z" {S(c, 6, c)}/>', 'brush'),
        SVG(1120, 360, 700, 400, book(60, 60, 260, 300, c) + book(380, 80, 220, 280, c), 'brush'),
        T(1100, 180, 760, 60, '같은 해 여름 · 같은 절에서', 34, color=dim, ls=2),
        T(1100, 240, 760, 100, '형은 상권, 저는 하권', 66, fam='Myeongjo', wt=800, color=c),
        T(1180, 790, 260, 48, '卷上', 40, fam='Serif', wt=700, color=c, align='center'),
        T(1500, 790, 220, 48, '卷下', 40, fam='Serif', wt=700, color=c, align='center'),
        T(120, 60, 900, 50, '금속활자에 먹을 바르고 한지를 문질러 찍습니다', 36, fam='Pen', color=dim),
    ]
    B['S05'] = [
        *PHOTO(110, 150, 560, 450, 'jikji_book', rot=-2, cap='직지 하권 마지막 장 · 프랑스 국립도서관'),
        SVG(110, 150, 600, 500, f'<ellipse cx="120" cy="330" rx="56" ry="120" {S(red, 6)}/>', 'brush'),
        T(760, 170, 1100, 50, '직지 하권 끝장에 적힌 간행 기록', 30, color=dim, ls=3),
        T(760, 240, 1100, 110, '宣光七年丁巳七月　日', 84, fam='Serif', wt=700, color=c, ls=4),
        T(760, 360, 1100, 100, '淸州牧外興德寺鑄字印施', 70, fam='Serif', wt=700, color=c, ls=4),
        SVG(1456, 236, 230, 120, f'<rect x="10" y="10" width="200" height="100" rx="8" {S(red, 7)}/>', 'brush'),
        T(760, 480, 1100, 110, '1377년 7월 ○일, 청주목 교외 흥덕사에서<br>금속활자로 찍어 펴냄', 34, color=c, lh=50),
        T(760, 640, 1100, 60, '「日」 앞 날짜 칸이 비어 있습니다', 44, fam='Pen', color=red),
        T(760, 700, 1100, 50, '— 태어난 날은 아무도 모릅니다', 36, fam='Pen', color=red),
    ]
    B['S06'] = [
        SVG(300, 300, 1320, 560, f'<path d="M 40 420 L 1280 420 L 1240 480 L 80 480 Z" {S(c, 6)}/><line x1="120" y1="480" x2="120" y2="540" {S(c, 6)}/><line x1="1200" y1="480" x2="1200" y2="540" {S(c, 6)}/>', 'brush'),
        SVG(420, 340, 320, 360, book(30, 30, 260, 300, c, dashed=True), 'pencil'),
        SVG(900, 340, 320, 360, book(30, 30, 260, 300, c), 'brush'),
        SVG(1360, 420, 120, 240, candle(60, 100, c, red), 'brush'),
        T(120, 140, 1680, 70, '언제 어디서 헤어졌는지, 저도 모릅니다', 48, fam='Myeongjo', wt=800, color=c, align='center'),
        T(450, 250, 260, 50, '卷上', 40, fam='Serif', wt=700, color=dim, align='center'),
        T(930, 250, 260, 50, '卷下', 40, fam='Serif', wt=700, color=c, align='center'),
    ]
    B['S07'] = [
        *(PHOTO(100, 150, 420, 600, 'drouot08', rot=-3, cap='드루오 경매장 · 1900년대') if has('drouot08') else CARD(100, 180, 520, 520, gavel(520, 520), rot=-3, cap='파리 드루오 경매장')),
        *(PHOTO(560, 230, 400, 560, 'drouot06', rot=3, cap='Otto Wegener 사진') if has('drouot06') else CARD(640, 300, 380, 420, '<text></text>' + ''.join(f'<circle cx="{60 + i * 65}" cy="{200 + (i % 2) * 14}" r="22" {S(c, 4)}/>' for i in range(5)), rot=3, cap='1911년 11월 · 711번')),
        SVG(1180, 560, 420, 300, f'<path d="M 80 60 L 300 160" {S(c, 9)}/><rect x="270" y="120" width="110" height="60" rx="8" transform="rotate(25 325 150)" {S(c, 6, c)}/>'
                                 f'<rect x="40" y="200" width="200" height="40" rx="6" {S(c, 5)}/>', 'brush'),
        T(1100, 150, 760, 60, '1911 · 파리 드루오 경매장', 34, color=dim, ls=2),
        T(1100, 220, 760, 230, '711번<br>180프랑', 96, fam='Myeongjo', wt=800, color=c, lh=116),
        T(1100, 470, 760, 50, '저는 그렇게 팔렸습니다', 40, fam='Pen', color=red),
    ]
    B['S08'] = [
        IMG('재료/ph_map_eastasia.jpg', 0, 0, W, H, 'object-fit: cover; opacity: 0.92'),
        BOX(0, 0, W, H, 'background: linear-gradient(180deg, rgba(246,239,224,0.55) 0%, rgba(246,239,224,0.15) 40%, rgba(246,239,224,0.6) 100%)'),
        SVG(0, 0, W, H, f'<path d="M 1545 520 C 1300 300 900 260 520 300 C 300 330 150 360 0 420" {S(red, 7)} stroke-dasharray="26 18"/>'
                        f'<circle cx="1545" cy="520" r="16" {S(red, 5, red)}/><path d="M 60 390 L 0 420 L 70 450 Z" {S(red, 5, red)}/>', 'brush'),
        T(1480, 560, 260, 50, '청주 · 1896~1906', 32, fam='Pen', color=c, extra='text-shadow: 0 0 10px #F6EFE0, 0 0 10px #F6EFE0'),
        *(PHOTO(120, 500, 460, 320, 'marseille2' if has('marseille2') else 'marseille1', rot=-3, cap='바다를 건너 · 마르세유 항') if (has('marseille2') or has('marseille1')) else CARD(120, 500, 460, 320, ship(460, 320), rot=-3, cap='바다를 건너 · 마르세유 항')),
        *(PHOTO(640, 560, 420, 300, 'drouot10' if has('drouot10') else 'drouot08', rot=2, cap='1911 · 드루오 경매 711번') if (has('drouot10') or has('drouot08')) else CARD(640, 560, 420, 300, gavel(420, 300), rot=2, cap='1911 · 드루오 경매 711번')),
        *PHOTO(1140, 600, 440, 300, 'bnf_labrouste', rot=-2, cap='1950 · 프랑스 국립도서관 유증'),
        T(120, 70, 1000, 60, '하권이 간 길', 40, fam='Myeongjo', wt=800, color=c, extra='text-shadow: 0 0 12px #F6EFE0, 0 0 12px #F6EFE0'),
        T(120, 130, 1200, 50, '1900년대 지도 · A. Scobel (프랑스 국립도서관 소장)', 26, color=dim, extra='text-shadow: 0 0 10px #F6EFE0'),
    ]
    B['S09'] = [
        IMG('재료/ph_bnf_ovale1.jpg', 0, 0, W, H, 'object-fit: cover; opacity: 0.55'),
        BOX(0, 0, W, H, 'background: linear-gradient(180deg, rgba(246,239,224,0.3) 0%, rgba(246,239,224,0.75) 100%)'),
        SVG(760, 300, 760, 640, f'<circle cx="380" cy="80" r="52" {S(c, 5)}/><path d="M 330 60 C 350 20 410 20 430 60" {S(c, 5, c)}/>'
                                f'<path d="M 300 150 C 250 200 240 300 250 420 L 510 420 C 520 300 510 200 460 150 Z" {S(c, 5)}/>'
                                f'<path d="M 250 420 L 510 420" {S(c, 5)}/><rect x="60" y="440" width="640" height="26" {S(c, 5)}/>'
                                + book(300, 380, 160, 70, c) +
                                f'<path d="M 620 440 L 620 330 L 700 300" {S(c, 5)}/><path d="M 650 300 C 660 270 740 270 750 300 Z" {S(gold, 5, gold)}/>', 'brush'),
        T(120, 160, 700, 60, '1972 · 파리 국립도서관', 34, color=dim, ls=2),
        T(120, 230, 760, 220, '잠들어 있던 저를<br>세상에 알린 손', 70, fam='Myeongjo', wt=800, color=c, lh=92),
        T(120, 480, 700, 50, '한 한국인 연구자의 뒷모습', 36, fam='Pen', color=red),
    ]
    B['S10'] = [
        T(120, 240, 1680, 60, '지금 남아 있는 가장 오래된 금속활자본', 40, color=c, align='center'),
        T(120, 330, 1680, 200, '2001', 170, fam='Myeongjo', wt=800, color=gold, align='center'),
        T(120, 560, 1680, 70, '유네스코 세계기록유산', 54, fam='Myeongjo', wt=800, color=c, align='center'),
        SVG(760, 650, 400, 20, f'<path d="M 4 10 C 100 2 300 18 396 8" {S(red, 6)}/>', 'brush'),
        T(120, 690, 1680, 60, '등재를 결정한 국제회의가 열린 곳 — 청주', 36, fam='Pen', color=red, align='center'),
    ]
    B['S11'] = [
        SVG(1060, 140, 820, 480, f'<rect x="420" y="240" width="300" height="140" rx="10" {S(c, 5)}/><rect x="360" y="380" width="420" height="60" rx="14" {S(c, 5)}/>'
                                 f'<path d="M 420 260 L 220 120 L 80 220" {S(c, 6)}/><path d="M 80 220 L 40 300 L 120 320 L 140 250 Z" {S(c, 5)}/>'
                                 f'<line x1="0" y1="440" x2="820" y2="440" {S(c, 5)}/>', 'pen'),
        SVG(140, 420, 900, 520, f'<path d="M 0 300 C 200 260 400 320 600 280 C 750 250 850 300 900 280 L 900 520 L 0 520 Z" {S(c, 6)}/>'
                                f'<path d="M 420 300 C 470 250 560 250 600 300 C 570 330 480 340 420 300 Z" {S(gold, 6, gold)}/>'
                                f'<path d="M 520 150 L 700 60" {S(c, 8)}/><path d="M 500 160 L 540 140 L 560 190 L 520 210 Z" {S(c, 5, c)}/>'
                                f'<path d="M 700 60 C 760 30 820 60 860 20 C 820 100 760 120 700 100 Z" {S(c, 5)}/>', 'brush'),
        T(120, 150, 900, 60, '1985 · 청주 운천동 공사장', 34, color=dim, ls=2),
        T(120, 220, 900, 180, '「흥덕사」가 새겨진<br>쇠북 조각', 70, fam='Myeongjo', wt=800, color=c, lh=92),
        T(500, 880, 400, 48, '興德寺', 40, fam='Serif', wt=700, color=gold, align='center'),
    ]
    B['S12'] = [
        T(120, 220, 1680, 180, '1985', 150, fam='Myeongjo', wt=800, color=gold, align='center'),
        T(120, 420, 1680, 60, '청주 운천동 공사장에서 「흥덕사」를 새긴 쇠북 조각 출토', 40, color=c, align='center'),
        T(120, 520, 1680, 120, '우리 집 문패였습니다', 96, fam='Myeongjo', wt=800, color=c, align='center'),
        SVG(560, 640, 800, 24, f'<path d="M 4 12 C 200 2 600 22 796 10" {S(red, 7)}/>', 'brush'),
        T(120, 720, 1680, 60, '그 자리에 1992년, 청주고인쇄박물관', 36, fam='Pen', color=dim, align='center'),
    ]
    types = ''.join(f'<rect x="{40 + (i * 37) % 300}" y="{20 + (i * 53) % 260}" width="18" height="24" rx="3" {S(gold, 3, gold)}/>' for i in range(26))
    B['S13'] = [
        *PHOTO(100, 200, 700, 520, 'jikji_pages', rot=-2, cap='직지 하권 본문 · 형이 한 말은 같은 글입니다'),
        SVG(1000, 180, 840, 700, f'<g opacity="0.95">{types}</g>' + book(300, 120, 300, 360, c, dashed=True), 'pencil'),
        T(100, 100, 900, 60, '1378 · 이듬해 나무에 새겨 찍은 목판본', 34, color=dim, ls=2),
        T(1000, 60, 840, 50, '형의 얼굴은 몰라도, 형이 한 말은 압니다', 40, fam='Pen', color=red, align='center'),
        T(1480, 120, 380, 44, '상상도 · 실물 아님', 26, wt=700, color=red, align='center', extra=f'border: 3px solid {red}; border-radius: 22px; line-height: 38px'),
    ]
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
    B['S15'] = [
        *(PHOTO(120, 200, 860, 560, 'museum2', rot=-2, cap='청주고인쇄박물관 · 흥덕사 터 바로 그 자리') if has('museum2') else CARD(120, 200, 860, 560, hall(860, 560), rot=-2, cap='청주고인쇄박물관 · 흥덕사 터 바로 그 자리')),
        *PHOTO(1080, 330, 620, 440, 'museum_type' if has('museum_type') else 'jikji_plate', rot=3, cap='금속활자판 복원'),
        T(120, 100, 1200, 60, '오늘 · 청주고인쇄박물관', 34, color=dim, ls=2),
        T(1080, 150, 760, 60, '청주는 1996년부터 형을 찾고 있습니다', 38, fam='Pen', color=red),
    ]
    B['S16'] = [
        SVG(120, 160, 1680, 760, f'<path d="M 0 700 L 400 700 L 400 620 L 700 620 L 700 540 L 1000 540 L 1000 460 L 1680 460" {S(c, 6)}/>'
                                 f'<path d="M 60 560 L 60 380 L 180 300 L 300 380 L 300 560" {S(c, 5)}/><rect x="130" y="440" width="60" height="100" {S(c, 4)}/>'
                                 f'<path d="M 460 480 L 460 320 L 580 250 L 700 320 L 700 480" {S(c, 5)}/><rect x="540" y="380" width="60" height="80" {S(c, 4)}/>'
                                 f'<path d="M 780 400 L 780 260 L 900 190 L 1020 260 L 1020 400" {S(c, 5)}/>'
                                 f'<path d="M 1120 320 L 1120 200 L 1240 130 L 1360 200 L 1360 320" {S(c, 5)}/>'
                                 f'<path d="M 1400 180 C 1440 120 1520 120 1560 180 C 1600 120 1660 140 1660 200" {S(c, 4)}/>', 'pen'),
        T(120, 80, 1200, 60, '오늘 · 청주 수암골', 34, color=dim, ls=2),
        T(120, 130, 1680, 50, '청주는 1996년부터 형을 찾고 있습니다', 42, fam='Pen', color=red),
    ]
    B['S17'] = [
        T(120, 260, 1680, 160, '직지 찾기', 130, fam='Myeongjo', wt=800, color=red, align='center'),
        T(120, 450, 1680, 70, '1996년, 청주 시민들이 시작했습니다', 50, wt=700, color=c, align='center'),
        T(120, 560, 1680, 120, '1378년 목판본은 찾아냈지만<br>금속활자본 상권은 아직입니다', 36, color=dim, align='center', lh=56),
        SVG(560, 420, 800, 24, f'<path d="M 4 12 C 200 2 600 22 796 10" {S(gold, 7)}/>', 'brush'),
    ]
    rays = ''.join(f'<line x1="300" y1="240" x2="{120 + i * 90}" y2="520" {S(gold, 3)} stroke-dasharray="4 14"/>' for i in range(5))
    B['S18'] = [
        SVG(120, 120, 800, 820, f'<rect x="140" y="120" width="320" height="120" rx="6" {S(c, 6)}/><path d="M 140 120 L 300 20 L 460 120" {S(c, 6)}/>'
                                f'{rays}<line x1="200" y1="240" x2="200" y2="760" {S(c, 6)}/><line x1="400" y1="240" x2="400" y2="760" {S(c, 6)}/>'
                                + ''.join(f'<line x1="200" y1="{320 + j * 90}" x2="400" y2="{320 + j * 90}" {S(c, 5)}/>' for j in range(5)) +
                                f'<circle cx="560" cy="520" r="40" {S(c, 5)}/><path d="M 520 560 C 500 620 500 700 520 760 L 600 760 C 620 700 620 620 600 560 Z" {S(gold, 5)}/>'
                                f'<path d="M 520 580 L 420 500" {S(c, 5)}/>', 'brush'),
        SVG(1020, 300, 800, 600, f'<rect x="80" y="300" width="640" height="240" rx="10" {S(c, 6)}/><path d="M 80 300 L 120 200 L 760 200 L 720 300" {S(c, 6)}/>'
                                 f'<path d="M 260 420 C 300 340 500 340 540 420 C 560 470 520 500 400 500 C 280 500 240 470 260 420 Z" {S(red, 6)}/>'
                                 f'<path d="M 380 370 L 420 330 L 450 370" {S(red, 5)}/>', 'brush'),
        T(1020, 160, 800, 60, '어쩌면, 어느 집 다락', 34, color=dim, ls=2),
        T(1020, 220, 800, 50, '낡은 보자기 속에 있을지 모릅니다', 40, fam='Pen', color=red, align='center'),
        T(1480, 110, 380, 44, '상상도 · 실물 아님', 26, wt=700, color=red, align='center', extra=f'border: 3px solid {red}; border-radius: 22px; line-height: 38px'),
    ]
    B['S19'] = [
        SVG(300, 300, 1320, 560, f'<path d="M 40 420 L 1280 420 L 1240 480 L 80 480 Z" {S(c, 6)}/><line x1="120" y1="480" x2="120" y2="540" {S(c, 6)}/><line x1="1200" y1="480" x2="1200" y2="540" {S(c, 6)}/>', 'brush'),
        SVG(420, 340, 320, 360, f'<rect x="30" y="30" width="260" height="300" rx="4" {S(dim, 4)} stroke-dasharray="10 14"/>', 'pencil'),
        *PHOTO(900, 330, 300, 320, 'jikji_book', rot=2, cap='하권 · 파리', tape='left'),
        SVG(1360, 420, 120, 240, candle(60, 100, c, red), 'brush'),
        T(120, 120, 1680, 120, '오래된 책에서 이 글자를 보시면', 46, fam='Myeongjo', wt=800, color=c, align='center'),
        T(450, 450, 260, 100, '直指 卷上', 56, fam='Serif', wt=700, color=red, align='center'),
        T(120, 200, 1680, 60, '청주에 알려 주세요', 48, fam='Pen', color=red, align='center'),
    ]
    B['S20'] = [
        T(120, 230, 1680, 150, '직지 상권을 찾습니다', 120, fam='Myeongjo', wt=800, color=red, align='center'),
        T(120, 400, 1680, 140, '直指 卷上', 110, fam='Serif', wt=700, color=c, align='center', ls=20),
        SVG(560, 560, 800, 24, f'<path d="M 4 12 C 200 2 600 22 796 10" {S(c, 6)}/>', 'brush'),
        T(120, 620, 1680, 120, '하권은 파리에, 상권은 어딘가에<br>우리 집은 청주에', 44, color=c, align='center', lh=64),
    ]
    B['S21'] = [
        T(120, 220, 1680, 60, '만든 방법', 40, wt=700, color=c, align='center'),
        T(120, 300, 1680, 300, '기획 · 대본 · 내레이션: 출품자 직접<br>그림: 코드로 그린 손그림 애니메이션(SVG) · 배경음: 코드 생성<br>글자 · 지도 · 정보 카드: 직접 디자인(코드)<br>글꼴: 나눔명조 · 나눔펜 · Noto Serif KR · Pretendard (OFL)', 30, color=dim, align='center', lh=52),
        T(120, 560, 1680, 60, '사진 자료 (위키미디어 공용 · 퍼블릭 도메인 / CC)', 28, wt=700, color=c, align='center'),
        T(160, 620, 1600, 200, credit_line() + '<br>직지 하권 · 1900년대 동아시아 지도(A. Scobel) · 드루오 경매장(O. Wegener) · 마르세유 항(Agence Rol): 프랑스 국립도서관 소장 · 퍼블릭 도메인', 24, color=dim, align='center', lh=40),
    ]
    return B
