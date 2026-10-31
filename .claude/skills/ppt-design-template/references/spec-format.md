# 스펙 JSON 형식

```json
{
  "output": "deck.pptx",            // -o 로 덮어쓸 수 있음
  "accent": "pink",                 // 강조색: yellow | green | blue | pink | "D9456B"(hex)
  "brand": {"name": "AI 발굴러 순류", "tagline": "한 줄 슬로건(표지)", "logo": "logo.png"},
  "fonts": {"display": "Cafe24 Ssurround"},   // 선택, 역할별 덮어쓰기 (references/fonts.md)
  "palette": {"navy": "0D1F6B"},               // 선택, 색 토큰 덮어쓰기
  "slides": [ ... ]
}
```

공통 키: 모든 슬라이드에 `"notes": "발표자 노트"` 를 넣을 수 있다. 본문 타입은 `"idx": 1` 을 주면 제목 왼쪽에 파스텔 번호 원(01·02…)이 붙고 색이 순서대로 돈다. `"kicker": "작은 머리말"` 은 제목 위 12pt 회색 글자.

텍스트 안의 `[[단어]]` 는 강조색으로 칠해진다(제목·썸네일·불릿 모두). `\n` 은 줄바꿈.

## 슬라이드 타입

### cover — 표지 (하늘 배경)
```json
{"type": "cover", "badge_label": "Vibe Coding Class", "badge_value": "2026",
 "date": "2026.11.2(월) ~ 27(금)", "title": "엑셀 자동화\n이거면 끝",
 "subtitle": "한 줄 부제", "tags": ["1주","2주","3주","4주"], "badge": "무료", "title_size": 62}
```
`tags` 4개가 풍선 라벨. `badge`는 클러스터 위 남색 작은 원(선택). 제목 12자×2줄.

### section — 섹션 구분 (연한 하늘)
```json
{"type": "section", "title": "왜 지금 자동화인가", "subtitle": "한 줄 설명", "number": "01"}
```
`number` 생략 시 등장 순서(01, 02…) 자동. 색도 순서대로 노랑→초록→파랑→분홍.

### agenda — 목차·주차 일정 (흰 카드 + 칩 + 풍선)
```json
{"type": "agenda", "title": "4주 과정 한눈에 보기",
 "items": [{"label": "1주", "meta": "11/02~06", "text": "코워크 설치와 첫 자동화"}, ...]}
```
2~6개. `meta`는 선택(날짜·시간). `text` 24자.

### rows — 번호 원 + 소제목 + 설명 (2~4행)
```json
{"type": "rows", "idx": 2, "title": "오늘 배우는 세 가지",
 "items": [{"head": "소제목 28자", "desc": "설명 1~2문장", "label": "1", "icon": "icon.png"}]}
```
`icon`(PNG 경로)이 있으면 번호 대신 아이콘. 없으면 숫자.

### cards — 카드 그리드 (2·4개 → 2열, 3·5·6개 → 3열)
```json
{"type": "cards", "idx": 3, "title": "도구 3가지",
 "items": [{"head": "16자", "desc": "짧은 설명", "label": "A"}]}
```

### two_col — 왼쪽 글 / 오른쪽 이미지
```json
{"type": "two_col", "idx": 3, "title": "실습: 매출 취합", "lead": "굵은 한 줄 요약(선택)",
 "bullets": ["불릿 30자", "..."], "image": "capture.png", "caption": "이미지 없을 때 자리표시 문구"}
```
`image`가 없거나 파일이 없으면 파스텔 자리표시자.

### stats — 큰 숫자 2~4개
```json
{"type": "stats", "idx": 1, "title": "숫자로 보면",
 "items": [{"value": "주 3시간", "label": "라벨", "note": "출처·조건(선택)"}],
 "footnote": "수치 출처나 '예시' 표기"}
```
숫자는 **반드시 출처 또는 '예시' 표기**. 과장 금지 원칙.

### compare — Before / After
```json
{"type": "compare", "idx": 5, "title": "자동화 전과 후",
 "left": {"head": "Before", "items": ["...", "..."]},
 "right": {"head": "After", "items": ["...", "..."]}}
```
왼쪽은 회색, 오른쪽은 연초록. 각 3~4개.

### steps — 가로 단계 2~5개 (점선 연결)
```json
{"type": "steps", "idx": 4, "title": "4단계",
 "steps": [{"head": "12자", "desc": "짧게", "label": "1"}]}
```

### quote — 인용·한마디 (연한 하늘)
```json
{"type": "quote", "text": "어렵지 않아요.\n원하는 걸 말하는 연습입니다.", "by": "출처", "size": 30}
```

### closing — 마무리·CTA (하늘 배경)
```json
{"type": "closing", "title": "여러분도\n할 수 있어요", "subtitle": "한 줄",
 "cta": "실습 파일 받기", "links": ["youtube.com/@...", "사이트"], "tags": ["1주","2주","3주","4주"]}
```

### thumbnail — 유튜브 썸네일 1280×720 (진한 하늘)
```json
{"type": "thumbnail", "kicker": "몰랐죠?", "title": "엑셀 자동화\n[[이거면 끝]]",
 "sub": "클로드 코워크 무료 꿀조합", "badge": "무료", "tags": ["1주","2주","3주","4주"],
 "impact": false, "title_size": 92}
```
제목 8자×2줄, 강조 한 곳. `impact: true` → 검은고딕(4~6자 한 줄일 때만).
추출: `python3 scripts/render.py thumb.pptx --thumb 1`.

## 최소 예시 (3장)

```json
{"brand": {"name": "AI 발굴러 순류"},
 "slides": [
  {"type": "cover", "title": "노트북LM\n숨겨진 기능 3", "subtitle": "자료 정리 자동화", "tags": ["요약","질문","오디오","공유"]},
  {"type": "rows", "idx": 1, "title": "오늘의 세 가지", "items": [
     {"head": "PDF 50개를 한 번에 요약", "desc": "폴더째 올리면 끝."},
     {"head": "출처가 붙는 답변", "desc": "어느 문서 몇 쪽인지 같이 보여준다."},
     {"head": "오디오 요약(팟캐스트)", "desc": "출퇴근길 듣는 복습 자료."}]},
  {"type": "closing", "title": "다음 주에\n또 만나요", "cta": "구독·알림 설정"}
 ]}
```
