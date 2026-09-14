#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
연구 동향 그래프 데이터 만들기: 주제별로 '연도별 논문 발표 건수'를 Europe PMC에서 세어
newsletter/samples/*.json 의 각 꼭지에 chart 로 저장한다.

- 세는 대상은 제목에 그 주제어가 들어간 논문(Europe PMC, SRC:MED)
- 올해 값은 연중 집계라는 점을 주석으로 남긴다
실행: python3 scripts/build_trend_charts.py
"""
import os, json, glob, time, datetime, socket
import urllib.request, urllib.parse

ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "samples")
YEARS   = 8

# 꼭지 이름 → (검색식, 그래프 제목)
QUERIES = {
    # 감염병 사회 대응
    "사람마다 조심하는 정도가 다르다": ('TITLE:"non-pharmaceutical" OR TITLE:"physical distancing" OR TITLE:"behavioural response"', "거리두기·행동 반응 연구"),
    "백신을 왜 망설이는가":            ('TITLE:"vaccine hesitancy"', "백신 주저(vaccine hesitancy) 연구"),
    "허위정보에 어떻게 대응하나":      ('TITLE:misinformation OR TITLE:infodemic', "허위정보·인포데믹 연구"),
    "방역 조치가 남기는 뜻밖의 흔적":  ('TITLE:"unintended" AND (TITLE:pandemic OR TITLE:"COVID-19")', "방역 조치의 부수 영향 연구"),
    "학교 접종은 동의서에서 갈린다":   ('TITLE:"school" AND TITLE:vaccination', "학교 기반 예방접종 연구"),
    # 감염병 발생동향
    "인플루엔자, 대한민국":            ('TITLE:influenza AND (TITLE:surveillance OR TITLE:season)', "인플루엔자 감시·절기 연구"),
    "에볼라바이러스병, 콩고민주공화국": ('TITLE:ebola', "에볼라 연구"),
    "레지오넬라증, 미국":              ('TITLE:legionella OR TITLE:legionnaires', "레지오넬라 연구"),
    "홍역, 미국":                      ('TITLE:measles', "홍역 연구"),
    # 만성질환
    "국내 정책 — 향후 10년, 만성질환 중점 관리": ('TITLE:"chronic disease" AND TITLE:policy', "만성질환 정책 연구"),
    "국제 동향 — 정책 채택에서 이행으로":        ('TITLE:"noncommunicable" OR TITLE:"non-communicable"', "비감염성질환(NCD) 연구"),
    "비만·대사 — 근감소성 비만의 전 세계 유병률": ('TITLE:"sarcopenic obesity"', "근감소성 비만 연구"),
    "노인·다질환 — 재택 일차의료와 응급실 이용":  ('TITLE:"home-based" AND TITLE:care', "재택의료 연구"),
    "관리체계 — 데이터로 재입원을 예측하다":      ('TITLE:readmission AND TITLE:prediction', "재입원 예측 연구"),
    # 기후·건강
    "기록적 더위와 온열질환 의료이용": ('TITLE:heat AND (TITLE:mortality OR TITLE:"heat-related")', "폭염 건강영향 연구"),
    "폭염·산불이 대기질을 되돌린다":   ('TITLE:"wildfire" AND (TITLE:smoke OR TITLE:"air quality")', "산불 연기·대기질 연구"),
    "기후와 매개체 감염병":            ('TITLE:climate AND (TITLE:dengue OR TITLE:"vector-borne")', "기후–매개체 감염병 연구"),
    "누가 먼저 위험해지는가 — 취약집단 보호": ('TITLE:heat AND (TITLE:"older adults" OR TITLE:vulnerable)', "폭염 취약집단 연구"),
    "국내 논의 — 폭염을 사회적 재난으로": ('TITLE:"heat action plan" OR (TITLE:heat AND TITLE:policy)', "폭염 대응정책 연구"),
}

def force_ipv4():
    if getattr(socket, "_v4", False): return
    orig = socket.getaddrinfo
    socket.getaddrinfo = lambda h, *a, **k: [r for r in orig(h, *a, **k) if r[0] == socket.AF_INET] or orig(h, *a, **k)
    socket._v4 = True

def hits(query, year):
    url = ("https://www.ebi.ac.uk/europepmc/webservices/rest/search?query="
           + urllib.parse.quote(f"({query}) AND (FIRST_PDATE:[{year}-01-01 TO {year}-12-31]) AND SRC:MED")
           + "&format=json&pageSize=1")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "newsletter-trend/1.0"})
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read()).get("hitCount", 0)
    except Exception as ex:
        print("   ! 실패:", str(ex)[:50]); return None

def main():
    force_ipv4()
    this_year = datetime.date.today().year
    years = list(range(this_year - YEARS + 1, this_year + 1))
    for path in sorted(glob.glob(os.path.join(SAMPLES, "*.json"))):
        data = json.load(open(path, encoding="utf-8")); changed = False
        print(os.path.basename(path))
        for t in data["draft"]["topics"]:
            q = QUERIES.get(t["name"])
            if not q: continue
            query, title = q
            vals = []
            for y in years:
                n = hits(query, y)
                if n is None: break
                vals.append({"y": y, "v": n}); time.sleep(0.25)
            if len(vals) != len(years) or sum(v["v"] for v in vals) < 20:
                print(f"   · {t['name'][:20]} — 건수가 적어 그래프 생략"); continue
            t["chart"] = {
                "title": f"연도별 논문 발표 건수 — {title}",
                "unit": "편",
                "source": "Europe PMC 제목 검색 기준",
                "note": f"{this_year}년은 {datetime.date.today().strftime('%m월')}까지 집계",
                "data": vals,
            }
            changed = True
            print(f"   · {t['name'][:20]} — {vals[0]['v']}→{vals[-1]['v']}편")
        if changed:
            json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
