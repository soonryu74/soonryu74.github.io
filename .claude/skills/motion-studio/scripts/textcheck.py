#!/usr/bin/env python3
"""글자 화면 점검 — 좌표가 아니라 «화면»으로 본다 (reference/canvas-rules.md §6-B).

  python3 <스킬>/scripts/textcheck.py canvas/처음        (보드 파일 · 폴더 여러 개 가능 · 작업 폴더에서 실행)

보드마다 두 장을 그려 겹쳐 본다 — ① 브라우저(캔버스와 같은 그리기) ② 엔진. 글자 요소마다
  · 상자 안 글자 어긋남 — 브라우저 화면에서 글자 잉크의 세로 가운데가 상자 가운데보다 몇 px 아래(+) · 위(−)인지.
    글꼴마다 한글이 아래로 처지거나 위로 뜬다 → 캔버스에서 고친다(고칠 값을 같이 알려 준다).
  · 엔진 − 캔버스 — 같은 글자를 엔진이 몇 px 다르게 그렸는지. 2px 넘으면 엔진 문제 → 알린다.
결과: 화면에 요약 · out/_textcheck.md · out/_textcheck.jpg(어긋난 곳 표시 · 위 = 캔버스, 아래 = 엔진)
필요: playwright + chromium (없으면 설치 안내를 띄우고 끝낸다 — 굽기와는 상관없다)
"""
import base64
import glob
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import canvas as C   # noqa: E402


def _faces():
    css, seen = [], set()
    for d in C.font_dirs():
        for f in sorted(glob.glob(os.path.join(d, '**', '*.[ot]tf'), recursive=True)):
            try: fam, sty = ImageFont.truetype(f, 12).getname()
            except Exception: continue
            w = C.WEIGHTS.get(C._key(sty), 400)
            if (fam, w) in seen: continue
            seen.add((fam, w)); fmt = 'opentype' if f.lower().endswith('otf') else 'truetype'
            b64 = base64.b64encode(open(f, 'rb').read()).decode()
            css.append(f"@font-face{{font-family:'{fam}';font-weight:{w};src:url(data:font/{fmt};base64,{b64}) format('{fmt}')}}")
    return '\n'.join(css)


def _shots(paths):
    from playwright.sync_api import sync_playwright
    faces = _faces(); out = {}; full = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for path in paths:
            root, _ = C.read_board(path)
            src = open(path, encoding='utf-8').read()
            m = re.search(r'<x-dc>(.*)</x-dc>', src, re.S)
            body = re.sub(r'<helmet>.*?</helmet>', '', m.group(1) if m else src, flags=re.S)
            only = ('*{background:transparent!important;background-image:none!important;border-color:transparent!important;'
                    'box-shadow:none!important;text-shadow:none!important;color:#000!important;-webkit-text-fill-color:#000!important;'
                    '-webkit-text-stroke-color:transparent!important;filter:none!important;opacity:1!important}img,svg{visibility:hidden!important}')
            html = f"<!doctype html><html><head><meta charset='utf-8'><style>{faces} body{{margin:0;background:#fff}} {only}</style></head><body>{body}</body></html>"
            pg = b.new_page(viewport={'width': root['w'], 'height': root['h']}, device_scale_factor=1)
            pg.set_content(html); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(250)
            tmp = f'/tmp/_tc_{os.getpid()}.png'
            pg.screenshot(path=tmp, clip={'x': 0, 'y': 0, 'width': root['w'], 'height': root['h']})
            out[path] = Image.open(tmp).convert('RGB')
            pg.set_content(html.replace(only, '')); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(150)
            pg.screenshot(path=tmp, clip={'x': 0, 'y': 0, 'width': root['w'], 'height': root['h']}); pg.close()
            full[path] = Image.open(tmp).convert('RGB')
        b.close()
    return out, full


def _ink(img, e):
    """글자 색에 가까운 픽셀의 세로 범위 (상자 안 · 위아래로 글자 크기 ¼ 여유)"""
    h = C.box_h(e); pad = max(6, e['size'] * 0.25)
    x0, y0 = int(max(0, e['x'])), int(max(0, e['y'] - pad)); x1, y1 = int(e['x'] + e['w']), int(min(img.height, e['y'] + h + pad))
    if x1 - x0 < 2 or y1 - y0 < 2: return None
    a = np.asarray(img.crop((x0, y0, x1, y1)).convert('L')).astype(int)
    m = a < 128   # 글자만 검게 그린 화면 — 바탕 · 테두리 · 그림자는 빠져 있다
    ys = np.where(m.sum(1) >= 2)[0]
    return (y0 + ys[0], y0 + ys[-1]) if len(ys) else None


def check(paths, out='out'):
    try:
        import playwright  # noqa
    except ImportError:
        print('playwright 가 없어요 — 글자 화면 점검을 건너뜁니다 (굽기와는 상관없음).\n  → pip install playwright && python3 -m playwright install chromium'); return None
    try:
        shots, shots_full = _shots(paths)
    except Exception as ex:
        print('브라우저로 그릴 수 없어요 — 글자 화면 점검을 건너뜁니다 (굽기와는 상관없음).\n'
              '  → pip install playwright && python3 -m playwright install chromium\n  ', str(ex).splitlines()[0][:160]); return None
    os.makedirs(out, exist_ok=True)
    rows, marks = [], {}
    for path in paths:
        name = os.path.splitext(os.path.basename(path))[0].replace('.dc', '')
        root, els = C.read_board(path)
        web = shots[path]
        only = [dict(e, bg=None, bw=0, shadow=[], tshadow=[], color=(0, 0, 0), tcolor_a=255, text_fill=None, stroke=0, opacity=1, blur=0)
                for e in els if e['text'] and not e['src']]
        eng = C.draw_board(dict(root, bg=(255, 255, 255), paint=None), only).convert('RGB')
        view_w, view_e = shots_full.get(path), C.draw_board(root, els).convert('RGB')
        marks[path] = (view_w or web, view_e, [])
        for e in els:
            if not e['text'] or e['src'] or e.get('rot'): continue   # 기운 글자는 세로 범위로 못 잰다
            a, b = _ink(web, e), _ink(eng, e)
            if not a or not b: continue
            r = dict(board=name, id=e['id'], font=e['family'].split(',')[0].strip('\'" '), size=e['size'], text=e['text'].replace('\n', ' ')[:14],
                     eng=round((b[0] + b[1] - a[0] - a[1]) / 2, 1), eng_max=int(max(abs(b[0] - a[0]), abs(b[1] - a[1]))), box=None, fix='')
            boxed = (e['bg'] or e['bw']) and C.box_h(e) < C.line_h(e) * 1.6 + sum(e.get('pad', (0, 0, 0, 0))[1::2]) + 1   # 한 줄 글자 상자(배지 · 꼬리표 · 버튼)
            if boxed:
                cy = e['y'] + C.box_h(e) / 2; off = round((a[0] + a[1]) / 2 - cy, 1); r['box'] = off
                if abs(off) >= max(2, e['size'] * 0.04):
                    lh = C.line_h(e); hh = C.box_h(e) if e.get('border_box') else C.box_h(e) - sum(e.get('pad', (0,) * 4)[1::2])
                    r['fix'] = f"글자를 {abs(off):.0f}px {'위로' if off > 0 else '아래로'} — height: {hh:.0f}px 를 적고(이미 있으면 그대로) line-height: {lh - 2 * off:.0f}px"
            if r['eng_max'] > 2 or r['fix']: marks[path][2].append((e, r))
            rows.append(r)
    bad_eng = [r for r in rows if r['eng_max'] > 2]; bad_box = [r for r in rows if r['fix']]
    L = ['# 글자 화면 점검', '', f'- 글자 {len(rows)}개 · 엔진−캔버스 2px 넘음 **{len(bad_eng)}** · 상자 안 어긋남(고칠 것) **{len(bad_box)}**', '']
    if bad_box:
        L += ['## 상자 안 글자 어긋남 — 캔버스에서 고친다 (+ = 아래로 처짐 · − = 위로 뜸)', '', '| 보드 | # | 글꼴 | 크기 | 어긋남 | 고치는 법 | 글자 |', '|---|---|---|---|---|---|---|']
        L += [f"| {r['board']} | {r['id']} | {r['font']} | {r['size']:.0f} | {r['box']:+.1f} | {r['fix']} | {r['text']} |" for r in bad_box] + ['']
    if bad_eng:
        L += ['## 엔진이 캔버스와 다르게 그림 — 엔진 문제 (스킬 관리자에게 알린다)', '', '| 보드 | # | 글꼴 | 크기 | 가운데 차이 | 글자 |', '|---|---|---|---|---|---|']
        L += [f"| {r['board']} | {r['id']} | {r['font']} | {r['size']:.0f} | {r['eng']:+.1f} | {r['text']} |" for r in bad_eng] + ['']
    open(os.path.join(out, '_textcheck.md'), 'w', encoding='utf-8').write('\n'.join(L))
    tiles = []
    for path, (web, eng, ms) in marks.items():
        if not ms: continue
        pair = Image.new('RGB', (web.width, web.height * 2 + 8), (255, 0, 120)); pair.paste(web, (0, 0)); pair.paste(eng, (0, web.height + 8))
        d = ImageDraw.Draw(pair)
        for e, r in ms:
            for oy in (0, web.height + 8):
                d.rectangle([e['x'] - 4, oy + e['y'] - 4, e['x'] + e['w'] + 4, oy + e['y'] + C.box_h(e) + 4], outline=(255, 0, 120), width=4)
        tiles.append(pair.resize((pair.width // 2, pair.height // 2)))
    if tiles:
        sheet = Image.new('RGB', (sum(t.width for t in tiles) + 10 * (len(tiles) - 1), max(t.height for t in tiles)), (40, 40, 40)); x = 0
        for t in tiles: sheet.paste(t, (x, 0)); x += t.width + 10
        sheet.save(os.path.join(out, '_textcheck.jpg'), quality=85)
    print('\n'.join(L[2:3]))
    for r in bad_box: print(f"  상자 {r['board']} #{r['id']} {r['font']} {r['box']:+.1f}px → {r['fix']}  «{r['text']}»")
    for r in bad_eng: print(f"  엔진 {r['board']} #{r['id']} {r['font']} {r['eng']:+.1f}px  «{r['text']}»")
    print(f'→ {out}/_textcheck.md' + (f' · {out}/_textcheck.jpg' if tiles else ''))
    return rows


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    files = []
    for a in args or ['canvas/확정']:
        if os.path.isdir(a): files += sorted(glob.glob(os.path.join(a, '*.dc.html')))
        elif os.path.isfile(a): files.append(a)
        else: sys.exit(f'없는 경로예요: {a}')
    if not files: sys.exit('보드(.dc.html)를 못 찾았어요')
    check(files)
