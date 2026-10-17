#!/usr/bin/env python3
"""소리 지도 보기 — out/소리지도.json (굽기 · --audio 때 생긴다 · reference/sound.md §6)

  python3 <스킬>/scripts/soundmap.py out/소리지도.json [--out 살펴보기/소리지도.png] [--w 2400]
     → 한 장 그림: 위 = 피아노 롤(작곡된 음표 · 역할별 색 · 마디선 · 장면 세기 띠 · 필인 · 심벌 · 쾅)
                   아래 = 효과음 줄(시각 · 이름) · 대사 줄
     → 터미널에 요약(장르 · 조 · 빠르기 · 악기 · 음표 수 · 효과음 목록)
화면에 «진짜 소리»를 그리는 장면(피아노 롤 · 소리 지도)의 기준 · 점검용. 장면 코드에서는 json 을 그대로 읽어 쓴다.
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(os.path.dirname(HERE), 'assets', 'fonts', 'Pretendard-Regular.otf')
ROLE_COL = {'lead': (255, 214, 64), 'comp': (90, 200, 250), 'pad': (120, 130, 220), 'bass': (255, 120, 90), 'extra': (240, 140, 220), 'drums': (200, 200, 200)}
ROLE_KO = {'lead': '선율', 'comp': '반주', 'pad': '패드', 'bass': '베이스', 'extra': '꾸밈', 'drums': '드럼'}


def opt(a, k, d=None):
    return a[a.index(k) + 1] if k in a and a.index(k) + 1 < len(a) else d


def draw(m, out, W=2400):
    b = m.get('bgm') or {}; notes = b.get('notes', []); fx = m.get('sfx', []); vo = m.get('voices', [])
    dur = m.get('dur') or max([n['t'] + n['dur'] for n in notes] + [f['t'] + 1 for f in fx] + [1])
    f = ImageFont.truetype(FONT, 22) if os.path.exists(FONT) else ImageFont.load_default()
    fs = ImageFont.truetype(FONT, 17) if os.path.exists(FONT) else f
    L, R = 120, 30; PH = 520; band = 34; lane = 150; vl = 60
    H = 60 + band + PH + 20 + lane + vl + 40
    im = Image.new('RGB', (W, H), (22, 24, 30)); d = ImageDraw.Draw(im)
    X = lambda t: L + (W - L - R) * t / dur
    title = f"{b.get('style', '배경음 없음')} · {b.get('key_name', '')} {b.get('mode', '')} · {b.get('bpm', '')} bpm · seed {b.get('seed', '')}" if b else '배경음 없음'
    d.text((L, 16), title, font=f, fill=(235, 235, 240))
    y0 = 60
    for s in b.get('sections', []):   # 장면 세기 띠
        e = s['energy']; c = (40 + 45 * max(e, 0), 60 + 30 * max(e, 0), 90) if e >= 0 else (40, 40, 40)
        d.rectangle([X(s['t0']), y0, X(s['t1']), y0 + band - 4], fill=c); d.text((X(s['t0']) + 6, y0 + 5), f'세기 {e}', font=fs, fill=(240, 240, 240))
    py = y0 + band; d.rectangle([L, py, W - R, py + PH], fill=(30, 33, 40))
    keys = [n['key'] for n in notes if n['role'] != 'drums'] or [48, 84]; lo, hi = min(keys) - 2, max(keys) + 2
    Y = lambda k: py + PH - 40 - (PH - 50) * (k - lo) / max(1, hi - lo)
    for bar in b.get('bars', []):
        x = X(bar['t']); d.line([x, py, x, py + PH], fill=(70, 74, 86), width=2 if bar['first'] else 1)
        if bar['first'] and bar['energy'] >= 2: d.text((x + 3, py + 4), '심벌', font=fs, fill=(255, 230, 120))
        if bar['fill']: d.text((x + 3, py + 24), '필인→', font=fs, fill=(180, 220, 255))
    for n in notes:
        c = ROLE_COL.get(n['role'], (200, 200, 200))
        if n['role'] == 'drums':
            x = X(n['t']); d.rectangle([x - 1, py + PH - 30, x + 1, py + PH - 30 + 8 + n['vel'] // 12], fill=c)
        else:
            y = Y(n['key']); d.rectangle([X(n['t']), y - 3, max(X(n['t']) + 2, X(n['t'] + n['dur'])), y + 3], fill=c)
    for h in b.get('hits', []):
        d.line([X(h), py, X(h), py + PH], fill=(255, 80, 80), width=3); d.text((X(h) + 4, py + 44), '쾅', font=f, fill=(255, 90, 90))
    lx = L
    for r, c in ROLE_COL.items():
        if any(n['role'] == r for n in notes):
            nm = (b.get('instruments', {}).get(r, {}) or {}).get('name') or ''
            d.rectangle([lx, py + PH + 6, lx + 14, py + PH + 20], fill=c); d.text((lx + 20, py + PH + 2), f'{ROLE_KO[r]} {nm}', font=fs, fill=(220, 220, 225)); lx += 250
    sy = py + PH + 40; d.rectangle([L, sy, W - R, sy + lane], fill=(30, 33, 40)); d.text((10, sy + 6), '효과음', font=f, fill=(235, 235, 240))
    for i, e in enumerate(fx):
        x = X(e['t']); row = i % 4; d.line([x, sy, x, sy + lane], fill=(255, 214, 64), width=2)
        d.text((x + 4, sy + 6 + row * 34), e['desc'].split(' (')[0][:14], font=fs, fill=(255, 230, 150))
    vy = sy + lane + 8; d.text((10, vy + 6), '대사', font=f, fill=(235, 235, 240))
    for v in vo: d.rectangle([X(v['t']), vy + 6, X(v['t'] + v['dur']), vy + vl - 14], fill=(110, 200, 140))
    for t in range(0, int(dur) + 1):
        x = X(t); d.text((x - 6, H - 30), f'{t}', font=fs, fill=(150, 150, 160))
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True); im.save(out); return out


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(1)
    m = json.load(open(a[0], encoding='utf-8')); b = m.get('bgm') or {}
    if b:
        print(f"배경음: {b['style']} · {b['key_name']} {b['mode']} · {b['bpm']} bpm · seed {b['seed']} · 마디 {len(b['bars'])} · 음표 {len(b['notes'])}")
        print('악기:', ' · '.join(f"{ROLE_KO.get(k, k)}={v.get('name')}" for k, v in b['instruments'].items()))
    print(f"효과음 {len(m.get('sfx', []))}개:", ' · '.join(f"{e['t']:.2f} {e['name']}" for e in m.get('sfx', [])[:30]))
    print(f"대사 {len(m.get('voices', []))}개")
    print(draw(m, opt(a, '--out', os.path.join(os.path.dirname(a[0]) or '.', '소리지도.png')), int(opt(a, '--w', 2400))))
