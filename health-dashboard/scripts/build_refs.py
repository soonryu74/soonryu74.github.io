# -*- coding: utf-8 -*-
"""참고문헌 목록 → data/refs.json

대시보드와 사용설명서가 **같은 번호**로 출처를 단다(논문의 참고문헌처럼).
  · refs      : 번호 붙은 참고문헌 목록(번호는 이 파일의 REFS 순서로 고정 — 순서를 바꾸면 번호가 바뀐다)
  · by_ind    : 지표 id → 참고문헌 key + 그 지표의 원래 통계표(표 이름·표 ID·원문 링크)
실행: python scripts/build_refs.py   (build_coverage.py 다음, build_dashboard.py 전에)
"""
import csv, json, re, time
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "data"
J = lambda p: json.loads((D / p).read_text(encoding="utf-8"))
REPO_DOC = "https://github.com/soonryu74/soonryu74.github.io/blob/main/health-dashboard/docs/"
doc = lambda name: REPO_DOC + quote(name)
KOSIS = "https://kosis.kr/statHtml/statHtml.do?orgId={org}&tblId={tbl}"

COV = {s["key"]: s for s in J("coverage.json")["sources"]}
upd = lambda k: COV.get(k, {}).get("updated", "")

# ── 번호 순서 = 이 목록 순서 (새 항목은 맨 뒤에 추가해 기존 번호를 지킨다) ──
REFS = [
    {"key": "chs", "org": "질병관리청", "title": "지역사회건강조사 시·군·구별 통계(KOSIS 공유서비스)",
     "detail": "KOSIS 기관코드 177 · 41개 통계표 · 2008~2025 · 조율·표준화율·표준오차", "url": "https://chs.kdca.go.kr/chs/stats/statsMain.do", "updated": upd("chs")},
    {"key": "chs25", "org": "질병관리청", "title": "2025 지역건강통계 한눈에 보기(2025년 지역사회건강조사 통계집)",
     "detail": "3. 부록(통계표) 시군구별 — 조사 단위 258곳의 기준. 2026-02-25 공개", "url": "https://www.korea.kr/briefing/pressReleaseView.do?newsId=156745804", "updated": "2026-02-25"},
    {"key": "mort", "org": "국가데이터처(옛 통계청)", "title": "사망원인통계 — 시군구별 연령표준화 사망률",
     "detail": f"KOSIS 101 DT_1B34E13 · 표준화사망률 22종 · 2008~{COV['mort']['years'][1]} (2024년까지 김동현 교수 DB [9] 경유, 이후 KOSIS 직접 · 영아사망률은 2024년까지)", "url": COV["mort"]["url"], "updated": upd("mort")},
    {"key": "inf", "org": "질병관리청", "title": "법정감염병 발생보고 · 결핵환자 신고현황",
     "detail": "감염병 발생률 12종 · 2008~2024", "url": COV["inf"]["url"], "updated": upd("inf")},
    {"key": "cancer", "org": "국민건강보험공단", "title": "건강검진통계 — 시군구별 성별 암검진 대상 및 수검인원 현황",
     "detail": "KOSIS 350 DT_35007_N009 · 암검진 수검률 7종 · 2015~2024", "url": COV["cancer"]["url"], "updated": upd("cancer")},
    {"key": "nhis", "org": "국민건강보험공단", "title": "건강보험통계 · 건강검진통계 · 지역별의료이용통계",
     "detail": "KOSIS 350 DT_35007_N001_1·N098·N103·N105 등 · 의료이용·검진·의료자원 33종 · 2008~2024", "url": COV["nhis"]["url"], "updated": upd("nhis")},
    {"key": "pop", "org": "국가데이터처 · 행정안전부 · 보건복지부 · 문화체육관광부 등", "title": "인구·사회·경제·복지시설 통계",
     "detail": "인구총조사·경제활동인구조사·주민등록인구현황·지방재정·노인복지시설현황·문화기반시설 총람 등 24종", "url": "https://kosis.kr/", "updated": upd("pop")},
    {"key": "env", "org": "환경부 · 국토교통부 · 도로교통공단 등", "title": "환경·안전 통계",
     "detail": "상·하수도통계·도로현황·대기오염도·교통문화지수·경찰접수교통사고현황 등 28종", "url": "https://kosis.kr/", "updated": upd("env")},
    {"key": "kdh", "org": "질병관리청 · 한림대 김동현 교수", "title": "지역사회 건강결과 및 건강결정요인 데이터베이스 v1.7",
     "detail": "사망·감염병·의료이용·자원·인구·환경 115종을 이 DB를 거쳐 수집(원 출처는 각 기관 통계 [3]~[8])", "url": "https://chs.kdca.go.kr/chs/recsRoom/dataBaseMain.do", "updated": ""},
    {"key": "hle", "org": "자체 산출(근사)", "title": "시군구 건강수명 산출법 v1 — Sullivan 방식, 주관적 건강 기반",
     "detail": "사망원인통계 [3]·연앙인구·지역사회건강조사 [1] 주관적 건강인지율로 산출. 공식 통계 아님", "url": doc("건강수명_산출법_v1.md"), "updated": upd("hle")},
    {"key": "dep", "org": "자체 산출(근사)", "title": "지역박탈지수 산출 v2 — 김동진 외(2013) 방식 재현",
     "detail": "인구주택총조사 2015·2020 집계표 7개 변수 z점수 합. 원전: 김동진 외, 「한국의 건강불평등 지표와 정책과제」, 한국보건사회연구원 연구보고서 2013-10", "url": doc("지역박탈지수_산출_v2.md"), "updated": upd("dep")},
    {"key": "risk", "org": "자체 집계(복수 출처)", "title": "감염병 대응 고위험군 30개 집단 규모",
     "detail": "주민등록인구·지역사회건강조사·장기요양·예방접종 통계 등 결합. 실측/추정 구분 표기", "url": doc("감염병_고위험군_v1.md"), "updated": upd("risk")},
    {"key": "covid", "org": "질병관리청", "title": "코로나19 시군구별 월별 확진자 및 사망 발생 현황",
     "detail": "공공데이터포털 15124288 · 2020-01-20~2023-08-31 전수감시 · 신고 보건소 관할 기준", "url": COV["covid"]["url"], "updated": upd("covid")},
    {"key": "geo", "org": "통계청 SGIS(가공: southkorea-maps)", "title": "2018년 시군구 행정구역 경계(TopoJSON)",
     "detail": "skorea-municipalities-2018 · 공공누리 제1유형 원자료 가공", "url": "https://github.com/southkorea/southkorea-maps", "updated": ""},
    {"key": "mois", "org": "행정안전부", "title": "자치단체 행정구역 및 인구현황(e-나라지표)",
     "detail": "기초자치단체 226곳 · 시군구 229곳 = 226 + 제주 행정시 2 + 세종", "url": "https://www.index.go.kr/unity/potal/main/EachDtlPageDetail.do?idx_cd=1041", "updated": ""},
    {"key": "fac", "org": "보건복지부", "title": "전국 지역보건의료기관 현황(2025-12-31 기준)",
     "detail": "보건소·보건의료원·보건지소·보건진료소·건강생활지원센터 3,607곳 · 공공데이터포털 Open API", "url": "https://www.data.go.kr/data/3072692/fileData.do", "updated": "2025-12-31"},
    {"key": "kdcahc", "org": "질병관리청", "title": "지역사회건강조사 참여 보건소 정보",
     "detail": "공식 보건소 목록 255곳", "url": "https://chs.kdca.go.kr/chs/mainContent/pbhlthInfoMain.do", "updated": ""},
    {"key": "khepi", "org": "보건복지부", "title": "2025년 지역사회 통합건강증진사업 안내(총괄)",
     "detail": "핵심성과지표 16개와 목표치 설정법 · 부록3 지표 정의", "url": "https://www.mohw.go.kr/board.es?mid=a10411010100&bid=0019&act=view&list_no=1483973", "updated": ""},
    {"key": "nice", "org": "National Institute for Health and Care Excellence(영국)", "title": "NICE guidelines (NG series)",
     "detail": "공중보건·지역 적용 가능 지침 선별, 권고문 단위 분류", "url": "https://www.nice.org.uk/guidance", "updated": ""},
    {"key": "cpstf", "org": "Community Preventive Services Task Force(미국)", "title": "The Community Guide — All Active Findings (2024-11)",
     "detail": f"권고 224건 · 22개 주제 · 대시보드 목록은 개별 권고 원문(thecommunityguide.org) {sum(1 for x in J('cpstf_findings.json')['items'] if x.get('url'))}건·주제별 권고 목록으로 연결", "url": "https://www.thecommunityguide.org/media/pdf/cpstf-finding-lists/CPSTF-All-Findings-508.pdf", "updated": "2024-11"},
    {"key": "dir", "org": "이 대시보드", "title": "지표 방향성 확정 v1 — 미국·WHO·OECD·국내 12개 체계 조사",
     "detail": "지표별 「높을수록 좋음/나쁨/맥락」 판정 근거", "url": doc("지표_방향성_v1.md"), "updated": ""},
    {"key": "tiers", "org": "이 대시보드", "title": "지역보건사업 평가이론 v1 — WHO/IHP+ 결과사슬 계층 분류",
     "detail": "투입·산출·성과·임팩트·맥락 계층과 권장 측정 주기", "url": doc("지역보건사업_평가이론_v1.md"), "updated": ""},
    {"key": "ciat", "org": "질병관리청 수도권질병대응센터", "title": "CIAT 지역사회건강지표 분석도구",
     "detail": "화면 구성(6패널·심층분석 3종)을 참조", "url": "https://kdca.shinyapps.io/ciat/", "updated": ""},
    {"key": "rank", "org": "이 대시보드", "title": "랭킹 방법론 v1 — 영역 점수·등급·가중치",
     "detail": "균등 가중·3년 평균·결과지표 제외·등급(플래티넘 10%·골드 25%·실버 50%)", "url": doc("랭킹_방법론_v1.md"), "updated": ""},
    {"key": "errata", "org": "이 대시보드", "title": "사용설명서·대시보드 정오표 v1",
     "detail": "2026-09-24 숫자 전수 검증 결과와 정정 내역", "url": doc("사용설명서_정오표_v1.md"), "updated": "2026-09-24"},
    {"key": "hplan", "org": "보건복지부", "title": "제9기 지역보건의료계획(2027~2030) 수립 착수 — 「지역 보건의료 성과 나누고, 새로운 4년 준비합니다」",
     "detail": "지역보건법 제7조에 따른 4년 주기 법정계획 · 2026년 하반기 수립 착수", "url": "https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1490911", "updated": "2026"},
]
for i, r in enumerate(REFS, 1):
    r["n"] = i
KEYS = {r["key"] for r in REFS}

# ── 지표별 원 통계표 ──
by_ind = {}
ds = J("dataset.json")
for i in ds["indicators"]:
    by_ind[i["id"]] = {"refs": ["chs"], "table": i.get("src") or i["name"], "tbl": i["id"],
                       "url": KOSIS.format(org=177, tbl=i["id"])}

# 김동현 교수 DB 경유 지표: 카탈로그(비공개 data/kdh/catalog.csv)의 「자료생산기관·통계명」을 지표별로 적는다
def norm(x):   # build_kdh_dataset.py 와 같은 정규화
    return re.sub(r"[\s,·]", "", str(x)).replace("（", "(").replace("）", ")").lower()
cat = {}
catp = D / "kdh" / "catalog.csv"
if catp.exists():
    for r in csv.DictReader(open(catp, encoding="utf-8-sig")):
        cat.setdefault(norm(r["지표명"]), r)
PAT = {}
kd_src = (ROOT / "scripts" / "build_kdh_dataset.py").read_text(encoding="utf-8")
for m in re.finditer(r'\("(K_[A-Z0-9_]+)",\s*"[^"]*",\s*\w+,\s*[^,]+,\s*r"([^"]+)"', kd_src):
    PAT[m.group(1)] = re.compile(m.group(2))
DOM2KEY = {"사망률(표준화)": "mort", "감염병 발생률": "inf", "의료이용·검진": "nhis", "보건의료자원": "nhis",
           "인구·사회·경제": "pop", "환경·안전": "env"}
NON_NHIS = {"K_RES_PHCDOC", "K_RES_WELF", "K_RES_CULT", "K_RES_SOC"}
kdh = J("kdh_dataset.json")
miss = []
for i in kdh["indicators"]:
    key = "pop" if i["id"] in NON_NHIS else DOM2KEY.get(i["domain"], "kdh")
    raw = (re.search(r"원자료명 「(.+)」", i.get("src", "")) or [None, i["name"]])[1]
    row = None
    if i["id"] in PAT:
        row = next((r for n, r in cat.items() if PAT[i["id"]].search(n)), None)
    if row is None:
        row = cat.get(norm(raw))
    if row is None:
        miss.append(i["id"])
    prod = f'{row["자료생산기관"].strip()} 「{row["통계명"].strip()}」' if row else ("통계청 「사망원인통계」" if key == "mort" else "")
    by_ind[i["id"]] = {"refs": [key, "kdh"], "table": f"원자료명 「{raw}」" + (f" · 원 출처 {prod}" if prod else ""),
                       "tbl": "", "url": ""}

for f in ("cancer_screening.json", "checkup.json"):
    for i in J(f)["indicators"]:
        tbl = (re.search(r"(DT_35007_N\w+)", i.get("src", "")) or [None, ""])[1]
        by_ind[i["id"]] = {"refs": ["cancer" if f.startswith("cancer") else "nhis"], "table": i.get("src", ""), "tbl": tbl,
                           "url": KOSIS.format(org=350, tbl=tbl) if tbl else ""}
for hid, nm in (("HLE_LE", "기대수명(추정)"), ("HLE_HLE", "건강수명(추정)"), ("HLE_UNH", "불건강 기간")):
    by_ind[hid] = {"refs": ["hle", "mort", "chs"], "table": f"{nm} — 자체 산출(근사)", "tbl": "", "url": ""}
by_ind["DEP_IDX"] = {"refs": ["dep"], "table": "지역박탈지수(근사) — 인구주택총조사 집계표 7개 변수", "tbl": "", "url": ""}

bad = {k for v in by_ind.values() for k in v["refs"] if k not in KEYS}
assert not bad, bad
out = {"generated": time.strftime("%Y-%m-%d"),
       "note": "번호는 대시보드·사용설명서 공통. scripts/build_refs.py 의 REFS 순서로 고정.",
       "refs": REFS, "by_ind": by_ind}
(D / "refs.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"참고문헌 {len(REFS)}건 · 지표 {len(by_ind)}개 연결 · KDH 원 출처 미확인 {len(miss)}: {miss[:10]}")
