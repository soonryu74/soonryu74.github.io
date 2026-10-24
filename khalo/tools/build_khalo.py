"""K-HALO 데이터 패키지 생성기.
입력: health-dashboard/data 의 공개 통계 가공본(dataset.json·units.json·hle.json·deprivation.json·risk.json)
출력: khalo/data/*.csv, khalo/data/khalo.sqlite
김동현 DB 등 재배포 권리가 없는 자료(risk.json의 'DB(...)' 출처 항목)는 넣지 않는다.
"""
import json, csv, re, sqlite3, os, sys, collections
from korean_romanizer.romanizer import Romanizer

SRC = sys.argv[1] if len(sys.argv) > 1 else 'health-dashboard/data'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'khalo/data'
os.makedirs(OUT, exist_ok=True)
J = lambda f: json.load(open(os.path.join(SRC, f), encoding='utf-8'))
ds, un, hle, dep, risk = J('dataset.json'), J('units.json'), J('hle.json'), J('deprivation.json'), J('risk.json')

PROV = {'서울': ('Seoul', 'Seoul'), '부산': ('Busan', 'Busan'), '대구': ('Daegu', 'Daegu'), '인천': ('Incheon', 'Incheon'),
        '광주': ('Gwangju', 'Gwangju'), '대전': ('Daejeon', 'Daejeon'), '울산': ('Ulsan', 'Ulsan'), '세종': ('Sejong', 'Sejong'),
        '경기': ('Gyeonggi', 'Gyeonggi-do'), '강원': ('Gangwon', 'Gangwon'), '충북': ('Chungbuk', 'Chungcheongbuk-do'),
        '충남': ('Chungnam', 'Chungcheongnam-do'), '전북': ('Jeonbuk', 'Jeonbuk'), '전남': ('Jeonnam', 'Jeollanam-do'),
        '경북': ('Gyeongbuk', 'Gyeongsangbuk-do'), '경남': ('Gyeongnam', 'Gyeongsangnam-do'), '제주': ('Jeju', 'Jeju')}
METRO = {'서울', '부산', '대구', '인천', '광주', '대전', '울산'}
# 로마자 표기에서 자음동화가 반영되지 않는 지명(정부 공식 영문 표기 기준)
FIX = {'종로': 'Jongno', '중랑': 'Jungnang', '동래': 'Dongnae', '상록': 'Sangnok', '강릉': 'Gangneung', '울릉': 'Ulleung'}
def en_name(n):
    m = re.match(r'^(.+?)(시|군|구)$', n)
    base, suf = (m.group(1), m.group(2)) if m and len(n) > 2 else (n, '')
    parts = [FIX.get(p) or Romanizer(p).romanize().capitalize() for p in base.split()]
    return ' '.join(parts) + ({'시': '-si', '군': '-gun', '구': '-gu'}.get(suf, ''))

IND_EN = {
 'DT_H_SM': ('Current smoking rate', 'Adults 19+', 'Smoking'),
 'DT_H_SM_MALE': ('Current smoking rate, men', 'Men 19+', 'Smoking'),
 'DT_TOBACCO_PRODUCT': ('Current tobacco product use rate (incl. e-cigarettes)', 'Adults 19+', 'Smoking'),
 'DT_SM_TRY_V2': ('Quit attempt rate among current tobacco users', 'Current tobacco users 19+', 'Smoking'),
 'DT_117075_SM_IND_WORK_V2': ('Second-hand smoke exposure at indoor workplace (non-users)', 'Non-users 19+', 'Smoking'),
 'DT_H_DR_MONTH': ('Monthly drinking rate', 'Adults 19+', 'Alcohol'),
 'DT_117075_H_DR_HIGH_WH': ('High-risk drinking rate', 'Adults 19+', 'Alcohol'),
 'DT_H_DR_HIGH': ('High-risk drinking rate among annual drinkers', 'Annual drinkers 19+', 'Alcohol'),
 'DT_117075_H_DR_DRIV': ('Drink-driving experience in past year (drivers)', 'Drivers 19+', 'Alcohol'),
 'DT_H_EX_WALK': ('Walking practice rate', 'Adults 19+', 'Physical activity'),
 'DT_H_EX_PHY': ('Moderate-or-vigorous physical activity rate', 'Adults 19+', 'Physical activity'),
 'DT_117075_H_HEALTHY': ('Healthy lifestyle practice rate (no smoking, moderate drinking, walking)', 'Adults 19+', 'Physical activity'),
 'DT_H_OBE_OBE': ('Obesity prevalence (self-reported BMI>=25)', 'Adults 19+', 'Diet & obesity'),
 'DT_H_OBE_CONTROL': ('Weight control attempt rate', 'Adults 19+', 'Diet & obesity'),
 'DT_117075_DIE_BF02': ('Breakfast practice rate', 'Adults 19+', 'Diet & obesity'),
 'DT_11775_NUT_LABEL_UTIL': ('Nutrition label use rate', 'Adults 19+', 'Diet & obesity'),
 'DT_H_MENTAL_STRESS': ('Perceived stress rate', 'Adults 19+', 'Mental health'),
 'DT_H_MENTAL_DEPRESS': ('Depressive mood experience in past year', 'Adults 19+', 'Mental health'),
 'DT_117075_H_MENTAL_DEPRESS_SYM': ('Depressive symptom prevalence (PHQ-9>=10)', 'Adults 19+', 'Mental health'),
 'DT_H_OR_BRUSH': ('Tooth brushing after lunch', 'Adults 19+', 'Oral health'),
 'DT_H_OR_INCONV': ('Chewing difficulty, older adults', 'Adults 65+', 'Oral health'),
 'DT_HYPER_DOCTOR': ('Physician-diagnosed hypertension prevalence', 'Adults 30+', 'Chronic disease'),
 'DT_HYPER_DOCTOR_DRUG': ('Hypertension treatment rate among diagnosed', 'Diagnosed adults 30+', 'Chronic disease'),
 'DT_DIA_DOCTOR': ('Physician-diagnosed diabetes prevalence', 'Adults 30+', 'Chronic disease'),
 'DT_DIA_TREAT': ('Diabetes treatment rate among diagnosed', 'Diagnosed adults 30+', 'Chronic disease'),
 'DT_DIA_EYE': ('Diabetic eye examination rate', 'Diagnosed adults 30+', 'Chronic disease'),
 'DT_DIA_KIDNEY': ('Diabetic kidney (microalbuminuria) test rate', 'Diagnosed adults 30+', 'Chronic disease'),
 'DT_117075_HYPER_AWAR': ('Awareness of own blood pressure value', 'Adults 19+', 'Chronic disease'),
 'DT_117075_DIA_AWAR': ('Awareness of own blood glucose value', 'Adults 19+', 'Chronic disease'),
 'DT_117075_STR_EARLY_SYM': ('Stroke early-symptom awareness', 'Adults 19+', 'Chronic disease'),
 'DT_117075_MYO_EARLY_SYM': ('Myocardial infarction early-symptom awareness', 'Adults 19+', 'Chronic disease'),
 'DT_INFLUENZA': ('Influenza vaccination rate in past year', 'Adults 19+', 'Prevention & safety'),
 'DT_CPR_EDU': ('CPR training experience', 'Adults 19+', 'Prevention & safety'),
 'DT_CPR_AWAR': ('CPR awareness', 'Adults 19+', 'Prevention & safety'),
 'DT_H_BELT': ('Driver seat-belt use', 'Drivers 19+', 'Prevention & safety'),
 'DT_117075_H_BELT_BACK': ('Rear-seat belt use', 'Adults 19+', 'Prevention & safety'),
 'DT_H_HAND_WASH': ('Hand washing after going out', 'Adults 19+', 'Prevention & safety'),
 'DT_H_SOAP_USE': ('Soap or hand sanitiser use', 'Adults 19+', 'Prevention & safety'),
 'DT_117075_NECE_NTR02': ('Unmet medical need (hospital/clinic) in past year', 'Adults 19+', 'Health care use'),
 'DT_NECE_CLINIC': ('Public health centre use in past year', 'Adults 19+', 'Health care use'),
 'DT_HEALTH_RECOG': ('Good self-rated health ("very good" or "good")', 'Adults 19+', 'Health care use'),
}
assert set(IND_EN) == {i['id'] for i in ds['indicators']}
regs = ds['regions']; ridx = {r['c']: j for j, r in enumerate(regs)}
SIDO = {r['s']: r['n'] for r in regs if r['l'] == 'sido'}
U = {u['c']: u for u in un['units']}
kostat = collections.defaultdict(list)
for k, v in ds['geo']['map'].items():
    for c in v: kostat[c].append(k)

# ── units.csv
units = []
for u in un['units']:
    c = u['c']; prov_ko = u['s']; pen = PROV[prov_ko]
    n = u['n'] if u['l'] != 'sub' else f"{u['parent']} {u['n']}"
    leaf = u['n']
    typ = 'gu' if leaf.endswith('구') else 'gun' if leaf.endswith('군') else 'si' if leaf.endswith('시') else 'health-centre area'
    area = 'metropolitan' if prov_ko in METRO else ('rural' if typ == 'gun' else 'urban' if typ in ('gu', 'si') else 'mixed')
    parent = u['p'] if u['l'] == 'sub' else ''
    units.append({'unit_id': c, 'name_ko': n, 'name_en': ' '.join(en_name(t) for t in n.split()), 'province_ko': SIDO[prov_ko],
                  'province_en': pen[1], 'level': 'district' if u['l'] == 'sgg' else 'sub-district', 'parent_unit_id': parent,
                  'admin_type': typ, 'area_type': area, 'kostat_sgg_code_2018': ';'.join(sorted(kostat.get(c, []))),
                  'first_year': u['first'], 'last_year': u['last'], 'status': u['status'],
                  'has_subunits': int(bool(u['has_subs'])),
                  'benchmark_unit': int((not u['has_subs']) and u['status'] in ('active',))})
W = lambda name, rows, cols: (lambda f: (csv.DictWriter(f, cols, lineterminator='\n').writeheader(), csv.DictWriter(f, cols, lineterminator='\n').writerows(rows)))(open(os.path.join(OUT, name), 'w', newline='', encoding='utf-8'))
W('units.csv', units, list(units[0]))

# ── indicators.csv
inds = []
for i in ds['indicators']:
    en, pop, dom = IND_EN[i['id']]
    inds.append({'indicator_id': i['id'], 'name_en': en, 'name_ko': i['name'], 'domain_en': dom, 'domain_ko': i['domain'], 'population': pop,
                 'unit': 'percent', 'higher_is_worse': {True: 1, False: 0, None: ''}[i['bad']],
                 'first_year': i['years'][0], 'last_year': i['years'][-1], 'n_years': len(i['years']),
                 'source_table_ko': i['src'], 'source': 'KDCA Community Health Survey via KOSIS (kosis.kr)'})
W('indicators.csv', inds, list(inds[0]))

# ── chs_panel_long.csv / wide
long, wide = [], collections.defaultdict(dict)
for i in ds['indicators']:
    yrs = i['years']
    for key in ('crude', 'std'):
        arr = ds['values'][i['id']][key]
        ylist = yrs if len(arr) == len(yrs) else ds['years']
        for yi, row in enumerate(arr):
            y = int(ylist[yi]) if not isinstance(ylist[yi], int) else ylist[yi]
            if y not in [int(v) for v in yrs]: continue
            for c, j in ridx.items():
                if regs[j]['l'] == 'sido' or c not in U: continue
                v = row[j]
                if v is None: continue
                wide[(c, y, i['id'])][key] = v / 10
for (c, y, iid), v in sorted(wide.items()):
    long.append({'unit_id': c, 'year': y, 'indicator_id': iid, 'crude_rate': v.get('crude', ''), 'age_std_rate': v.get('std', '')})
W('chs_panel_long.csv', long, ['unit_id', 'year', 'indicator_id', 'crude_rate', 'age_std_rate'])
wrows = collections.defaultdict(dict)
for r in long:
    if r['age_std_rate'] != '': wrows[(r['unit_id'], r['year'])][r['indicator_id']] = r['age_std_rate']
ids = [i['id'] for i in ds['indicators']]
W('chs_panel_wide_std.csv', [{'unit_id': c, 'year': y, **{k: v.get(k, '') for k in ids}} for (c, y), v in sorted(wrows.items())], ['unit_id', 'year'] + ids)

# ── hle.csv (연구용 추정치)
hl = []
for c, r in hle['regions'].items():
    if c not in U: continue
    for y, v in sorted(r['y'].items()):
        hl.append({'unit_id': c, 'year': int(y), 'life_expectancy': v.get('le', ''), 'healthy_life_expectancy': v.get('hle', ''),
                   'unhealthy_years': round(v['le'] - v['hle'], 2) if v.get('le') and v.get('hle') else '',
                   'good_self_rated_health_3yr': v.get('good', ''), 'unhealthy_odds_ratio': v.get('or', ''), 'deaths_3yr': v.get('d3', '')})
W('hle.csv', hl, list(hl[0]))

# ── deprivation.csv
dp = []
for y in dep['years']:
    pass
for c, r in dep['regions'].items():
    if c not in U: continue
    dp.append({'unit_id': c, 'year': dep['year'], 'deprivation_index': r['idx'], 'deprivation_quintile': r['q'], 'rank': r['rank'],
               **{f'pct_{k}': r['v'][k] for k in r['v']}, **{f'z_{k}': r['z'][k] for k in r['z']}})
W('deprivation.csv', dp, list(dp[0]))

# ── population_age.csv (주민등록 연앙인구 2024, 통계청)
pa = []
for c, r in risk['regions'].items():
    if c not in U or not r.get('pop'): continue
    g = {k: r[k]['v'] for k in ('age65', 'age75', 'age85') if r.get(k)}
    pa.append({'unit_id': c, 'year': 2024, 'population': r['pop'], 'age65_plus': g.get('age65', ''), 'age75_plus': g.get('age75', ''),
               'age85_plus': g.get('age85', ''), 'pct_age65_plus': round(g['age65'] / r['pop'] * 100, 2) if g.get('age65') else ''})
W('population_age.csv', pa, list(pa[0]))

# ── SQLite
db = os.path.join(OUT, 'khalo.sqlite')
if os.path.exists(db): os.remove(db)
con = sqlite3.connect(db)
for name in ('units', 'indicators', 'chs_panel_long', 'chs_panel_wide_std', 'hle', 'deprivation', 'population_age'):
    rows = list(csv.DictReader(open(os.path.join(OUT, name + '.csv'), encoding='utf-8')))
    cols = list(rows[0])
    con.execute(f'CREATE TABLE {name} ({", ".join(chr(34)+c+chr(34) for c in cols)})')
    con.executemany(f'INSERT INTO {name} VALUES ({",".join("?"*len(cols))})', [[(None if r[c] == '' else r[c]) for c in cols] for r in rows])
con.commit(); con.close()
print({'units': len(units), 'benchmark_units': sum(u['benchmark_unit'] for u in units), 'indicators': len(inds), 'long_rows': len(long),
       'wide_rows': len(wrows), 'hle_rows': len(hl), 'deprivation_rows': len(dp), 'population_rows': len(pa)})
