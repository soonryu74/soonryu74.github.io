# 실무자 사용성 테스트 프로토콜 (Practitioner Test Protocol) v1

- 대상: 보건소·시군구·시도 지역보건 실무자 **5–8명** (지역보건의료계획·통합건강증진사업 담당 경험자 우선)
- 목적: 「자기 지역의 우선 검토 지표를 찾고, 왜 그런지 설명하고, 근거 자료를 열고, 다른 지역과 비교」할 수 있는지 — 그리고 어디서 잘못 읽는지를 확인한다.
- 이 문서는 **계획**이다. 테스트를 하기 전에는 사이트·지원서에 참여자 수나 결과를 쓰지 않는다. 결과는 실제로 기록한 것만, 참여자 동의 범위 안에서 보고한다.
- English summary at the end.

## 1. 준비
| 항목 | 내용 |
|---|---|
| 시간 | 1인 30–40분 (과제 20분 + 설문·면담 10–15분) |
| 방식 | 대면 또는 화상(화면 공유). 참여자 본인 기기 사용 권장(평소 환경) — PC 또는 휴대폰 기록 |
| 주소 | https://health-profile.kr/ (테스트 시작 화면은 홈). 빌드 번호는 화면 맨 아래 크레딧 줄에서 확인해 기록 |
| 진행자 준비물 | 기록지(`docs/practitioner_test_record_template.csv`), 타이머, 동의서 |
| 개인정보 | 이름·연락처는 기록지에 쓰지 않는다. 참여자 번호(P1–P8)만 쓴다. 화면 녹화는 별도 동의가 있을 때만 |
| 보상 | 있다면 금액·형태를 동의서에 적는다(없으면 「무보수」) |

### 동의 안내(읽어 줄 문장)
"이 테스트는 사이트를 평가하는 것이지 선생님을 평가하는 것이 아닙니다. 막히는 곳이 바로 고쳐야 할 곳입니다. 생각나는 것을 소리 내어 말씀해 주세요. 언제든 중단하실 수 있고, 기록에는 이름이 남지 않습니다. 결과는 사이트 개선과 공모전 지원서에 「몇 명 중 몇 명이 과제를 마쳤다」처럼 묶어서만 쓰입니다."

## 2. 과제(순서대로, 진행자는 도와주지 않음 — 3분 넘게 막히면 「다음으로」)
| # | 과제 문장(그대로 읽음) | 성공 기준 | 시간 제한 |
|---|---|---|---|
| T1 | "선생님이 일하시는(또는 잘 아는) 지역을 찾아 그 지역 화면을 열어 주세요." | 해당 시군구(또는 보건소 단위)의 「지역 프로파일」 또는 우선 검토 카드가 열림 | 3분 |
| T2 | "이 지역에서 먼저 검토해 볼 건강 지표 하나를 골라 말씀해 주세요." | 「우리 지역 우선 검토 항목」의 지표 하나를 정확히 말함(우선 검토/관찰 필요 등급 포함) | 3분 |
| T3 | "그 지표가 왜 강조됐는지 화면을 보고 설명해 주세요." | 「왜 강조됐나」의 사실 2개 이상을 맞게 설명(예: 전국 중앙값보다 몇 %p 불리, 비교 집단에서의 위치, 추세, 신뢰구간). **인과로 말하면(「박탈 때문에」) 오해석으로 기록** | 4분 |
| T4 | "이 지표와 관련해 참고할 수 있는 근거 자료 하나를 열어 주세요." | 「검토해 볼 수 있는 공중보건 대응」에서 원문 링크 하나를 새 탭으로 엶 | 3분 |
| T5 | "이 지역을 다른 지역 하나와 비교해 주세요." | 「지역 비교」(비교 담기) 또는 「유사 지역 비교」(동류군)로 두 지역 이상이 한 화면에 나옴 | 4분 |

## 3. 기록 항목(과제마다)
| 칸 | 기록 방법 |
|---|---|
| completion time | 과제 문장을 다 읽은 때부터 성공 기준 화면까지(초). 실패·포기면 빈칸 |
| task success | 성공 / 도움 받아 성공 / 실패 |
| wrong interpretation | 잘못 읽은 내용을 참여자 말 그대로(예: "순위 1위가 제일 나쁜 줄 알았다", "박탈 때문에 흡연율이 높다") |
| confusing wording | 헷갈린 화면 문구·버튼 이름 그대로 |
| suggested change | 참여자가 제안한 변경 |
| confidence 1–5 | 과제 직후 "방금 답에 얼마나 확신하세요?" 1 전혀 – 5 매우 |

### 마지막 설문(전체 1회)
- usefulness 1–5: "이 화면이 계획 수립·보고·교육 업무에 도움이 될 것 같나요?"
- 한 문장: "가장 좋았던 점 / 가장 고쳐야 할 점은?"
- 사이트 안 「사용 의견 보내기」에서 **.json 저장**을 눌러 파일을 남겨도 된다(서버 전송 없음, 개인정보 칸 없음 — 시각·화면 크기·보던 화면·지역·지표·답만 담김).

## 4. 분석과 보고(테스트 뒤)
1. 과제별 성공률(성공 / 전체), 중앙 완료 시간, 확신도 중앙값.
2. 오해석을 묶어 빈도순 표(같은 오해가 2명 이상이면 문구·화면을 고친다).
3. 고친 내용과 고친 빌드 번호를 함께 기록 → 필요하면 2차 테스트(3–5명).
4. 보고 문장 규칙: 실제 수만("6명 중 5명이 T2 성공"), 모집 방법·소속 유형(시군구 보건소/시도)·기기를 함께 밝힌다. 「검증됐다」「효과가 입증됐다」는 쓰지 않는다.
5. 결과 파일은 `docs/` 에 올리기 전 개인 식별 정보가 없는지 확인한다.

## 5. 위험과 대응
- 진행자가 개발자 본인이면 유도 질문 위험 → 과제 문장만 읽고 화면을 가리키지 않는다.
- 같은 기관 사람만 모이면 편향 → 시군구 보건소·도농복합·광역시 구 등 섞기를 목표로 한다(모집 결과를 그대로 보고).
- 표본조사 오차를 모르는 참여자가 순위를 확정적으로 읽을 수 있음 → T3 오해석으로 따로 센다(고칠 문구 후보).

---

## English summary
- Participants: 5–8 local public-health practitioners; 30–40 minutes each; own device; participant IDs only (no names).
- Tasks: T1 find their area · T2 identify one indicator to review first · T3 explain why (causal explanations are recorded as misinterpretations) · T4 open one evidence document · T5 compare with another area.
- Recorded per task: completion time, success (success / assisted / fail), wrong interpretation, confusing wording, suggested change, confidence 1–5; overall usefulness 1–5.
- Reporting: actual counts only, with recruitment and device details; no "validated" or "proven" language. Until the test has been run, no participant numbers or results are shown on the site or in applications.
- Record sheet: `docs/practitioner_test_record_template.csv`.
