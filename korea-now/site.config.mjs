// 이 앱이 어느 주소에 올라가는지 — 한 곳에서만 정한다.
//
// 지금:            https://soonryu74.github.io/korea-now/
// 도메인을 사면:    https://korea-now.com/          (SITE_BASE 를 빈 값으로)
//
// 빌드할 때 환경변수로 덮어쓴다.
//   Windows(PowerShell):  $env:SITE_ORIGIN='https://korea-now.com'; $env:SITE_BASE=''; npm run build
//   macOS/Linux:          SITE_ORIGIN=https://korea-now.com SITE_BASE='' npm run build
//
// SITE_BASE 규칙: 앞에 '/' 를 붙이고 뒤에는 붙이지 않는다. 루트에 올릴 때는 빈 문자열.

export const ORIGIN = (process.env.SITE_ORIGIN ?? 'https://soonryu74.github.io').replace(/\/$/, '')
export const BASE = (process.env.SITE_BASE ?? '/korea-now').replace(/\/$/, '')

/** 에셋 경로에 쓰는 형태. 루트면 '/', 하위 경로면 '/korea-now/' */
export const BASE_SLASH = BASE === '' ? '/' : `${BASE}/`

/** 앱 안에서 쓰는 절대 주소 만들기. path 는 '/' 로 시작한다. */
export const url = (path = '/') => `${ORIGIN}${BASE}${path === '/' ? '/' : path}`
