#!/usr/bin/env python3
"""KESS 학과별 교육통계(연도별) + 학과별 졸업자 취업통계 → ipsi/data/major-trend.json

학과 단위로 10년 흐름(학과 수·입학정원·지원자·입학자)과 최신 취업률을 소계열·키워드별로 집계한다.
대상은 4년제 '대학교 / 대학과정'(학부)만 — 대입을 준비하는 고등학생 기준.

실행: python3 scripts/build_trend.py
      TREND_YEARS=2016,2020,2026 python3 scripts/build_trend.py
원본 엑셀은 scripts/kess_cache/ 에 캐시(커밋 제외). 연도별 파일 ID는 dataset 페이지에서 자동 탐색.
"""
import importlib.util, json, os, re, sys, time
from collections import defaultdict
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "ipsi", "data", "major-trend.json")
spec = importlib.util.spec_from_file_location("bk", os.path.join(ROOT, "scripts", "build_kess.py"))
bk = importlib.util.module_from_spec(spec); spec.loader.exec_module(bk)

YEARS = [int(y) for y in os.environ.get("TREND_YEARS", "2016,2018,2020,2022,2024,2025,2026").split(",")]
DEPT_PAT = r"고등 학과별 학과수 입학정원"          # 연도별 '학과별' 파일(학교 구분 없이 학과 단위)
EMP_PAT = r"학과별 고등교육기관 (졸업자 )?취업통계"  # 학과별 취업통계(학교별 파일 제외)

# 학과명으로 묶어 보는 키워드. 소계열 분류로는 안 보이는 '이름의 유행'을 잡는다.
KEYWORDS = [
    ("ai", "인공지능·AI", r"인공지능|(^|[^A-Za-z])AI([^A-Za-z]|$)"),
    ("semi", "반도체", r"반도체"),
    ("data", "데이터·빅데이터", r"데이터"),
    ("sw", "소프트웨어·컴퓨터", r"소프트웨어|컴퓨터|SW"),
    ("free", "자유전공·무전공", r"자유전공|무전공|자율전공|열린전공"),
    ("bio", "바이오", r"바이오"),
    ("nurse", "간호", r"간호"),
    ("med", "의예·의학", r"^의예|^의학과$|의예과"),
    ("pharm", "약학", r"약학"),
    ("stat", "통계", r"통계"),
    ("kor", "국어국문", r"국어국문|한국어문|국문"),
    ("eng", "영어영문", r"영어영문|영문학|영어학"),
    ("phil", "철학", r"철학"),
    ("hist", "사학·역사", r"사학과|역사"),
    ("edu", "교육(사범)", r"교육과$|교육학과"),
    ("media", "미디어·콘텐츠", r"미디어|콘텐츠"),
    ("mobil", "모빌리티·자동차", r"모빌리티|자동차"),
    ("energy", "에너지", r"에너지"),
]


def discover_all():
    html = bk.http("https://kess.kedi.re.kr/contents/dataset")
    return re.findall(r"downLoad\('(\d+)','([^']+)','([^']+)','(\d+)'\)", html)


def pick(entries, pat, year):
    for _, fileNm, shown, _ in entries:
        if re.search(pat, shown) and shown.startswith(f"{year}년") and "학교별" not in shown:
            return fileNm, shown
    return None


def header_index(rows, key):
    """첫 열이 key이면서 '학과명' 열이 있는 행이 진짜 헤더다(그 위에 병합된 그룹 헤더 행이 하나 더 있다)."""
    for r in rows:
        if r and str(r[0]).strip() == key and any(str(c).strip() == "학과명" for c in r if c is not None):
            return {str(c).replace("\n", " ").strip(): i for i, c in enumerate(r) if c is not None}
    raise RuntimeError(f"헤더({key}) 없음")


def n(v):
    try: return int(float(v))
    except (TypeError, ValueError): return 0


def read_dept(path, year):
    """학과별 파일 → 소계열·키워드·대계열 집계 (대학교/대학과정만)."""
    rows = bk.sheet_rows(path); ix = header_index(rows, "연도")
    g = lambda r, k: r[ix[k]] if k in ix and ix[k] < len(r) else None
    minor, kw, major = defaultdict(lambda: [0, 0, 0, 0]), defaultdict(lambda: [0, 0, 0]), defaultdict(lambda: [0, 0, 0, 0])
    keys = [(k, re.compile(p)) for k, _, p in KEYWORDS]
    cnt = 0
    for r in rows:
        if not r or not r[0] or g(r, "학제") != "대학교" or g(r, "학위과정") != "대학과정": continue
        cnt += 1
        quota, app, ent = n(g(r, "입학정원_계")), n(g(r, "지원자_전체_계")), n(g(r, "입학자_전체_계"))
        mk = (g(r, "대계열"), g(r, "중계열"), g(r, "소계열"))
        for k, v in ((mk, minor), (mk[0], major)):
            v[k][0] += 1; v[k][1] += quota; v[k][2] += app; v[k][3] += ent
        name = str(g(r, "학과명") or "")
        for k, pat in keys:
            if pat.search(name): kw[k][0] += 1; kw[k][1] += quota; kw[k][2] += app
    print(f"  {year}: 학과 {cnt:,}개 · 소계열 {len(minor)}")
    return minor, kw, major


def read_emp(path):
    """학과별 취업통계 → 소계열별 졸업자·취업률(취업자/취업대상자 합, 없으면 졸업자 가중). 학제 '대학'만."""
    rows = bk.sheet_rows(path); ix = header_index(rows, "조사기준일")
    g = lambda r, k: r[ix[k]] if k in ix and ix[k] < len(r) else None
    tgt_key = next((k for k in ix if k.startswith("취업대상자") and k.endswith("_계")), None)
    agg = defaultdict(lambda: [0, 0, 0, 0.0])  # 졸업자, 취업자, 취업대상자, 취업률×졸업자
    for r in rows:
        if not r or not r[0] or g(r, "학제") != "대학": continue
        grad, emp = n(g(r, "졸업자_계")), n(g(r, "취업자_합계_계"))
        a = agg[(g(r, "대계열"), g(r, "중계열"), g(r, "소계열"))]
        a[0] += grad; a[1] += emp; a[2] += n(g(r, tgt_key)) if tgt_key else 0
        try: a[3] += float(g(r, "취업률_계") or 0) * grad
        except (TypeError, ValueError): pass
    out = {}
    for k, (grad, emp, tgt, wsum) in agg.items():
        rate = round(emp / tgt * 100, 1) if tgt else (round(wsum / grad, 1) if grad else None)
        out[k] = {"grad": grad, "emp": emp, "rate": rate}
    print(f"  취업통계: 소계열 {len(out)} (분모: {'취업대상자' if tgt_key else '졸업자 가중'})")
    return out


def main():
    t0 = time.time()
    ent = discover_all()
    minor_s, kw_s, major_s = {}, {}, {}
    for y in YEARS:
        f = pick(ent, DEPT_PAT, y)
        if not f: print(f"  {y}: 학과별 파일 없음 — 건너뜀", file=sys.stderr); continue
        path = bk.download(f"D{y}", f[0], f[1])
        minor_s[y], kw_s[y], major_s[y] = read_dept(path, y)
    emp_year = max(int(m.group(1)) for _, _, s, _ in ent if (m := re.match(r"(\d{4})년 " + EMP_PAT, s)) and "학교별" not in s)
    ef = pick(ent, EMP_PAT, emp_year)
    emp = read_emp(bk.download(f"E{emp_year}", ef[0], ef[1]))
    years = sorted(minor_s)
    keys = sorted({k for y in years for k in minor_s[y]}, key=lambda k: (k[0] or "", k[1] or "", k[2] or ""))
    minors = []
    for k in keys:
        s = {str(y): minor_s[y].get(k, [0, 0, 0, 0]) for y in years}
        e = emp.get(k)
        minors.append({"major": k[0], "mid": k[1], "minor": k[2], "s": s, "emp": e})
    keywords = [{"k": k, "label": lb, "s": {str(y): kw_s[y].get(k, [0, 0, 0]) for y in years}} for k, lb, _ in KEYWORDS]
    majors = {}
    for y in years:
        for k, v in major_s[y].items(): majors.setdefault(k, {})[str(y)] = v
    kst = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
    json.dump({"updated": kst, "years": years, "emp_year": emp_year, "scope": "4년제 대학교 학부(대학과정)",
               "source": "KESS 고등교육통계 학과별(연도별) · 학과별 고등교육기관 졸업자 취업통계",
               "cols": ["학과수", "입학정원", "지원자", "입학자"], "kw_cols": ["학과수", "입학정원", "지원자"],
               "minor": minors, "keywords": keywords, "major": majors},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"완료 {time.time()-t0:.0f}초: 연도 {years} · 소계열 {len(minors)} · 키워드 {len(keywords)} → {OUT}")


if __name__ == "__main__":
    main()
