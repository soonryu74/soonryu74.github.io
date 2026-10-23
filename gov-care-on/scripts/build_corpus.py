# -*- coding: utf-8 -*-
"""
원본 지침 PDF -> 페이지 텍스트 JSON 변환 스크립트 (원본 PDF는 저장소에 넣지 않음)

사용법:
  python scripts/build_corpus.py <pdf경로> <doc_id> <인쇄쪽수_오프셋>
  예) python scripts/build_corpus.py "2026년 긴급복지지원사업 안내.pdf" MOHW_EMG_2026 14
      -> input_readonly/corpus/MOHW_EMG_2026.json

인쇄쪽수_오프셋: PDF 페이지 번호 - 책자에 인쇄된 쪽수 (예: PDF 17p가 인쇄 3p이면 14)
"""
import hashlib
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

OUT_DIR = Path(__file__).resolve().parent.parent / "input_readonly" / "corpus"


def clean_page(text: str) -> str:
    lines = text.splitlines()
    # 결핵지침 좌측 세로 탭(한 글자씩 세로로 쪼개진 줄) 제거
    i = 0
    while i < len(lines) and len(lines[i].strip()) <= 2:
        i += 1
    if i >= 6:  # 세로 탭이 길게 이어진 경우만 제거
        lines = lines[i:]
    text = "\n".join(l.rstrip() for l in lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main(pdf_path: str, doc_id: str, offset: int) -> None:
    pdf = Path(pdf_path)
    sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
    reader = PdfReader(str(pdf))
    pages = []
    for idx, page in enumerate(reader.pages, start=1):
        try:
            raw = page.extract_text() or ""
        except Exception:
            raw = ""
        txt = clean_page(raw)
        if len(txt) < 40:
            continue
        pages.append({"pdf_page": idx, "print_page": idx - offset, "text": txt})
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{doc_id}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(
            {"doc_id": doc_id, "source_file": pdf.name, "source_sha256": sha, "page_offset": offset, "pages": pages},
            f, ensure_ascii=False,
        )
    print(f"{out}  pages={len(pages)}  sha256={sha[:16]}…")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]))
