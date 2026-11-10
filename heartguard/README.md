# 하트가드 — 심박 이상 안심 알림 (시제품)

이 앱은 의료기기가 아니며 응급 상황을 놓칠 수 있습니다. 심장질환 관리 용도로 쓰지 마세요.

- 기획서: `docs/heartguard-plan.md`
- 소스: `heartguard/app/` (Vite + React + TypeScript)
- 배포물: `heartguard/index.html`, `heartguard/assets/` (빌드 결과, GitHub Pages `/heartguard/`)

## 현재 단계

1~3단계 완료: 모의 모드, 판정 엔진과 단위 테스트, 메인·본인 확인·경보·기록·설정 화면.
워치 연결(4단계)과 보호자 알림(5~6단계)은 아직 없습니다. 기록은 기기에만 저장됩니다.

## 명령

`heartguard/app` 폴더에서 실행합니다. npm 명령은 윈도우와 맥이 같습니다.

| 작업 | 윈도우 (PowerShell) | 맥 (터미널) |
|---|---|---|
| 폴더 이동 | `cd heartguard\app` | `cd heartguard/app` |
| 설치 | `npm install` | `npm install` |
| 개발 서버 | `npm run dev` | `npm run dev` |
| 테스트 | `npm test` | `npm test` |
| 배포물 만들기 | `npm run build` | `npm run build` |

판정 기준값은 `app/src/config.ts` 한 곳에 있습니다.
