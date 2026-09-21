"""한국건강증진개발원 「지역사회 통합건강증진사업 핵심성과지표 통계 자료집(2011-2016)」 파싱.

입력  data/raw_khepi/stat1116.pdf  (309쪽, 공개자료 · 저장소에 포함하지 않음)
      출처 https://www.khepi.or.kr/kps/publish/view?menuId=MENU00890&page_no=B2017003&board_idx=9945
출력  data/khepi_kpi_1116.json

대시보드 미보유 3종(모유수유 실천율, 1년후 300일 이상 고혈압/당뇨 투약순응률)의
시군구 × 2011~2016년 × 조율·표준화율 값을 추출한다. 나머지 13종은 지역사회건강조사로
2008~2025년 시계열을 이미 보유하므로 수집하지 않는다.

주의
- 모유수유 실천율은 자료집 전체에서 표준화율 칸이 비어 있다(조율만 제공).
  「핵심성과지표 동향(2017)」은 같은 값을 '표준화율'로 표기했으나 자료집 표기를 따른다.
- 2022년 영유아건강검진 문진표 개정으로 모유수유 실천율의 정의·산식이 바뀌었다.
  본 자료는 구(舊) 정의 구간이므로 현행 지표와 시계열을 이어 붙이면 안 된다.
- 괄호로 표기된 일반구((덕양구) 등)는 상위 시의 하위 행이므로 제외한다.
"""
import json, re
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw_khepi" / "stat1116.pdf"
OUT = ROOT / "data" / "khepi_kpi_1116.json"

WANT = {"11": "모유수유 실천율", "15": "고혈압 투약순응률", "16": "당뇨 투약순응률"}
YEARS = ["2011", "2012", "2013", "2014", "2015", "2016"]
HEAD = re.compile(r"<표\s*(\d+)\s*-\s*(\d+)>\s*(\S+)")
# 2016년 이후 개편된 행정구역명
ALIAS_SIDO = {"강원도": "강원특별자치도", "전라북도": "전북특별자치도"}
ALIAS_SGG = {("인천광역시", "남구"): "미추홀구"}


def num(s):
    if s is None:
        return None
    s = s.strip().replace(" ", "")
    if s in ("", "-", "–", "—"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def load_regions():
    ds = json.loads((ROOT / "data" / "dataset.json").read_text(encoding="utf-8"))
    sido = {r["n"]: r["c"] for r in ds["regions"] if r["l"] == "sido"}
    sgg = {}
    for r in ds["regions"]:
        if r["l"] == "sgg":
            sgg.setdefault(r["p"], {})[r["n"]] = r["c"]
    return sido, sgg


def parse():
    SIDO, SGG = load_regions()
    doc = pymupdf.open(SRC)
    out = {v: {} for v in WANT.values()}
    split, unmatched, skipped_gu = [], [], 0

    for page in doc:
        heads = []
        for b in page.get_text("blocks"):
            for m in HEAD.finditer(" ".join(b[4].split())):
                heads.append((b[1], m.group(1), m.group(2), m.group(3)))
        if not heads:
            continue
        tables = [(t.bbox[1], t.extract()) for t in page.find_tables().tables]
        data = [(y, r) for y, r in tables if r and len(r[0]) == 13 and len(r) >= 2]
        if not data:
            continue
        heads.sort()
        data.sort()

        for ty, rows in data:
            # 표 위쪽에서 가장 가까운 제목과 짝짓는다
            cand = [h for h in heads if h[0] <= ty + 40]
            if not cand:
                continue
            _, sido_no, ind_no, sido = cand[-1]
            if sido_no == "1" or ind_no not in WANT:  # 1 = 전국추이 장
                continue
            ind = WANT[ind_no]
            sido_code = SIDO.get(ALIAS_SIDO.get(sido, sido))

            for r in rows:
                name = (r[0] or "").strip().replace(" ", "")
                if not name or name in ("시·군·구", "시군구"):
                    continue
                if name.startswith("("):  # 일반구
                    skipped_gu += 1
                    continue
                for cell in r[1:]:
                    if cell and " " in cell.strip():
                        split.append((page.number + 1, sido, ind, name, cell))

                if name == sido:
                    code, level = sido_code, "sido"
                else:
                    key = ALIAS_SGG.get((sido, name), name)
                    code = SGG.get(sido_code, {}).get(key)
                    level = "sgg"
                    if code is None:
                        unmatched.append((sido, name))
                        continue

                rec = {}
                for j, y in enumerate(YEARS):
                    c, s = num(r[1 + 2 * j]), num(r[2 + 2 * j])
                    if c is not None or s is not None:
                        rec[y] = {"crude": c, "std": s}
                if rec:
                    out[ind][code] = {"name": name, "sido": sido, "level": level, "v": rec}

    assert not split, f"칸 분리 오류 {len(split)}건: {split[:3]}"
    assert not unmatched, f"지역 미매칭 {len(unmatched)}건: {unmatched[:5]}"
    return out, skipped_gu


def main():
    if not SRC.exists():
        raise SystemExit(f"{SRC} 없음 — 자료집 PDF를 내려받아 두세요")
    out, gu = parse()
    payload = {
        "source": "한국건강증진개발원 「지역사회 통합건강증진사업 핵심성과지표 통계 자료집(2011-2016)」",
        "source_url": "https://www.khepi.or.kr/kps/publish/view?menuId=MENU00890&page_no=B2017003&board_idx=9945",
        "published": "2017-10-30",
        "years": YEARS,
        "note": ("모유수유 실천율은 표준화율 미제공(조율만). 2022년 정의 변경 전 구간이므로 "
                 "현행 지표와 시계열 연결 불가. 투약순응률 2종은 정의 동일."),
        "indicators": out,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    for ind, v in out.items():
        n_sgg = sum(1 for x in v.values() if x["level"] == "sgg")
        cells = sum(1 for x in v.values() for y in x["v"].values() if y["crude"] is not None)
        print(f"{ind}: 시도 17 · 시군구 {n_sgg} · 조율 {cells}칸")
    print(f"일반구 제외 {gu}행 · 출력 {OUT}")


if __name__ == "__main__":
    main()
