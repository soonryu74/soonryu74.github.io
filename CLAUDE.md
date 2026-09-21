# 프로젝트 지침

## 한글 문서 작성 규칙 (필수)

사용자가 요청하는 **모든 한글 문서**(공문, 보고서, 계획서, 안내문, 활동지, 강의자료, 전자책 원고 등 .hwp/.hwpx 결과물이 필요한 문서)는 반드시 `hwpx` 스킬을 사용해 작성한다.

- 스킬 위치: `.claude/skills/hwpx/SKILL.md` (원본: https://github.com/jkf87/hwpx-skill)
- 문서 작성 전에 SKILL.md를 먼저 읽고, 해당 문서 유형(`official-letter`, `brief-report`, `plan-report`, `markdown` 등)의 워크플로우를 따른다.
- 스크립트 경로는 `.claude/skills/hwpx/scripts/` 기준 절대 경로로 실행한다.
- 결과물은 편집 가능한 `.hwpx`로 저장하고, 검사(`validate.py`, `finalize_hwpx.py`)를 거친 뒤 전달한다.
- 사용자가 다른 형식(.docx, .pdf 등)을 명시적으로 지정한 경우에만 예외로 한다.
