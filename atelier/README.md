# 순려의 아틀리에 (`/atelier/`)

AI로 만든 시각 표현(스타일 코드·프롬프트·결과 이미지)을 카드로 모아 두는 작업실.
정적 페이지 하나 + `data/works.json` 하나로 돌아간다. 서버·빌드 없음.

사이트: https://soonryu74.github.io/atelier/

## 작품 추가하는 법

1. 이미지를 `atelier/img/`에 넣는다. (webp 권장, 긴 변 1600px 이하)
2. `atelier/data/works.json`의 `works` 배열 **맨 앞**에 항목 하나를 더한다. (앞에 둘수록 최신순 상단)
3. `updatedAt`을 오늘 날짜로 바꾼다.

### 항목 형식

```json
{
  "id": "mj-2026-10-06-01",
  "title": "빛바랜 필름 느낌의 여름 해변",
  "tool": "midjourney",
  "model": "Midjourney v7",
  "sref": "1234567890",
  "params": "--v 7 --sw 300 --ar 3:4",
  "prompt": "a woman walking on the beach at dusk",
  "image": "img/mj-2026-10-06-01.webp",
  "tags": ["필름", "여름", "인물"],
  "date": "2026-10-06",
  "source": "",
  "note": "sw 300이 가장 안정적"
}
```

| 키 | 필수 | 설명 |
| --- | --- | --- |
| `id` | ✔ | 고유값. 카드 링크(`#id`)와 ♥ 컬렉션 저장에 쓴다. 한 번 정하면 바꾸지 않는다. |
| `title` | ✔ | 카드 제목 |
| `tool` | ✔ | `midjourney` · `gpt-image` · `nano-banana` · `imagen` · `flux` · `stable-diffusion` · `other`. 필터 칩이 자동으로 생긴다. |
| `model` | | 카드에 표시할 모델명 (없으면 `tool` 이름) |
| `sref` | | 스타일 코드 숫자만. 있으면 "코드 복사" 버튼이 `--sref 숫자 params`를 복사한다. |
| `params` | | `--sref` 뒤에 붙일 추가 파라미터 |
| `prompt` | | 프롬프트 전문. `sref`가 없으면 "프롬프트 복사" 버튼이 이걸 복사한다. |
| `image` | | 이미지 경로. 없으면 코드가 적힌 타일로 대신 보인다. |
| `tags` | | 태그 배열. 상위 24개가 칩으로 뜬다. |
| `date` | | `YYYY-MM-DD` 또는 `YYYY-MM` |
| `source` | | 원본 페이지 링크 (모달의 ↗ 버튼) |
| `note` | | 메모. 모달에만 보인다. |

## 기능

- 도구별 칩 + 태그 칩 + 검색(제목·프롬프트·코드·태그)
- 카드 클릭 → 큰 이미지 + 전체 프롬프트 모달, 주소창 `#id`로 공유 가능
- ♥ 내 컬렉션 (브라우저 localStorage, 기기별)
- 밝게/어둡게 전환
- 복사 버튼: `sref`가 있으면 코드, 없으면 프롬프트

## 지금 들어 있는 것

GPT Image 2.5 한국어 프롬프트 시트(`/gpt-image-2-5-gallery.html`)에서 실제로 생성한 25건을 먼저 옮겨 두었다.
제목은 프롬프트 첫 문장에서 자동으로 딴 것이라 손봐도 된다.
