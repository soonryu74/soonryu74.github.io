"""
KNHANES 원시자료 변수 스캔.

thesis/data/raw/ 에 있는 .sav / .sas7bdat 파일을 열어서
변수명과 변수설명(label)을 전부 뽑고, 우리가 필요한 변수 후보를 찾아낸다.

사용법:
    python3 thesis/analysis/01_scan_variables.py
"""

import re
import sys
from pathlib import Path

import pandas as pd
import pyreadstat

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"
OUT = Path(__file__).resolve().parents[1] / "output"

# 찾고 싶은 변수의 한글/영문 키워드
TARGETS = {
    "수면_시각": ["취침", "잠자리", "기상", "일어", "수면", "잠"],
    "식사_시각": ["식사시각", "섭취시각", "끼니", "식사시간", "먹은시각"],
    "조사요일": ["요일", "조사일"],
    "아침식사": ["아침", "조식", "결식"],
    "근로": ["근로", "직업", "종사", "은퇴", "경제활동", "일자리"],
    "대사": ["허리둘레", "수축기", "이완기", "공복", "중성지방", "HDL", "당화혈색소", "체질량"],
    "우울": ["우울", "PHQ", "자살", "스트레스"],
    "좌식_활동": ["앉아", "좌식", "걷기", "신체활동", "근력"],
}


def scan_file(path: Path) -> pd.DataFrame:
    """파일 하나를 읽어 변수명/설명 목록을 DataFrame으로 반환."""
    reader = pyreadstat.read_sav if path.suffix == ".sav" else pyreadstat.read_sas7bdat
    # metadataonly=True 면 실제 데이터를 안 읽어서 빠르다
    _, meta = reader(str(path), metadataonly=True)
    return pd.DataFrame(
        {
            "file": path.name,
            "variable": meta.column_names,
            "label": [meta.column_names_to_labels.get(c) or "" for c in meta.column_names],
        }
    )


def main() -> int:
    files = sorted(p for p in RAW.rglob("*") if p.suffix in {".sav", ".sas7bdat"})
    if not files:
        print(f"[!] {RAW} 에 .sav / .sas7bdat 파일이 없습니다.")
        return 1

    frames = []
    for path in files:
        try:
            frame = scan_file(path)
        except Exception as exc:  # 파일이 깨졌거나 형식이 다를 때
            print(f"[!] {path.name} 읽기 실패: {exc}")
            continue
        print(f"[+] {path.name}: 변수 {len(frame):,}개")
        frames.append(frame)

    if not frames:
        return 1

    catalog = pd.concat(frames, ignore_index=True)
    OUT.mkdir(exist_ok=True)
    catalog.to_csv(OUT / "variable_catalog.csv", index=False, encoding="utf-8-sig")
    print(f"\n[+] 전체 변수 목록 저장: output/variable_catalog.csv ({len(catalog):,}행)")

    # 키워드별 후보 추출
    haystack = catalog["variable"].str.lower() + " " + catalog["label"].str.lower()
    hits = []
    for group, keywords in TARGETS.items():
        pattern = "|".join(re.escape(k.lower()) for k in keywords)
        matched = catalog[haystack.str.contains(pattern, na=False)].copy()
        matched.insert(0, "group", group)
        hits.append(matched)
        print(f"\n=== {group} ({len(matched)}개) ===")
        for _, row in matched.drop_duplicates("variable").head(30).iterrows():
            print(f"  {row['variable']:<20} {row['label']}")

    pd.concat(hits, ignore_index=True).to_csv(
        OUT / "variable_candidates.csv", index=False, encoding="utf-8-sig"
    )
    print("\n[+] 후보 변수 저장: output/variable_candidates.csv")
    return 0


if __name__ == "__main__":
    sys.exit(main())
