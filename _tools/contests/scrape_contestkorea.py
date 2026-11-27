#!/usr/bin/env python3
"""콘테스트코리아 대회·공모전 목록 → notion_raw.json과 같은 형식의 rows

사용: python3 scrape_contestkorea.py ck_raw.json [--merge notion_raw.json]
- 분야별 목록을 넘기며 접수 중인 공모전만 골라 상세 페이지에서 상금·기간·지역·AI 요약을 읽습니다.
- --merge 를 주면 노션 수집 결과의 rows 뒤에 이어 붙여 하나로 씁니다(중복은 classify.py가 정리).
- 20건 미만이면 실패로 끝나 기존 데이터를 지킵니다.
"""
import json, re, sys, html, time, datetime as dt, urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = 'https://www.contestkorea.com/sub/'
CATS = {  # 공모전(int_gbn=1) 분야 코드
    '031210001': '사진·영상·영화제', '030610001': '미술·디자인·웹툰', '031410001': '아이디어·건축·창업',
    '030310001': '학문·과학·IT', '030210001': '네이밍·슬로건', '030110001': '문학·문예',
    '030910001': '음악·콩쿠르·댄스', '031810001': '다양한 분야',
}
MAX_PAGES = 8
KST = dt.timezone(dt.timedelta(hours=9))

def get(url, tries=3):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            return urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')
        except Exception:
            if k == tries - 1: raise
            time.sleep(2 * (k + 1))

def text(s): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()

def list_page(code, page):
    s = get(f'{BASE}list.php?int_gbn=1&Txt_bcode={code}&page={page}')
    s = s[s.find('class="list_style_2"'):]
    out = []
    for li in s.split('<div class="title">')[1:]:
        m = re.search(r'str_no=(\d+)', li)
        if not m: continue
        day = text(''.join(re.findall(r'<div class="d-day[^"]*">(.*?)</div>', li, re.S)))
        closed = not re.search(r'D-\d|오늘|마감임박|접수중|접수예정', day)
        out.append((m[1], closed))
    return out

def field(s, label):
    m = re.search(r'<th[^>]*>\s*' + re.escape(label) + r'\s*</th>\s*<td[^>]*>(.*?)</td>', s, re.S)
    return text(m[1]) if m else ''

def kdate(s):
    m = re.search(r'(\d{4})\.(\d{1,2})\.(\d{1,2})', s or '')
    return f'{int(m[1])}년 {int(m[2])}월 {int(m[3])}일' if m else ''

def detail(code, no):
    url = f'{BASE}view.php?int_gbn=1&Txt_bcode={code}&str_no={no}'
    raw = get(url)
    s = re.sub(r'<script.*?</script>|<style.*?</style>', '', raw, flags=re.S)
    t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' | ', s[s.find('<body'):])))
    m = re.search(r'<meta property="og:title" content="([^"]*)"', raw)
    name = html.unescape(m[1]).strip() if m else ''
    period = field(s, '접수기간')
    reg = re.search(r'\|\s*(\d{4}-\d{2}-\d{2})\s*\|', t)
    summ = re.search(r'AI 3줄 요약\s*\|\s*\|\s*(.*?)\s*\|\s*\|\s*\|?\s*AI 과거', t)
    summary = re.sub(r'\s*\|\s*', ' ', summ[1]) if summ else ''
    target, area = field(s, '참가대상'), field(s, '대회지역').replace(' ', '')
    if re.search(r'누구나|일반인', target): target = '누구나(일반인 포함)'
    extra = f' 참가대상: {target}.' if target else ''
    if area and area not in ('전국', '온라인', '해외'): extra += f' 대회지역: {area}.'
    ends = re.findall(r'\d{4}\.\d{1,2}\.\d{1,2}', period)
    return {
        'id': f'ck-{no}', '공모전명': name, '등록일': kdate((reg[1] if reg else '').replace('-', '.')),
        '링크__href': url, '링크': url, '마감일': kdate(ends[-1]) if ends else '', '시작일': kdate(ends[0]) if ends else '',
        '분야': CATS.get(code, ''), '상금': field(s, '시상내역'), '주최': field(s, '주최 . 주관'),
        '출처': '콘테스트코리아', '요약': (summary + extra).strip(), '지역': area,
    }

def main():
    a = sys.argv[1:]
    out = a[0]
    todo, seen = [], set()
    for code in CATS:
        for page in range(1, MAX_PAGES + 1):
            try: rows = list_page(code, page)
            except Exception as e:
                print(f'목록 실패 {code} p{page}: {e}', file=sys.stderr); break
            fresh = [r for r in rows if r[0] not in seen]
            if not fresh: break
            for no, closed in fresh:
                seen.add(no)
                if not closed: todo.append((code, no))
    with ThreadPoolExecutor(6) as ex:
        res = list(ex.map(lambda x: _safe(detail, *x), todo))
    rows = [r for r in res if r and r['공모전명']]
    if len(rows) < 20:
        sys.exit(f'수집 {len(rows)}건 — 20건 미만이라 중단(기존 데이터 유지)')
    data = {'scrapedAt': dt.datetime.now(KST).isoformat(timespec='minutes'), 'source': '콘테스트코리아', 'rows': rows}
    if '--merge' in a:
        try:
            nr = json.load(open(a[a.index('--merge') + 1], encoding='utf-8'))
            data['rows'] = nr.get('rows', []) + rows
            data['source'] = '노션 공개 DB + 콘테스트코리아'
        except (OSError, ValueError, IndexError) as e:
            print(f'노션 합치기 건너뜀: {e}', file=sys.stderr)
    json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'콘테스트코리아 {len(rows)}건(접수 중) · 합계 {len(data["rows"])}행 → {out}')

def _safe(f, *x):
    try: return f(*x)
    except Exception as e:
        print(f'상세 실패 {x}: {e}', file=sys.stderr); return None

if __name__ == '__main__':
    main()
