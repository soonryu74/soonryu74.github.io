# FINAL_SUBMISSION_CHECKLIST — MoveSafe AI

마감 **2026-10-30(금) 18:00 KST**. 접수: https://ggsports.spectory.net/innovation/apply/terms?bno=258 (개인 → 성명·연락처·이메일·비밀번호 → 약관 동의 → 신청서 작성). 접수 완료 전에는 '제출 완료'라고 쓰지 않는다.

## A. 코드·배포
- [ ] `claude/new-session-6e0x4m` → `main` 병합(승인) → Actions Jekyll 빌드 성공 확인
- [ ] `https://soonryu74.github.io/movesafe/` 에서 노트북 **실제 카메라**로 스쿼트·런지·착지 각 3회 수행, 단서·리포트 확인(HTTPS 라 카메라 허용됨)
- [ ] 폰(크롬·사파리)에서 1회 확인. 모델 로드 시간 체감(첫 로드 10~20초)
- [ ] 영양 페이지 계산·도핑 확인, about 링크 4개 클릭

## B. 제출 파일
| 파일 | 권장 파일명 | 출처 | 상태 |
|---|---|---|---|
| 발표자료(7분, 시연 포함) PDF | `MoveSafeAI_발표자료_서순려.pdf` | `submission/7MIN_PITCH.md` 9장 + `evidence/*.png` | 미제작 |
| 소개서(선택) | `MoveSafeAI_소개서_서순려.pdf` | `submission/ONE_PAGE_SUMMARY.md` + `about.html` 요약 | 미제작 |
| 서비스 링크 | — | 병합 후 주소 | 대기 |
| 시연 영상(권장) | `MoveSafeAI_시연_90초.mp4` | `submission/DEMO_SCRIPT.md` 대로 실제 카메라 화면 녹화 | 미녹화 |
| 화면 캡처 | `evidence/01~07-*.png` | 생성 완료 | ✔ |

## C. 접수 화면
- [ ] 접수 유형: 개인
- [ ] 분야: 경기력 향상 기술
- [ ] 작품명: MoveSafe AI — 웹캠 부상 예방 폼 코치 · 스포츠 영양 가이드
- [ ] 파일 형식·용량 확인 후 업로드
- [ ] 11-20(금) 발표 참석 가능 체크, 개인정보 동의
- [ ] 소속 기관 복무규정 확인 결과 반영

## D. 접수 후
- [ ] 접수 확인 화면 캡처 보관(개인정보 가림)
- [ ] 마감 전 수정 필요 시 '접수확인' 메뉴
- [ ] 11-13 1차 결과 → 11-20 발표 리허설(실제 카메라 + 샘플 백업)

## E. 남은 작업 우선순위 3
1. main 병합·배포 후 실제 카메라로 3개 운동 검증(임계값 체감 조정 필요 시 `js/exercise-rules.js` THR)
2. 발표 슬라이드 PDF
3. 90초 시연 영상
