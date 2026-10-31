# 폰트 가이드 — 무료·상업용 가능·가독성 우선

이 템플릿이 쓰는 폰트는 전부 **상업적 이용이 가능한 무료 폰트**다. 유튜브 썸네일·강의 슬라이드·전자책 어디에 써도 라이선스 걱정이 없다.
(아래 라이선스 요약은 2026-10-31 기준 각 배포처 원문을 확인한 내용. 배포 조건은 바뀔 수 있으니 상업 프로젝트 전에 링크에서 한 번 더 확인한다.)

## 역할별 기본 폰트 (build_deck.py의 `fonts` 기본값)

| 역할 | 폰트(PowerPoint에서 보이는 이름) | 쓰는 곳 | 왜 이 폰트인가 |
|---|---|---|---|
| `display` | **Paperlogy 9 Black** (페이퍼로지) | 표지·썸네일·마무리 큰 제목, 숫자 강조 | 획이 굵고 자간이 고르며 작은 화면(휴대폰 썸네일)에서도 뭉개지지 않는다. 9단계 굵기라 세밀 조절 가능 |
| `title` | **Paperlogy 8 ExtraBold** | 본문 슬라이드 제목, 섹션 제목 | display와 같은 가족이라 통일감, 한 단계 가벼워 긴 제목도 답답하지 않음 |
| `head` | **Pretendard SemiBold** (프리텐다드) | 소제목, 카드 제목, 칩 글자 | 화면용으로 설계된 가장 중립적인 한글 고딕. 어떤 굵기도 균질 |
| `body` | **Pretendard** (Regular, bold → Pretendard Bold) | 본문·설명·캡션 | 14~16pt에서 가독성 최상. 영문·숫자 폭도 안정적 |
| `number` | **Gmarket Sans TTF Bold** (지마켓 산스) | 숫자 칩("1주"), 날짜, 메타, 페이지 번호 | 숫자·영문이 둥글고 또렷해 포스터의 "1주·2주" 느낌을 그대로 냄 |
| `impact` | **Black Han Sans** (검은고딕) | 썸네일에서 `"impact": true`일 때 제목 | 가장 굵은 무료 고딕. 짧은 단어(4~6자) 임팩트용. 긴 문장엔 쓰지 않는다 |

> 이름 주의: Gmarket Sans는 **TTF판은 "Gmarket Sans TTF Bold", OTF판은 "Gmarket Sans Bold"** 로 설치된다. 사용자가 OTF를 깔았다면 스펙의 `fonts.number`를 `"Gmarket Sans Bold"`로 바꾼다.
> Paperlogy는 굵기마다 별도 패밀리명("Paperlogy 7 Bold", "Paperlogy 9 Black")으로 잡힌다. `bold=True`를 켜면 가짜 볼드가 생기므로 스크립트는 display/title/number에는 bold를 끈다.

### 대체 조합(분위기 바꾸고 싶을 때)

| 분위기 | display/title | body | 메모 |
|---|---|---|---|
| 포스터처럼 더 둥글고 친근하게 | **Cafe24 Ssurround** (카페24 써라운드) | Pretendard | 참고 포스터 "청렴한 달" 제목과 가장 비슷한 둥근 획 |
| 손글씨 느낌·따뜻하게 | **Jua** (배민 주아) / **Do Hyeon** (배민 도현) | Pretendard | 50대 시청자 친화적, 단 긴 문장엔 피로 |
| 가장 단단한 썸네일 | **Black Han Sans** | — | 4~6자 한 줄 제목 전용 |
| 전부 한 가족으로 | Pretendard Black / Pretendard | Pretendard | 설치 1개로 끝. 무난하지만 개성은 줄어듦 |

스펙에서 바꾸는 법:
```json
"fonts": {"display": "Cafe24 Ssurround", "title": "Cafe24 Ssurround", "number": "Gmarket Sans Bold"}
```

## 라이선스 요약과 공식 배포처

| 폰트 | 저작권자 | 라이선스 | 상업 이용 | 금지 사항 | 공식 배포 |
|---|---|---|---|---|---|
| Pretendard | 길형진 | SIL OFL 1.1 | 가능 | 폰트 단독 판매, 라이선스 변경 | github.com/orioncactus/pretendard |
| Paperlogy | Freesentation | SIL OFL | 가능 | 폰트 단독 판매, 라이선스 변경 | freesentation.blog/paperlogyfont |
| Gmarket Sans | (주)지마켓 | 지마켓 무료 배포("누구나 아무 제약 없이") | 가능 | 폰트 파일 유료 판매 | corp.gmarket.com/fonts |
| Black Han Sans, Do Hyeon, Jua | Zess Type / 우아한형제들 | SIL OFL | 가능 | 폰트 단독 판매 | fonts.google.com |
| Cafe24 Ssurround | 카페24(주) | OFL(카페24 안내) | 가능 | 폰트 자체 유료 판매 | fonts.cafe24.com |
| S-Core Dream(에스코어 드림) | (주)에스코어 | 자체 라이선스 | 가능, 재배포 가능 | **파일 수정·판매 금지** | s-core.co.kr/company/font |

- 눈누(noonnu.cc)에서 "상업적 이용 가능" 필터로 추가 후보를 찾을 수 있다. 다만 눈누는 2차 안내이므로 최종 확인은 배포사 페이지에서.
- 시력 교정 업종 제한(비앤빛 라식체)처럼 **업종 제한이 있는 폰트**가 있다. 위 표의 폰트에는 업종 제한이 없다.

## 설치 방법 (강의·전자책에 그대로 써도 되는 안내문)

### 다운로드
1. 프리텐다드: github.com/orioncactus/pretendard → Releases → `Pretendard-1.x.x.zip` (TTF 쓰려면 `alternative` 폴더)
2. 페이퍼로지: freesentation.blog/paperlogyfont → "Paperlogy-1.001.zip"
3. 지마켓 산스: corp.gmarket.com/fonts → "TTF 다운로드"
4. 검은고딕·도현·주아: fonts.google.com 에서 검색 → "Get font" → "Download all"

### 윈도우(Windows)
- 압축을 풀고 `.ttf` 파일을 모두 선택 → 마우스 오른쪽 → **"모든 사용자용으로 설치"**
  (그냥 "설치"를 누르면 내 계정에만 설치되어, PowerPoint가 다른 계정에서 열릴 때 글꼴이 바뀐다)
- 터미널로 하려면 (PowerShell):
  ```powershell
  Copy-Item .\*.ttf "$env:WINDIR\Fonts\"
  ```
  관리자 권한 PowerShell에서 실행. 설치 뒤 PowerPoint를 완전히 종료했다가 다시 연다.

### 맥(Mac)
- `.ttf` 파일을 모두 선택 → 더블클릭 → **서체 관리자(Font Book)** 에서 "설치"
- 터미널로 하려면:
  ```bash
  cp *.ttf ~/Library/Fonts/
  ```
  (모든 사용자용은 `/Library/Fonts/`, `sudo` 필요). 설치 뒤 PowerPoint·키노트를 다시 연다.

### 리눅스 / 이 샌드박스(렌더링 QA용)
```bash
bash scripts/install_fonts.sh      # ~/.fonts/ppt-design-template/ 에 내려받고 fc-cache 갱신
```

## 글꼴 포함(임베딩)으로 "받는 사람 컴퓨터에 폰트가 없어도" 보이게 하기

PowerPoint → 파일 → 옵션 → 저장 → **"파일에 글꼴 포함"** 체크 → "모든 문자 포함" 선택.
OFL 폰트(프리텐다드·페이퍼로지·검은고딕 등)는 임베딩이 허용된다. 지마켓 산스도 임베딩을 허용한다고 산돌구름 안내에 표기되어 있다. 에스코어 드림은 "파일 수정 금지" 조항이 있어 임베딩 전에 배포사 안내를 확인한다.

## 썸네일 가독성 체크 (휴대폰 화면 기준)

- 제목은 **한 줄 4~8자, 최대 2줄**. 1280×720에서 글자 높이가 화면의 1/6 이상이어야 피드에서 읽힌다.
- 바탕(하늘)과 글자(남색 `0D1F6B`)의 명도 차가 커야 한다. 분홍 강조(`D9456B`)는 한 단어까지만.
- 검은고딕(`impact`)은 자간이 좁아 6자를 넘으면 오히려 덩어리로 보인다. 그때는 Paperlogy 9 Black으로.
- 글자에 외곽선·그림자를 덧대지 않는다. 신뢰감 있는 썸네일은 "깨끗한 글자 + 여백"으로 읽히게 한다.
