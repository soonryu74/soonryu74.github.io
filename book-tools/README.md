# 『역학조사관』 책 제작 파이프라인

장편소설 『역학조사관』(제1권 전설의 훈련단 · 제2권 일천일야, 감량 개고 확정본)을
전자책·종이책·투고 원고로 변환하는 스크립트 모음입니다.

**원고 본문은 이 저장소에 포함되지 않습니다.** (공개 저장소이므로 미출간 원고 보호)
원본은 Google Drive의 「역학조사관_합본_감량개고확정본」 문서입니다.

## 산출물

| 파일 | 용도 |
|---|---|
| `역학조사관.epub` | 전자책 (리디북스·교보·유페이퍼 등 등록용, EPUB3) |
| `역학조사관_신국판.pdf` | 종이책 내지 (신국판 152×225mm, 346쪽, POD 주문형 출판용) |
| `역학조사관_A4인쇄용.pdf` | 집·사무실 프린터로 뽑아 읽는 판 (A4, 11.2pt, 258쪽) |
| `역학조사관_원고.docx` | 출판사 투고용 원고 (A4, 바탕체, 자동 목차) |
| `reader.html` | 브라우저에서 바로 읽는 웹 전자책 (차례·이전다음·글자크기·이어읽기) |
| `cover.png` | 표지 (1600×2400) |

## 빌드 순서

```bash
# 0. 사전 준비: 한글 폰트, 의존성
apt-get install -y fonts-noto-cjk fonts-nanum poppler-utils
pip install playwright python-docx
curl -sSL -o paged.polyfill.js https://unpkg.com/pagedjs/dist/paged.polyfill.js
# Google Docs에서 markdown으로 내려받은 원고를 manuscript.md 로 저장

python3 parse.py                 # manuscript.md → book.json (권/부/장 구조화)
python3 shot.py $PWD/cover.html $PWD/cover.png 1600 2400   # 표지 렌더
python3 build_epub.py            # → 역학조사관.epub
python3 build_reader.py          # → reader.html (웹 리더)

python3 build_pdf_html.py sinkuk # → pdf.html (신국판 조판용)
python3 print_pdf.py $PWD/pdf.html $PWD/역학조사관_신국판.pdf

python3 build_pdf_html.py a4     # → pdf_a4.html (A4 조판용)
python3 print_pdf.py $PWD/pdf_a4.html $PWD/역학조사관_A4인쇄용.pdf

node build_docx.js               # → 역학조사관_원고.docx
```

판형은 `build_pdf_html.py`의 `PRESET`에서 정의합니다(용지·여백·본문 크기·행간).

- PDF 조판은 Paged.js + Chromium 인쇄 엔진 사용: 목차 쪽번호(target-counter),
  면주(짝수쪽 서명·홀수쪽 장 제목), 신국판 규격, Noto Serif CJK KR 본문.
- EPUB은 EPUB3 스펙으로 직접 조립(표지·속표지·nav·장별 XHTML), XML 정합성 검증 포함.
- DOCX는 docx(npm)로 생성: Heading 1~3(권·부·장) + 자동 목차 필드(열 때 갱신).
