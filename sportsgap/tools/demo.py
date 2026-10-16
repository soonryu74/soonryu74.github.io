# 예시(DEMO) 데이터 생성기 — 실제 공공데이터를 받기 전 화면 확인용. 모든 값은 가상이며 화면에 DEMO로 표시된다.
import json, random, sys
from shapely import wkt
from shapely.geometry import Point
src, out_map, out_demo = sys.argv[1:4]
g = json.load(open(src))
P = g['proj']
def unproj(x, y):
    return (x / (P['k'] * P['s']) + P['minx'], P['maxy'] - y / P['s'])
# 대략적 규모(만 명, 65세 이상 비율 %) — 예시값
APPROX = {'수원시':(119,14),'고양시':(107,17),'용인시':(108,15),'화성시':(95,11),'성남시':(91,17),'부천시':(77,18),'남양주시':(73,17),'안산시':(63,15),'평택시':(59,15),'안양시':(54,17),'시흥시':(52,13),'파주시':(50,16),'김포시':(48,14),'의정부시':(46,19),'광주시':(39,15),'하남시':(33,14),'광명시':(28,17),'군포시':(26,17),'양주시':(25,17),'오산시':(23,12),'이천시':(22,17),'안성시':(19,20),'구리시':(18,18),'의왕시':(16,17),'포천시':(14,24),'양평군':(12,30),'여주시':(11,25),'동두천시':(9,24),'과천시':(8,16),'가평군':(6,30),'연천군':(4,30)}
TYPES = ['체육관','수영장','생활체육공원','게이트볼장','파크골프장','다목적구장','장애인체육관','걷기길']
rnd = random.Random(20261016)
regions, facilities = [], []
for r in g['regions']:
    name = r['name']; pop, old = APPROX[name]
    pop *= 10000
    age65 = round(pop * old / 100); disabled = round(pop * rnd.uniform(0.038, 0.065))
    poly = wkt.loads(r['_wkt'])
    n = max(3, round(pop / 10000 * rnd.uniform(0.35, 0.9)))
    minx, miny, maxx, maxy = poly.bounds
    for i in range(n):
        while True:
            lon, lat = rnd.uniform(minx, maxx), rnd.uniform(miny, maxy)
            if poly.contains(Point(lon, lat)): break
        t = rnd.choice(TYPES)
        bf = rnd.random() < (0.9 if t == '장애인체육관' else 0.35)
        facilities.append({
            'id': f'{name}-{i+1}', 'name': f'예시 {t} {chr(65 + i % 26)}{i // 26 or ""}', 'region': name, 'type': t,
            'lat': round(lat, 5), 'lng': round(lon, 5),
            'indoor': t in ('체육관','수영장','장애인체육관'),
            'barrierFree': bf,
            'senior': rnd.random() < 0.4, 'disabledProg': bf and rnd.random() < 0.5,
        })
    regions.append({'name': name, 'pop': pop, 'age65': age65, 'disabled': disabled})
json.dump({'w': g['w'], 'h': g['h'], 'proj': P, 'regions': [{k: v for k, v in r.items() if k != '_wkt'} for r in g['regions']]}, open(out_map, 'w'), ensure_ascii=False)
json.dump({'source': 'demo', 'asOf': '예시 데이터', 'regions': regions, 'facilities': facilities}, open(out_demo, 'w'), ensure_ascii=False)
print(len(regions), len(facilities))
