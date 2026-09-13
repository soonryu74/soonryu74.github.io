// 한국관광 데이터랩 — 기초지자체(시군구) 방문자수 내려받기
//  · data.go.kr 15101972 (B551011/DataLabService/locgoRegnVisitrDDList)
//  · 쓰는 값은 touDivCd='3'(외국인)뿐이지만, 나중에 쓸 수 있게 원본을 통째로 저장한다.
//  · 데이터는 한 달쯤 늦게 올라온다. 끝 날짜를 오늘로 잡으면 빈 응답이 온다.
//
// 실행:  DATA_GO_KR_KEY='...' node scripts/fetch-visitors.mjs 20260518 20260809
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = process.env.DATA_GO_KR_KEY
if (!KEY) {
  console.error('DATA_GO_KR_KEY 환경변수가 없습니다.')
  console.error("  Windows(PowerShell):  $env:DATA_GO_KR_KEY='발급받은키'; node scripts/fetch-visitors.mjs 20260518 20260809")
  console.error("  macOS/Linux:          DATA_GO_KR_KEY='발급받은키' node scripts/fetch-visitors.mjs 20260518 20260809")
  process.exit(1)
}

const [from, to] = process.argv.slice(2)
if (!/^\d{8}$/.test(from ?? '') || !/^\d{8}$/.test(to ?? '')) {
  console.error('사용법: node scripts/fetch-visitors.mjs <시작 YYYYMMDD> <끝 YYYYMMDD>')
  process.exit(1)
}

const OP = 'https://apis.data.go.kr/B551011/DataLabService/locgoRegnVisitrDDList'
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
const parse = (s) => new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}T00:00:00Z`)
const shift = (d, n) => new Date(d.getTime() + n * 864e5)

// 하루치가 약 807건이므로 일주일씩 끊어 받는다. 한 번에 다 받으면 응답이 잘린다.
async function week(start, end) {
  const url = `${OP}?serviceKey=${KEY}&numOfRows=6000&pageNo=1`
    + `&MobileOS=ETC&MobileApp=KoreaNow&_type=json&startYmd=${ymd(start)}&endYmd=${ymd(end)}`
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url)
      const json = await res.json()
      const items = json?.response?.body?.items?.item
      if (Array.isArray(items) && items.length) return items
      throw new Error(JSON.stringify(json).slice(0, 200))
    } catch (err) {
      if (attempt >= 5) throw err
      await new Promise((r) => setTimeout(r, attempt * 2500))   // 공공 API는 가끔 연결을 끊는다
    }
  }
}

const last = parse(to)
const all = []
for (let cur = parse(from); cur <= last; cur = shift(cur, 7)) {
  const end = shift(cur, 6) > last ? last : shift(cur, 6)
  const rows = await week(cur, end)
  all.push(...rows)
  console.error(`${ymd(cur)}~${ymd(end)}  ${rows.length}건 (누적 ${all.length})`)
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'visitors.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(all))
console.error(`저장: ${out} (${all.length}건)`)
