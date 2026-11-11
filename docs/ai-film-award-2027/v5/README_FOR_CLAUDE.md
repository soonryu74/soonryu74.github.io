# 《입구》 v5 작업 폴더

상태(2026-11-11): 설계 문서 완료, **영상 0컷, 결제 0원, 제출 안 함.** 마감 2026-11-20(GST).

## 실행 순서
1. `tools/gen_v5.py` 수정 → `python3 tools/gen_v5.py` (02·03·05·05b·09 재생성)
2. `python3 tools/check_v5.py` (FAIL 0 확인, 결과를 10번 문서에 반영)
3. 승인 후 `08_pilot_plan_and_scorecard_v5.md`대로 파일럿

## 파일
| 파일 | 내용 | 만드는 법 |
|---|---|---|
| 01_screenplay_v5_final.md | 시나리오 + 수정안 R1~R3 | 수작업 |
| 02_shotlist_v5.csv | 75행 단일 진실 소스 | 생성 |
| 03_seedance_prompts_v5.md | 71샷 프롬프트 | 생성 |
| 04_character_and_prop_bible_v5.md | 인물·소품·장소 | 수작업 |
| 05_subtitles_ko_en_v5.srt / 05b_…en_burnin… | 검토용 한영 / 번인용 영어 | 생성 |
| 06_fact_fiction_register_v5.csv | 사실·창작·미확인 | 수작업 |
| 07_rules_compliance_v5.md | 공식 규정 대조 | 수작업 |
| 08_pilot_plan_and_scorecard_v5.md | 3컷 파일럿 | 수작업 |
| 09_production_budget_v5.csv | 샷별 추정 비용 | 생성 |
| 10_validation_report_v5.md | 검증 결과 | check 출력 + 수작업 |
| 11_change_log_v4_2_to_v5.md | 변경 이력 | 수작업 |

## 입력 누락
v4.2 파일 8종 전부 없음(11번 문서 하단 목록).

## 승인 필요
1. 수정안 R1~R3
2. 파일럿 상한 $80
3. 미공개·타 공모전 미출품·만 18세 이상 확인

## 금지 (승인 전)
영상 생성 결제, 유료 API 호출, 제출, 공개 업로드, 기존 파일 삭제·덮어쓰기. 영상·스틸을 이 공개 저장소에 올리지 말 것.
