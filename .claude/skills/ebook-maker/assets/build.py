#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build.py — 웹북 원고(book.md) → 웹북(index.html)

사용:
    python3 build.py book.md                 # book.md 옆에 index.html 생성
    python3 build.py book.md -o out.html
    python3 build.py book.md --theme ai      # 테마 강제 (front matter 의 theme 보다 우선)

원고 문법은 writing-guide.md 참고.
QR: segno 가 설치돼 있으면(pip install segno) 영상 쪽에 QR 을 자동으로 넣고, 없으면 링크 글자만 넣는다.
"""
import re, os, sys, html, argparse, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, 'template.html')
SVGDIR = os.path.join(HERE, 'svg')

# 주제 → 테마 자동 매칭 키워드 (themes.md 와 같은 표)
THEMES = {
    'estate': '부동산 아파트 전세 월세 매매 청약 등기 임대 집값 주택 빌라 오피스텔 분양 재개발 중개 임대차',
    'ai':     'AI 인공지능 챗GPT GPT 클로드 Claude 제미나이 코딩 프로그램 자동화 앱 바이브코딩 프롬프트 노션 엑셀 PPT 업무 IT 개발 컴퓨터 노트북LM 스킬 에이전트',
    'money':  '창업 수익 돈 재테크 투자 매출 부업 1인창업 사업 마케팅 유튜브 판매 쇼핑몰 스마트스토어 수익화 전자책 강의 브랜딩',
    'health': '건강 병원 의료 돌봄 운동 식단 다이어트 요양 치매 혈압 당뇨 간병 복지 약 영양 수면',
    'edu':    '교육 입시 공부 학습 자녀 학교 수능 대학 시험 영어 수학 독서 아이 학부모 과외',
    'life':   '생활 여행 취미 요리 레시피 정리 인테리어 반려 캠핑 자동차 살림 이사',
    'law':    '법 법률 행정 세금 계약 제도 신고 소송 민원 지원금 정부 공공 보험 연금 상속 증여 절세',
    'mind':   '마음 신앙 기도 묵상 관계 습관 감정 자존감 위로 에세이 명상 인생 가족 성경',
}
THEME_NAMES = ['default'] + list(THEMES)

FIELD_KEYS = {'h', 'title', 'sub', 'lede', 'kick', 'img', 'svg', 'svgfile', 'svgtext', 'alt',
              'caption', 'note', 'len', 'v', 'by', 'cta', 'url', 'label', 'src'}
PAGE_TYPES = {'cover', 'toc', 'open', 'body', 'steps', 'check', 'quote', 'video', 'close', 'raw'}
MAX_CHARS = 520   # 한 쪽 권장 글자 수(넘침 경고 기준)


def esc(s):
    return html.escape(s or '', quote=False)


def attr(s):
    return html.escape(s or '', quote=True)


def inline(s):
    """인라인 마크업: **굵게** `코드` ==형광== [글](url)"""
    s = esc(s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'==(.+?)==', r'<mark>\1</mark>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    return s


def table(rows):
    cells = []
    for r in rows:
        r = r.strip().strip('|')
        if re.fullmatch(r'[\s|:\-]+', r):
            continue
        cells.append([c.strip() for c in r.split('|')])
    if not cells:
        return ''
    out = ['<div class="tw"><table>']
    out.append('<tr>' + ''.join('<th>' + inline(c) + '</th>' for c in cells[0]) + '</tr>')
    for r in cells[1:]:
        out.append('<tr>' + ''.join('<td>' + inline(c) + '</td>' for c in r) + '</tr>')
    out.append('</table></div>')
    return ''.join(out)


BLOCK_START = re.compile(r'^(```|\s*\||>|\s*[-*] |\s*\d+[.)] |\$ )')


def md(lines):
    """본문 블록 마크다운 → HTML 조각 리스트"""
    out, i, n = [], 0, len(lines)
    while i < n:
        ln = lines[i]
        if not ln.strip():
            i += 1
            continue
        if ln.startswith('```'):
            j, buf = i + 1, []
            while j < n and not lines[j].startswith('```'):
                buf.append(lines[j]); j += 1
            out.append('<pre>' + esc('\n'.join(buf)) + '</pre>'); i = j + 1; continue
        if ln.lstrip().startswith('|'):
            rows = []
            while i < n and lines[i].lstrip().startswith('|'):
                rows.append(lines[i]); i += 1
            out.append(table(rows)); continue
        if ln.startswith('>'):
            buf = []
            while i < n and lines[i].startswith('>'):
                buf.append(lines[i][1:].strip()); i += 1
            out.append('<blockquote>' + inline(' '.join(buf)) + '</blockquote>'); continue
        if re.match(r'^\s*[-*] ', ln):
            items = []
            while i < n and re.match(r'^\s*[-*] ', lines[i]):
                items.append(re.sub(r'^\s*[-*] ', '', lines[i])); i += 1
            out.append('<ul>' + ''.join('<li>' + inline(x) + '</li>' for x in items) + '</ul>'); continue
        if re.match(r'^\s*\d+[.)] ', ln):
            items = []
            while i < n and re.match(r'^\s*\d+[.)] ', lines[i]):
                items.append(re.sub(r'^\s*\d+[.)] ', '', lines[i])); i += 1
            out.append('<ol>' + ''.join('<li>' + inline(x) + '</li>' for x in items) + '</ol>'); continue
        if ln.startswith('$ '):
            out.append('<p class="fml">' + inline(ln[2:]) + '</p>'); i += 1; continue
        buf = []
        while i < n and lines[i].strip() and not BLOCK_START.match(lines[i]):
            buf.append(lines[i].strip()); i += 1
        if not buf:
            buf.append(lines[i].strip()); i += 1
        out.append('<p>' + inline(' '.join(buf)) + '</p>')
    return out


def prose(lines, extra_cls=''):
    blocks = md(lines)
    if not blocks:
        return ''
    return '<div class="prose%s">%s</div>' % ((' ' + extra_cls) if extra_cls else '', ''.join(blocks))


# ---------- 파싱 ----------
def parse_kv(text):
    d = {}
    for ln in text.split('\n'):
        m = re.match(r'^([A-Za-z_]+):\s?(.*)$', ln)
        if m:
            d[m.group(1).strip()] = m.group(2).strip()
    return d


def parse(src):
    fm, body = {}, src
    m = re.match(r'^﻿?---\s*\n(.*?)\n---\s*\n?', src, re.S)
    if m:
        fm = parse_kv(m.group(1)); body = src[m.end():]
    pages, cur = [], None
    for ln in body.split('\n'):
        mm = re.match(r'^==\s*([a-z]+)(?:\s+(.*))?$', ln)
        if mm:
            cur = {'type': mm.group(1), 'arg': (mm.group(2) or '').strip(), 'f': {}, 'lines': []}
            pages.append(cur); continue
        if cur is None:
            continue
        if cur['type'] != 'raw':
            fk = re.match(r'^([a-z_]+):\s?(.*)$', ln)
            if fk and fk.group(1) in FIELD_KEYS:
                cur['f'][fk.group(1)] = fk.group(2).strip(); continue
        cur['lines'].append(ln)
    return fm, pages


# ---------- 테마 ----------
def pick_theme(text):
    low = text.lower()
    best, score = 'default', 0
    for name, kws in THEMES.items():
        s = sum(low.count(k.lower()) for k in kws.split())
        if s > score:
            best, score = name, s
    return best


# ---------- 조각 ----------
def load_svg(name, svgtext, bookdir, warn, is_file=False):
    path = os.path.join(bookdir, name) if is_file else os.path.join(SVGDIR, name + '.svg')
    if not os.path.exists(path):
        warn.append('SVG 를 찾지 못함: %s (사용 가능: %s)' % (name, ', '.join(svg_names())))
        return ''
    svg = open(path, encoding='utf-8').read()
    svg = re.sub(r'<\?xml[^>]*\?>\s*', '', svg)
    texts = [t.strip() for t in svgtext.split('|')] if svgtext else []

    def rep(m):
        idx = int(m.group(1)) - 1
        default = m.group(2) or ''
        return esc(texts[idx]) if idx < len(texts) and texts[idx] else esc(default)
    return re.sub(r'\{(\d+)(?::([^}]*))?\}', rep, svg)


def svg_names():
    try:
        return sorted(f[:-4] for f in os.listdir(SVGDIR) if f.endswith('.svg'))
    except OSError:
        return []


def fig(p, bookdir, warn, cls=''):
    f = p['f']
    inner = ''
    if f.get('img'):
        inner = '<img src="%s" alt="%s" loading="lazy">' % (attr(f['img']), attr(f.get('alt', '')))
    elif f.get('svg'):
        inner = load_svg(f['svg'], f.get('svgtext', ''), bookdir, warn)
    elif f.get('svgfile'):
        inner = load_svg(f['svgfile'], f.get('svgtext', ''), bookdir, warn, is_file=True)
    if not inner:
        return ''
    out = '<div class="fig%s">%s</div>' % ((' ' + cls) if cls else '', inner)
    if f.get('caption'):
        out += '<p class="cap">' + inline(f['caption']) + '</p>'
    return out


def note(p):
    return ('<p class="note">' + inline(p['f']['note']) + '</p>') if p['f'].get('note') else ''


def qr_datauri(url):
    try:
        import segno, io
    except ImportError:
        return ''
    buf = io.BytesIO()
    segno.make(url, error='m').save(buf, kind='svg', border=0, xmldecl=False, svgns=True, dark='#17150f', scale=4)
    return 'data:image/svg+xml;utf8,' + urllib.parse.quote(buf.getvalue().decode('utf-8'))


def section(cls, label, inner, brand):
    return ('<section class="s %s" data-label="%s"><div class="paper"><div class="pin"><div class="mid">\n%s\n'
            '</div></div><div class="foot"><span class="brand">%s</span><span class="pnum"></span></div></div></section>'
            % (cls, attr(label), inner, esc(brand)))


# ---------- 쪽 렌더 ----------
def render(fm, pages, theme, bookdir):
    warn, out = [], []
    brand = fm.get('brand', '')
    title = fm.get('title', '제목')
    opens = [p for p in pages if p['type'] == 'open']
    cur_sec = ''
    seen_video_qr = False

    for n, p in enumerate(pages, 1):
        t, f, L = p['type'], p['f'], p['lines']
        if t not in PAGE_TYPES:
            warn.append('%d쪽: 모르는 쪽 유형 "%s" (가능: %s)' % (n, t, ', '.join(sorted(PAGE_TYPES))))
            continue
        label = f.get('label') or cur_sec or title

        if t == 'cover':
            kick = f.get('kick') or ' · '.join(x for x in [fm.get('series'), fm.get('chapter')] if x)
            inner = ''
            if kick:
                inner += '<span class="kick">%s</span>' % esc(kick)
            inner += fig(p, bookdir, warn, 'covfig')
            inner += '<h1>%s</h1><div class="rule"></div>' % esc(f.get('title') or title)
            lede = f.get('lede') or fm.get('subtitle', '')
            if lede:
                inner += '<p class="lede">%s</p>' % inline(lede)
            by = ' · '.join(x for x in [(fm.get('author', '') + ' 지음') if fm.get('author') else '', brand] if x)
            if by:
                inner += '<p class="by">%s</p>' % esc(by)
            inner += prose(L)
            out.append(section('cover' + (' on' if n == 1 else ''), '표지', inner, brand))

        elif t == 'toc':
            inner = '<span class="eyebrow">차례</span><h2 class="tochead">%s</h2>' % esc(f.get('h') or '이 책에서')
            dense = ' dense' if len(opens) > 6 else ''
            rows = ''.join('<a class="tocrow" data-go="%s"><span class="tn">%s</span><span class="tt"><b>%s</b><i>%s</i></span></a>'
                           % (attr(o['arg']), esc(o['arg']), inline(o['f'].get('title', '')), inline(o['f'].get('sub', '')))
                           for o in opens)
            inner += '<div class="toclist%s">%s</div>' % (dense, rows)
            tn = '\n'.join(L).strip() or fm.get('toc_note', '')
            if tn:
                inner += '<p class="tocnote">%s</p>' % inline(tn)
            if not opens:
                warn.append('차례: == open 쪽이 하나도 없음')
            out.append(section('toc alt', '차례', inner, brand))

        elif t == 'open':
            if not p['arg']:
                warn.append('%d쪽: == open 뒤에 절 번호가 없음 (예: == open 1)' % n)
            cur_sec = f.get('title', '')
            inner = '<div class="chopen"><span class="chnum">%s</span><h2>%s</h2>' % (esc(p['arg']), esc(cur_sec))
            if f.get('sub'):
                inner += '<p class="chsub">%s</p>' % inline(f['sub'])
            inner += '<div class="rule mid"></div></div>'
            inner += fig(p, bookdir, warn, 'openfig')
            out.append(section('open', cur_sec or ('%s절' % p['arg']), inner, brand))

        elif t == 'body':
            if not f.get('h'):
                warn.append('%d쪽(body): h: 쪽 제목이 없음' % n)
            inner = ('<h3>%s</h3>' % esc(f['h'])) if f.get('h') else ''
            inner += fig(p, bookdir, warn) + prose(L) + note(p)
            if f.get('src'):
                inner += '<p class="src">%s</p>' % inline(f['src'])
            out.append(section('body', label, inner, brand))

        elif t == 'steps':
            items, rest = [], []
            for ln in L:
                m = re.match(r'^\s*\d+[.)]\s+(.*)$', ln)
                (items if m else rest).append(m.group(1) if m else ln)
            inner = ('<h3>%s</h3>' % esc(f['h'])) if f.get('h') else ''
            inner += fig(p, bookdir, warn) + prose(rest)
            lis = ''
            for it in items:
                m = re.match(r'^\*\*(.+?)\*\*\s*[—:\-–]?\s*(.*)$', it)
                if m:
                    lis += '<li><b>%s</b><span>%s</span></li>' % (inline(m.group(1)), inline(m.group(2)))
                else:
                    lis += '<li><b>%s</b></li>' % inline(it)
            inner += '<ol class="steps">%s</ol>' % lis + note(p)
            if not items:
                warn.append('%d쪽(steps): "1. **제목** 설명" 형식의 항목이 없음' % n)
            out.append(section('steps', label, inner, brand))

        elif t == 'check':
            items, rest = [], []
            for ln in L:
                m = re.match(r'^\s*[-*]\s+(?:\[[ xX]\]\s*)?(.*)$', ln)
                (items if m else rest).append(m.group(1) if m else ln)
            inner = ('<h3>%s</h3>' % esc(f['h'])) if f.get('h') else ''
            inner += prose(rest) + '<ul class="chk">%s</ul>' % ''.join('<li>' + inline(x) + '</li>' for x in items) + note(p)
            if not items:
                warn.append('%d쪽(check): "- 항목" 이 없음' % n)
            out.append(section('check', label, inner, brand))

        elif t == 'quote':
            text = ' '.join(ln.strip().lstrip('>').strip() for ln in L if ln.strip())
            inner = '<div class="bigq"><p>%s</p>' % inline(text)
            if f.get('by'):
                inner += '<cite>— %s</cite>' % inline(f['by'])
            inner += '</div>'
            out.append(section('quote', label, inner, brand))

        elif t == 'video':
            vid = f.get('v') or p['arg']
            if not vid:
                warn.append('%d쪽(video): 유튜브 ID 가 없음 (v: ID)' % n)
            inner = '<div class="vidpg"><span class="eyebrow">영상으로 보기</span>'
            if f.get('h'):
                inner += '<h3>%s</h3>' % esc(f['h'])
            if f.get('len'):
                inner += '<p class="vnote">약 %s</p>' % esc(f['len'])
            inner += ('<div class="vwrap" data-v="%s"><button class="vframe" type="button" aria-label="영상 재생">'
                      '<img loading="lazy" src="https://i.ytimg.com/vi/%s/hqdefault.jpg" alt=""><span class="vplay"></span></button></div>'
                      % (attr(vid), attr(vid)))
            url = 'https://youtu.be/' + vid
            qr = qr_datauri(url)
            seen_video_qr = seen_video_qr or bool(qr)
            inner += '<div class="vqr">'
            if qr:
                inner += '<img class="qr" alt="QR" src="%s">' % qr
            inner += '<div><b>youtu.be/%s</b><span>%s</span></div></div>' % (
                esc(vid), '휴대폰 카메라로 QR 을 찍으면 바로 열립니다' if qr else '휴대폰 브라우저에 이 주소를 입력하세요')
            inner += prose(L) + '</div>' + note(p)
            out.append(section('video alt', label, inner, brand))

        elif t == 'close':
            inner = '<div class="chopen">'
            inner += '<span class="kick">%s</span>' % esc(f.get('kick') or '맺음')
            inner += '<h2 style="margin-top:14px">%s</h2>' % esc(f.get('title') or '같이 갑시다')
            inner += '</div>' + fig(p, bookdir, warn, 'openfig')
            inner += prose(L, 'lede')
            if f.get('cta') and f.get('url'):
                inner += '<a class="cta" href="%s">%s</a>' % (attr(f['url']), esc(f['cta']))
            out.append(section('close open', '맺음', inner, brand))

        elif t == 'raw':
            out.append(section('body', label, '\n'.join(L), brand))

        # 넘침 경고: 태그 떼고 글자 수
        plain = re.sub(r'<svg.*?</svg>', '', out[-1], flags=re.S)
        plain = re.sub(r'<[^>]+>', '', plain)
        plain = re.sub(r'\s+', '', plain)
        if len(plain) > MAX_CHARS and t not in ('toc', 'raw'):
            warn.append('%d쪽(%s): 글자 %d자 — 넘칠 수 있음. 쪽을 나누세요(권장 %d자 이내)' % (n, label, len(plain), MAX_CHARS))

    if not any(p['type'] == 'cover' for p in pages):
        warn.append('표지(== cover)가 없음')
    if pages and pages[0]['type'] != 'cover':
        # 첫 쪽이 표지가 아니면 첫 섹션을 켠다
        out[0] = out[0].replace('<section class="s ', '<section class="s on ', 1)
    return '\n\n'.join(out), warn, seen_video_qr


def main():
    ap = argparse.ArgumentParser(description='웹북 원고 → HTML')
    ap.add_argument('src', help='book.md')
    ap.add_argument('-o', '--out', help='출력 html (기본: 원고 옆 index.html)')
    ap.add_argument('--theme', choices=THEME_NAMES, help='테마 강제')
    a = ap.parse_args()

    src = open(a.src, encoding='utf-8').read()
    fm, pages = parse(src)
    if not pages:
        print('쪽(== 유형)이 하나도 없습니다. writing-guide.md 를 보세요.'); return 1
    bookdir = os.path.dirname(os.path.abspath(a.src))
    outpath = a.out or os.path.join(bookdir, 'index.html')

    theme = a.theme or fm.get('theme', 'auto')
    if theme == 'auto' or theme not in THEME_NAMES:
        theme = pick_theme(src)
    body, warn, has_qr = render(fm, pages, theme, bookdir)

    tpl = open(TEMPLATE, encoding='utf-8').read()
    dl = ('<a id="dl" href="%s" download>PDF</a>' % attr(fm['pdf'])) if fm.get('pdf') else ''
    html_out = (tpl.replace('{{THEME}}', theme)
                .replace('{{TITLE}}', esc(fm.get('title', '제목')))
                .replace('{{BRAND}}', esc(fm.get('brand', '')))
                .replace('{{DESC}}', attr(fm.get('subtitle') or fm.get('title', '')))
                .replace('{{DL}}', dl)
                .replace('{{PAGES}}', body))
    open(outpath, 'w', encoding='utf-8').write(html_out)

    kinds = {}
    for p in pages:
        kinds[p['type']] = kinds.get(p['type'], 0) + 1
    print('완성: %s' % outpath)
    print('쪽수: %d  (%s)' % (len(pages), ', '.join('%s %d' % kv for kv in kinds.items())))
    print('테마: %s%s' % (theme, '' if a.theme or fm.get('theme') not in (None, 'auto') else ' (자동)'))
    if any(p['type'] == 'video' for p in pages):
        print('QR: %s' % ('넣음' if has_qr else '없음 — pip install segno 후 다시 빌드하면 들어감'))
    for w in warn:
        print('⚠ ' + w)
    return 0


if __name__ == '__main__':
    sys.exit(main())
