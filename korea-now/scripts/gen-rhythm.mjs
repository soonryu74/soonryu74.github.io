// .cache/visitors.json → src/data/visitorRhythm.ts
//  · 시군구별로 '외국인 방문자'가 요일마다 얼마나 몰리는지를 지수(평균=100)로 바꾼다.
//  · 앱이 쓰는 22개 시군구만 남긴다. 전국 299개를 다 넣으면 번들만 커진다.
//
// 실행:  node scripts/gen-rhythm.mjs   (앞서 fetch-visitors.mjs를 돌려 둘 것)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build as esbuild } from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// 데이터랩은 시군구 이름을 한글로만 준다. 앱은 영어라 표기용 이름을 따로 둔다.
// 서울 중구와 부산 중구, 인천 중구가 모두 '중구'라 도시 이름을 붙여 구분한다.
const GU_EN = {
  '11110': 'Jongno-gu, Seoul',      '11140': 'Jung-gu, Seoul',
  '11170': 'Yongsan-gu, Seoul',     '11200': 'Seongdong-gu, Seoul',
  '11440': 'Mapo-gu, Seoul',        '11560': 'Yeongdeungpo-gu, Seoul',
  '11680': 'Gangnam-gu, Seoul',     '11710': 'Songpa-gu, Seoul',
  '26110': 'Jung-gu, Busan',        '26350': 'Haeundae-gu, Busan',
  '26380': 'Saha-gu, Busan',        '26500': 'Suyeong-gu, Busan',
  '26710': 'Gijang-gun, Busan',     '28110': 'Jung-gu, Incheon',
  '41115': 'Paldal-gu, Suwon',      '47130': 'Gyeongju',
  '50110': 'Jeju City',             '50130': 'Seogwipo',
  '51110': 'Chuncheon',             '51150': 'Gangneung',
  '51210': 'Sokcho',                '52111': 'Wansan-gu, Jeonju',
}

const DAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']   // 0=월 … 6=일

let rows
try {
  rows = JSON.parse(readFileSync(join(root, '.cache/visitors.json'), 'utf8'))
} catch {
  console.error('.cache/visitors.json 이 없습니다. 먼저 scripts/fetch-visitors.mjs 를 실행하세요.')
  process.exit(1)
}

// spots.ts 는 타입스크립트라 node 가 그대로 못 읽는다. 잠깐 자바스크립트로 바꿔 불러온다.
const tmp = join(root, 'src/data/.spots.tmp.mjs')
await esbuild({ entryPoints: [join(root, 'src/data/spots.ts')], outfile: tmp, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' })
const { SPOTS } = await import(`file://${tmp}?t=${Date.now()}`)
const { rm } = await import('node:fs/promises')
await rm(tmp, { force: true })

const wanted = new Set(SPOTS.map((s) => s.lDong.signgu))
const bucket = {}
const dates = new Set()
for (const r of rows) {
  if (r.touDivCd !== '3' || !wanted.has(r.signguCode)) continue   // 3 = 외국인
  dates.add(r.baseYmd)
  const b = (bucket[r.signguCode] ??= { gu: r.signguNm, days: DAYS.map(() => []) })
  b.days[DAYS.indexOf(r.daywkDivNm)].push(Number(r.touNum))
}

const missing = [...wanted].filter((c) => !bucket[c])
if (missing.length) console.error('데이터 없는 시군구:', missing.join(', '))
const noEn = [...wanted].filter((c) => bucket[c] && !GU_EN[c])
if (noEn.length) console.error('영어 이름이 없는 시군구(GU_EN에 추가할 것):', noEn.join(', '))

const ymds = [...dates].sort()
const lines = Object.entries(bucket)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([code, b]) => {
    const avg = b.days.map((xs) => xs.reduce((p, c) => p + c, 0) / xs.length)
    const mean = avg.reduce((p, c) => p + c, 0) / 7
    const idx = avg.map((x) => Math.round((x / mean) * 100))
    const en = GU_EN[code] ?? b.gu
    return `  '${code}': { gu: '${en}', ko: '${b.gu}', idx: [${idx.join(', ')}] },`
  })

writeFileSync(join(root, 'src/data/visitorRhythm.ts'), `// 시군구별 '외국인 방문자' 요일 지수 — 100 = 그 시군구의 요일 평균
// 출처: 한국관광 데이터랩(한국관광공사) 기초지자체 방문자수 — SK텔레콤 이동통신 기반 외국인 추정치
//  · 집계 구간: ${ymds[0]} ~ ${ymds.at(-1)} (${ymds.length / 7}주)
//  · 이 파일은 scripts/gen-rhythm.mjs 가 만든다. 직접 고치지 말 것.
// 한계: 관광지가 아니라 시군구 단위 값이다. 개별 관광지의 혼잡도와 같지 않으며,
//       '어느 요일이 덜 붐비는 편인가'라는 경향으로만 써야 한다.
export const RHYTHM_PERIOD = { from: '${ymds[0]}', to: '${ymds.at(-1)}', weeks: ${ymds.length / 7} } as const

// 배열 순서는 [월, 화, 수, 목, 금, 토, 일]
export const VISITOR_RHYTHM: Record<string, { gu: string; ko: string; idx: number[] }> = {
${lines.join('\n')}
}
`)
console.error(`시군구 ${lines.length}개 · ${ymds.length}일분 → src/data/visitorRhythm.ts`)
