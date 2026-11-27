# 실제 공공데이터 → app/src/data/dataset.json
# 입력: 문체부 전국 공공체육시설 현황(2024.12.31. 기준, 경기 추출·좌표 변환본), 대한장애인체육회 장애인 전용 체육시설,
#       대한장애인체육회 장애인스포츠강좌이용권 가맹점(2023), 시군별 인구·65세 이상(주민등록 2024)·등록장애인(2018)
import json, re, csv, sys, collections
fac_geo, dis_only_geo, voucher_csv, risk_json, ds_json, map_json, out = sys.argv[1:8]
MAP = json.load(open(map_json)); NAMES = [r['name'] for r in MAP['regions']]
TYPE = {'9.1 구기체육관': '체육관', '9.2 투기체육관': '체육관', '9.3 생활체육관': '체육관', '11. 수영장': '수영장',
        '10. 게이트볼장': '게이트볼장', '22. 파크골프장': '파크골프장', '2.축구장': '구기장(축구·야구 등)', '4.야구장': '구기장(축구·야구 등)',
        '3.하키장': '구기장(축구·야구 등)', '1.육상경기장': '육상경기장', '6.테니스장': '테니스장', '기타 체육시설(풋살장)': '풋살장',
        '기타 체육시설(그외)': '생활체육시설(기타)', '14. 국궁장': '궁도·사격장', '15. 양궁장': '궁도·사격장', '13. 사격장': '궁도·사격장',
        '20. 빙상장': '빙상장', '7.씨름장': '생활체육시설(기타)', '17. 골프연습장': '생활체육시설(기타)'}
INDOOR = {'체육관', '수영장', '빙상장'}
SENIOR = {'게이트볼장', '파크골프장'}
def region_of(sgg, addr):
    if sgg in NAMES: return sgg
    for n in NAMES:
        if n in (addr or ''): return n
    return None
def key(s): return re.sub(r'[\s()（）·.\-_]|주식회사|\(재\)|\(사\)|재단법인', '', s or '')
# 장애인스포츠강좌이용권 공공 가맹점(경기) — 같은 시군에서 시설명이 겹치면 '장애인 강좌'로 표시
vouch = [r for r in csv.DictReader(open(voucher_csv, encoding='utf-8')) if r['시도'].strip() == '경기' and r['시설구분'] == '공공']
vkeys = collections.defaultdict(list)
for r in vouch: vkeys[r['시군구'].strip()].append((key(r['시설명']) + key(r['세부주소']), r))
def vmatch(region, name):
    k = key(name)
    if len(k) < 3: return False
    return any(k in vk or (len(vk) >= 4 and vk[:6] in k) for vk, _ in vkeys.get(region, []))
facs, skipped = [], collections.Counter()
for i, o in enumerate(json.load(open(fac_geo))):
    g = o.get('geo')
    reg = region_of(o['sgg'], o['addr'])
    if not g or not reg: skipped['no_geo' if not g else 'no_region'] += 1; continue
    t = TYPE.get(o['sheet'], '생활체육시설(기타)')
    name = re.sub(r'\s+', ' ', o['name'])
    facs.append({'id': f'f{i}', 'name': name, 'region': reg, 'type': t, 'lat': round(g['lat'], 5), 'lng': round(g['lng'], 5),
                 'indoor': t in INDOOR, 'barrierFree': False, 'senior': t in SENIOR, 'disabledProg': (t in INDOOR or t == '생활체육시설(기타)') and vmatch(reg, name),
                 'address': re.sub(r'\s+', ' ', o['addr']) or None, 'geoLevel': g['level']})
for j, o in enumerate(json.load(open(dis_only_geo))):
    g = o.get('geo'); reg = region_of(o['sgg'], o.get('addr', ''))
    if not g or not reg: skipped['dis_no_geo'] += 1; continue
    k = key(re.sub(r'\(.*?\)', '', o['name']))
    same = [f for f in facs if f['region'] == reg and len(k) >= 4 and (k in key(f['name']) or key(f['name']) in k)]
    if same:  # 이미 공공체육시설 목록에 있으면 그 시설을 장애인 체육시설로 표시
        for f in same: f.update(barrierFree=True, disabledProg=True)
        skipped['dis_merged'] += 1; continue
    facs.append({'id': f'd{j}', 'name': o['name'], 'region': reg, 'type': '장애인 체육시설', 'lat': round(g['lat'], 5), 'lng': round(g['lng'], 5),
                 'indoor': True, 'barrierFree': True, 'senior': False, 'disabledProg': True,
                 'address': o.get('addr') or None, 'geoLevel': g['level']})
risk = json.load(open(risk_json))['regions']; ds = json.load(open(ds_json))
code = {r['n']: r['c'] for r in ds['regions'] if r['s'] == '경기' and r['l'] == 'sgg'}
regions = []
for n in NAMES:
    r = risk[code[n]]
    regions.append({'name': n, 'pop': r['pop'], 'age65': r['age65']['v'], 'disabled': r['disab']['v']})
json.dump({'source': 'public', 'asOf': '공공체육시설 2024.12.31. 기준 · 인구 2024 · 등록장애인 2018', 'regions': regions, 'facilities': facs,
           'sources': [
               {'name': '전국 공공체육시설 현황(2024.12.31. 기준) — 경기 2,411곳', 'org': '문화체육관광부', 'url': 'https://www.data.go.kr/data/3075606/fileData.do'},
               {'name': '장애인 전용 체육시설', 'org': '대한장애인체육회', 'url': 'https://www.data.go.kr/data/15071029/fileData.do'},
               {'name': '장애인스포츠강좌이용권 가맹점 현황(2023)', 'org': '대한장애인체육회', 'url': 'https://www.data.go.kr/data/15110791/fileData.do'},
               {'name': '시군별 주민등록 인구·65세 이상(2024 연앙)', 'org': '행정안전부·통계청(KOSIS)', 'url': 'https://kosis.kr'},
               {'name': '시군별 등록장애인(2018)', 'org': '보건복지부', 'url': 'https://kosis.kr'},
               {'name': '좌표: 도로명 주소 검색(OpenStreetMap·Photon), 지번 주소는 읍면동 중심점(행정동 경계 2025.4.)', 'org': 'OpenStreetMap · vuski/admdongkor', 'url': 'https://github.com/vuski/admdongkor'}]},
          open(out, 'w'), ensure_ascii=False)
c = collections.Counter(f['type'] for f in facs)
print(len(facs), dict(skipped), c.most_common(), sum(f['disabledProg'] for f in facs), sum(f['barrierFree'] for f in facs),
      collections.Counter(f['geoLevel'] for f in facs))
