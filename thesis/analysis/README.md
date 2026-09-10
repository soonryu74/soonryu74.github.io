# 분석 코드

| 파일 | 하는 일 |
|---|---|
| `01_scan_variables.py` | 원시자료의 변수명·변수설명을 전부 뽑고 필요한 변수 후보를 키워드로 찾아낸다 |

## 실행

```bash
python3 thesis/analysis/01_scan_variables.py
```

## 폴더 규칙

| 폴더 | 용도 | 커밋 |
|---|---|---|
| `data/raw/` | 내려받은 원시자료 원본 | ❌ 절대 금지 |
| `data/derived/` | 가공한 분석용 데이터 | ❌ 금지 |
| `output/` | 표·그림 | 선별해서 수동 추가 |
| `analysis/` | 코드 | ✅ |

**원시자료는 커밋하지 않는다.** KNHANES 원시자료는 CC-BY-NC-ND(제4유형)라 재배포가 금지되고, 이 저장소는 공개 저장소다. `thesis/.gitignore`가 막고 있지만 `git status`로 한 번 더 확인할 것.
