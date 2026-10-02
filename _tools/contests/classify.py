#!/usr/bin/env python3
"""노션 수집 결과(notion_raw.json) → 대시보드 피드(feed.json)

사용: python3 classify.py notion_raw.json feed.json [--prev 이전_feed.json]
--prev 를 주면 이전에 본 공모전의 firstSeen(처음 본 날)을 이어받아 '신규'를 가립니다.
판정은 제목·요약의 낱말로만 하는 1차 분류입니다. '확인 필요'는 사람이 요강을 봐야 합니다.
"""
import json, re, sys, datetime as dt

KST = dt.timezone(dt.timedelta(hours=9))
TODAY = dt.datetime.now(KST).date()

def parse_date(s):
    m = re.search(r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일', s or '')
    if not m: return None
    try: return dt.date(int(m[1]), int(m[2]), int(m[3]))
    except ValueError: return None

def prize_max(s):
    """상금 표기에서 가장 큰 금액(만원). '총상금'과 개별 상금을 구분하지 않으므로 '최대 표기'로만 씁니다."""
    best = 0.0
    for num, unit in re.findall(r'(\d[\d,\.]*)\s*(억|천만|백만|만|원)', s or ''):
        try: v = float(num.replace(',', ''))
        except ValueError: continue
        v = {'억': v * 10000, '천만': v * 1000, '백만': v * 100, '만': v}.get(unit, v / 10000 if v >= 10000 else 0)
        best = max(best, v)
    return int(round(best))

RE_YOUTH = re.compile(r'청소년|초등|중학생|고등학생|고교생|고교|중고생|초중고|대학생|대학원생|재학생|어린이|유아|교육대학|초등교원|학생\s*(대상|부문|만)')
RE_OPEN  = re.compile(r'일반인?|누구나|전\s?국민|국민\s*누구|성인|일반부|제한\s*없')
RE_SPLIT = re.compile(r'부문|분야별|및\s*일반|일반\s*및')
RE_YADULT = re.compile(r'청년(?!\s*(사장|창업가|농부)님?을\s*소개)')
RE_STAFF = re.compile(r'공무원|임직원|소속\s*직원|교직원|조합원\s*대상|회원\s*대상|재직자\s*대상')
RE_LOCAL = re.compile(r'(도민|시민|군민|구민|주민)(?!\s*누구)|거주자|소재\s*(기업|대학|학교)|관내')
RE_SEOUL = re.compile(r'서울|중구')
RE_SHOOT = re.compile(r'직접\s*촬영|방문하여|방문해|현장\s*(촬영|방문)|드론|AI\s*(활용\s*)?(금지|불가)|AI\s*생성\s*이미지\s*제외|사진\s*부문')
RE_AI    = re.compile(r'AI|생성형|인공지능', re.I)
RE_SHORT = re.compile(r'숏폼|쇼츠|숏츠|릴스|shorts', re.I)

def classify(r):
    name = re.sub(r'\s*(신규|NEW|new)$', '', r.get('공모전명', '').strip())
    summ = re.sub(r'\s*STATUS\s*:\s*\w+', '', r.get('요약', '')).strip()
    host = r.get('주최', '').strip()
    text = f'{name} {summ}'
    due = parse_date(r.get('마감일'))
    pm = prize_max(r.get('상금'))
    reasons, tags = [], []
    status = 'eligible'
    if RE_STAFF.search(text):
        status = 'excluded'; reasons.append('소속자 한정(' + RE_STAFF.search(text)[0] + ')')
    elif RE_YOUTH.search(text):
        if RE_OPEN.search(text) or RE_SPLIT.search(text):
            status = 'check'; reasons.append('학생·청소년 부문이 섞여 있음 — 일반 부문 확인')
        else:
            status = 'excluded'; reasons.append('학생·청소년 한정(' + RE_YOUTH.search(text)[0] + ')')
    if status == 'eligible' and RE_YADULT.search(name) and not RE_OPEN.search(text):
        status = 'check'; reasons.append('청년 한정일 수 있음 — 나이 조건 확인')
    if status != 'excluded':
        m = RE_LOCAL.search(text)
        if m and not RE_SEOUL.search(text + ' ' + host):
            status = 'check'; reasons.append(f'거주·소재 조건 확인({m[0]})')
    if due is None:
        if status == 'eligible': status = 'check'
        reasons.append('마감일 표기 없음')
    if RE_SHOOT.search(text): tags.append('직접 촬영')
    if RE_AI.search(text): tags.append('AI 명시')
    if RE_SHORT.search(text): tags.append('숏폼')
    if pm >= 500: tags.append('큰 상금')
    link = r.get('링크__href') or r.get('링크', '')
    if link and not link.startswith('http'): link = 'https://' + link.replace('…', '')
    return dict(
        id=r['id'], name=name, host='' if host == '없음' else host,
        field=r.get('분야', ''), reg=str(parse_date(r.get('등록일')) or ''),
        due=str(due) if due else '', prize=r.get('상금', ''), prizeMax=pm,
        link=link, src=r.get('출처', ''), summary=summ[:200],
        status=status, reasons=reasons, tags=tags,
    )

def main():
    a = sys.argv[1:]
    src, out = a[0], a[1]
    prev = {}
    if '--prev' in a:
        try:
            pd = json.load(open(a[a.index('--prev') + 1], encoding='utf-8'))
            pd = pd.get('data', pd)  # ArtifactData 저장 형식이면 data 안에 있음
            prev = {i['id']: i for i in pd.get('items', [])}
        except (OSError, ValueError, IndexError):
            prev = {}
    raw = json.load(open(src, encoding='utf-8'))
    items, seen, keys = [], set(), {}
    def norm(n): return re.sub(r'[\s\W_]+', '', re.sub(r'\s*(신규|NEW)$', '', n))
    for r in raw['rows']:
        if not r.get('공모전명') or r['id'] in seen: continue
        seen.add(r['id'])
        c = classify(r)
        k1 = (r.get('중복체크ID') or '').strip()
        k2 = norm(c['name']) + '|' + c['due']
        hit = keys.get(k1) if k1 else None
        hit = hit if hit is not None else keys.get(k2)
        if hit is not None:                                  # 같은 공모전: 정보가 더 많은 쪽을 남김
            old = items[hit]
            if (len(c['summary']), c['prizeMax']) > (len(old['summary']), old['prizeMax']):
                c['firstSeen'] = old.get('firstSeen'); items[hit] = c
            continue
        if k1: keys[k1] = len(items)
        keys[k2] = len(items)
        if c['due'] and c['due'] < str(TODAY): continue          # 지난 공모전은 싣지 않음
        # 처음 본 날: 이전 피드에 있으면 그 날짜, 없으면 노션 등록일(없으면 오늘)
        c['firstSeen'] = prev.get(c['id'], {}).get('firstSeen') or min(c['reg'] or str(TODAY), str(TODAY))
        items.append(c)
    for c in items:
        d = dt.date.fromisoformat(c['due']) if c['due'] else None
        c['pick'] = c['status'] == 'eligible' and c['prizeMax'] >= 250 and d is not None and (d - TODAY).days >= 3
    items.sort(key=lambda x: (x['due'] or '9999', -x['prizeMax']))
    new_since = str(TODAY - dt.timedelta(days=2))             # 최근 3일 안에 들어온 것 = 신규
    new = [i for i in items if i['firstSeen'] >= new_since]
    counts = {k: sum(1 for i in items if i['status'] == k) for k in ('eligible', 'check', 'excluded')}
    counts.update(total=len(items), new=len(new), picks=sum(1 for i in items if i['pick']))
    feed = dict(updatedAt=dt.datetime.now(KST).isoformat(timespec='minutes'), today=str(TODAY), newSince=new_since,
                source=raw.get('source', ''), scrapedRows=len(raw['rows']), counts=counts, items=items)
    blob = json.dumps(feed, ensure_ascii=False)
    if len(blob.encode()) > 240_000:                          # 문서 한도(256KiB) 보호
        for i in items:
            if i['status'] == 'excluded': i['summary'] = ''
        blob = json.dumps(feed, ensure_ascii=False)
    open(out, 'w', encoding='utf-8').write(blob)
    print(f"피드 {len(items)}건 (가능 {counts['eligible']} · 확인 {counts['check']} · 제외 {counts['excluded']} · 추천 {counts['picks']} · 신규 {counts['new']}) → {out} ({len(blob.encode())//1024}KB)")
    for i in new:
        print(f"  [신규] {i['due']} | {i['prizeMax']}만 | {i['status']} | {i['name']}")

if __name__ == '__main__':
    main()
