// 관광지 55곳을 각각 '검색되는 주소'로 만들어 준다.
//
// 왜 필요한가
//   앱은 자바스크립트로 화면을 그리고 주소가 /#/spot/경복궁 형태다.
//   구글은 자바스크립트를 실행해 색인하지만 공식 문서에 지연이 있다고 적혀 있고,
//   주소의 # 뒤쪽은 아예 별개 페이지로 세지 않는다.
//   그래서 55개의 검색 기회가 주소 1개로 눌려 있다.
//
//   이 스크립트는 vite build 뒤에 돌면서 장소마다 진짜 HTML 파일을 만든다.
//   자바스크립트 없이도 요금·운영시간·휴관일이 그대로 보이므로 바로 색인된다.
//   사람이 검색으로 들어와도 쓸모 있는 내용이라 이른바 '빈 껍데기 페이지'가 아니다.
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build as esbuild } from 'esbuild'
import { BASE, ORIGIN } from '../site.config.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const dist = join(root, 'dist')
const SITE = ORIGIN   // 배포 주소는 site.config.mjs 한 곳에서만 정한다

// ── 데이터 읽기 ──────────────────────────────────────────────
// spots.ts는 타입스크립트라 그냥 import할 수 없다. esbuild로 잠깐 옮겨 담아 읽는다.
// 타입스크립트 원본을 잠깐 자바스크립트로 바꿔 node 가 읽게 한다.
async function loadTs(relPath) {
  const tmp = join(dist, `_${relPath.replace(/[^a-z0-9]/gi, '_')}.tmp.mjs`)
  await esbuild({
    entryPoints: [join(root, relPath)],
    outfile: tmp,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  })
  const mod = await import(`file://${tmp}?t=${Date.now()}`)
  await rm(tmp, { force: true })
  return mod
}

// ── 표시용 형식 ──────────────────────────────────────────────
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const won = (n) => (n === 0 ? 'Free' : `₩${n.toLocaleString('en-US')}`)

const closedLabel = (s) => {
  if (s.closedDays.length === 0) return s.closedNote ?? 'Open daily'
  const names = s.closedDays.map((d) => `${DAY[d]}s`).join(', ')
  return s.closedNote ? `${names} · ${s.closedNote}` : names
}

const englishLabel = (v) =>
  v === 'good' ? 'Signs and staff in English' : v === 'some' ? 'English signs, some staff' : 'Little English — use a translation app'

const esc = (v) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── 지면 ────────────────────────────────────────────────────
const CSS = `
:root{--teal:#0f766e;--teal-deep:#0a544e;--ink:#111827;--soft:#4b5563;--faint:#6b7280;--line:#e5e7eb;--bg:#f6f7f8;--card:#fff;--free:#15803d;color-scheme:light}
@media(prefers-color-scheme:dark){:root{--teal:#4cb5a8;--teal-deep:#7ad3c6;--ink:#e8efec;--soft:#a6b6b1;--faint:#7f8f8a;--line:#25322f;--bg:#0c1211;--card:#131b19;--free:#4ade80;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:680px;margin:0 auto;padding:0 20px 72px}
header{padding:22px 0 0}
.brand{font-size:15px;font-weight:800;letter-spacing:-.2px;color:var(--ink);text-decoration:none}
.brand span{color:var(--teal)}
.crumb{font-size:13px;color:var(--faint);margin-top:14px}
.crumb a{color:var(--faint)}
h1{font-size:clamp(27px,6vw,36px);line-height:1.18;margin:10px 0 4px;letter-spacing:-.4px;text-wrap:balance}
.ko{font-size:17px;color:var(--soft);margin:0 0 18px}
.lede{font-size:17px;color:var(--soft);margin:0 0 22px;max-width:60ch}
.cta{display:inline-block;background:var(--teal);color:#fff;text-decoration:none;font-weight:700;font-size:15.5px;padding:13px 22px;border-radius:12px}
.cta-note{font-size:13px;color:var(--faint);margin:9px 0 0}
.facts{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:6px 18px;margin:26px 0}
.row{display:grid;grid-template-columns:128px 1fr;gap:14px;padding:13px 0;border-bottom:1px solid var(--line)}
.row:last-child{border-bottom:none}
.row dt{color:var(--faint);font-size:13px;margin:0}
.row dd{margin:0;font-size:15.5px}
.row dd small{display:block;color:var(--faint);font-size:13px;font-weight:400;margin-top:2px}
.free{color:var(--free);font-weight:700}
.tip{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--teal);border-radius:0 12px 12px 0;padding:15px 18px;margin:22px 0;font-size:15.5px}
.tip b{color:var(--teal-deep)}
h2{font-size:19px;margin:34px 0 12px;letter-spacing:-.2px}
.near{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.near a{display:flex;justify-content:space-between;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:11px;padding:12px 15px;text-decoration:none;color:var(--ink);font-size:15px}
.near .d{color:var(--faint);font-size:13.5px;white-space:nowrap}
footer{margin-top:44px;padding-top:18px;border-top:1px solid var(--line);font-size:12.5px;color:var(--faint);line-height:1.65}
footer a{color:var(--faint)}
a{color:var(--teal-deep)}
`

function quietDayRow(s, rhythm) {
  const r = rhythm[s.lDong?.signgu ?? '']
  if (!r) return { row: '', line: '' }
  // 데이터랩 배열은 월요일부터, closedDays 는 일요일이 0 이다.
  const NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const closed = new Set(s.closedDays ?? [])
  const days = r.idx.map((index, i) => ({ jsDay: (i + 1) % 7, index }))
  const open = days.filter((d) => !closed.has(d.jsDay))
  if (!open.length) return { row: '', line: '' }
  const best = open.reduce((a, b) => (b.index < a.index ? b : a))
  const busiest = open.reduce((a, b) => (b.index > a.index ? b : a))
  const delta = 100 - best.index
  const note = delta > 0 ? ` — about ${delta}% fewer foreign visitors than an average day` : ''
  return {
    row: `<div class="row"><dt>Quietest day</dt><dd>${esc(NAME[best.jsDay])}${esc(note)}<small>Busiest: ${esc(
      NAME[busiest.jsDay],
    )}. Based on Korea Tourism Data Lab foreign-visitor counts for ${esc(r.gu)}.</small></dd></div>`,
    line: `${NAME[best.jsDay]} is usually the quietest day to visit; ${NAME[busiest.jsDay]} is the busiest.`,
  }
}

function spotPage(s, all, dist2, rhythm) {
  const url = `${SITE}${BASE}/spot/${s.id}/`
  // 앱으로 들어가는 링크는 상대 주소여야 한다. 절대 주소로 두면 미리보기나 다른 호스트에서 깨진다.
  const appUrl = `${BASE}/#/spot/${s.id}`
  const fee = won(s.fee.adult)
  const hours = s.hours ? `${s.hours.open} – ${s.hours.close}` : 'Open at any hour'
  const closed = closedLabel(s)
  const quiet = quietDayRow(s, rhythm)

  const title = `${s.name} — hours, admission & when to go | Korea Now`
  const desc =
    `${s.name} (${s.nameKo}): admission ${fee}, open ${hours}. ` +
    `Closed ${s.closedDays.length ? closed.split(' · ')[0] : 'never'}. ` +
    (quiet.line ? `${quiet.line} ` : '') +
    `See how crowded it is right now before you go.`

  // 가까운 곳 5군데 — 사람에게도 쓸모 있고, 검색엔진이 사이트를 훑는 길도 된다
  const near = dist2
    .filter((x) => x.s.id !== s.id)
    .slice(0, 5)
    .map(
      ({ s: n, km }) =>
        `<li><a href="${BASE}/spot/${n.id}/"><span>${esc(n.name)}</span><span class="d">${
          km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
        }</span></a></li>`,
    )
    .join('')

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: s.name,
    alternateName: s.nameKo,
    url,
    geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
    address: { '@type': 'PostalAddress', addressCountry: 'KR' },
    isAccessibleForFree: s.fee.adult === 0,
    publicAccess: true,
    ...(s.hours
      ? {
          openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            opens: s.hours.open,
            closes: s.hours.close,
          },
        }
      : {}),
    ...(s.fee.adult > 0
      ? {
          offers: {
            '@type': 'Offer',
            price: s.fee.adult,
            priceCurrency: 'KRW',
            category: 'Admission',
          },
        }
      : {}),
  }

  const crumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Korea Now', item: `${SITE}${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'Places', item: `${SITE}${BASE}/spot/` },
      { '@type': 'ListItem', position: 3, name: s.name, item: url },
    ],
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0f766e">
<link rel="icon" type="image/svg+xml" href="${BASE}/favicon.svg">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(s.name)} — ${esc(fee)} · ${esc(hours)}">
<meta property="og:description" content="${esc(s.tip)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}${BASE}/icons/icon-512.png">
<meta name="twitter:card" content="summary">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(crumb)}</script>
</head>
<body>
<div class="wrap">
<header>
  <a class="brand" href="${BASE}/">Korea <span>Now</span></a>
  <nav class="crumb"><a href="${BASE}/spot/">All places</a> › ${esc(s.regionLabel)}</nav>
</header>

<h1>${esc(s.name)}</h1>
<p class="ko">${esc(s.nameKo)} · ${esc(s.categoryLabel)} · ${esc(s.regionLabel)}</p>

<p class="lede">${esc(s.tip)}</p>

<a class="cta" href="${appUrl}">Check how busy it is right now →</a>
<p class="cta-note">Live crowd levels for Seoul, 14-day forecast elsewhere. No sign-up.</p>

<dl class="facts">
  <div class="row"><dt>Admission</dt><dd>${
    s.fee.adult === 0 ? '<span class="free">Free</span>' : esc(fee)
  }${s.fee.note ? `<small>${esc(s.fee.note)}</small>` : ''}</dd></div>
  <div class="row"><dt>Opening hours</dt><dd>${esc(hours)}${
    s.hoursNote ? `<small>${esc(s.hoursNote)}</small>` : ''
  }</dd></div>
  <div class="row"><dt>Closed</dt><dd>${esc(closed)}</dd></div>
  ${quiet.row}
  <div class="row"><dt>Payment</dt><dd>${
    s.cardOk ? 'Cards accepted' : 'Cash only — bring small bills'
  }</dd></div>
  <div class="row"><dt>English</dt><dd>${esc(englishLabel(s.english))}</dd></div>
  ${
    s.station
      ? `<div class="row"><dt>Nearest subway</dt><dd>${esc(s.station.nameEn)} Station (${esc(
          s.station.name,
        )}역) · Line ${esc(s.station.lines.join(', '))}<small>About ${
          s.station.walkMin
        } minutes on foot</small></dd></div>`
      : ''
  }
  <div class="row"><dt>Fee checked</dt><dd>${esc(s.feeCheckedAt)}</dd></div>
</dl>

<div class="tip"><b>Show this to a taxi driver</b> — ${esc(s.nameKo)}</div>

<h2>Getting there</h2>
<p>
  <a href="https://www.google.com/maps/search/?api=1&amp;query=${s.lat},${s.lng}" rel="noopener">Google Maps</a> ·
  <a href="https://map.naver.com/p/search/${encodeURIComponent(s.nameKo)}" rel="noopener">Naver Map</a> ·
  <a href="https://map.kakao.com/link/map/${encodeURIComponent(s.nameKo)},${s.lat},${s.lng}" rel="noopener">Kakao Map</a>
</p>
<p style="font-size:14.5px;color:var(--faint)">
  Google Maps shows public transport in Korea but not walking routes. Naver or Kakao Map gives walking directions.
</p>

<h2>Near here</h2>
<ul class="near">${near}</ul>

<footer>
  <a href="${BASE}/">Korea Now</a> shows how crowded a place is before you go, plus admission, opening hours and closed days.<br>
  Crowd levels for Seoul come from Seoul city open data; elsewhere from a Korea Tourism Organization forecast.
  Fees and hours are checked periodically — confirm at the gate for paid attractions.
</footer>
</div>
</body>
</html>`
}

function hubPage(spots, regions) {
  const byRegion = regions
    .filter((r) => r.id !== 'all')
    .map((r) => {
      const list = spots.filter((s) => s.region === r.id)
      if (!list.length) return ''
      const items = list
        .map(
          (s) =>
            `<li><a href="${BASE}/spot/${s.id}/"><span>${esc(s.name)} <small style="color:var(--faint)">${esc(
              s.nameKo,
            )}</small></span><span class="d">${s.fee.adult === 0 ? 'Free' : won(s.fee.adult)}</span></a></li>`,
        )
        .join('')
      return `<h2>${esc(r.label)}</h2><ul class="near">${items}</ul>`
    })
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Places to visit in Korea — admission, hours & crowd levels | Korea Now</title>
<meta name="description" content="Admission fees, opening hours and closed days for ${spots.length} places across Korea, with live crowd levels so you can go when it is quiet.">
<link rel="canonical" href="${SITE}${BASE}/spot/">
<meta name="theme-color" content="#0f766e">
<link rel="icon" type="image/svg+xml" href="${BASE}/favicon.svg">
<meta property="og:title" content="Places to visit in Korea — fees, hours & crowd levels">
<meta property="og:description" content="${spots.length} places with admission, opening hours, closed days and live crowd levels.">
<meta property="og:url" content="${SITE}${BASE}/spot/">
<meta property="og:image" content="${SITE}${BASE}/icons/icon-512.png">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<header><a class="brand" href="${BASE}/">Korea <span>Now</span></a></header>
<h1>Places to visit in Korea</h1>
<p class="lede">
  Admission, opening hours and closed days for ${spots.length} places — and how crowded each one is right now,
  so you can go when it is quiet.
</p>
<a class="cta" href="${BASE}/">Open the live map →</a>
${byRegion}
<footer><a href="${BASE}/">Korea Now</a> · Go when it's quiet.</footer>
</div>
</body>
</html>`
}

// ── 실행 ────────────────────────────────────────────────────
const R = 6371
const rad = (d) => (d * Math.PI) / 180
function km(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

const { SPOTS, REGIONS, CATEGORY_LABEL } = await loadTs('src/data/spots.ts')
const { VISITOR_RHYTHM } = await loadTs('src/data/visitorRhythm.ts')
const regionLabel = Object.fromEntries(REGIONS.map((r) => [r.id, r.label]))

const enriched = SPOTS.map((s) => ({
  ...s,
  regionLabel: regionLabel[s.region] ?? s.region,
  categoryLabel: CATEGORY_LABEL[s.category] ?? s.category,
}))

for (const s of enriched) {
  const near = enriched
    .map((x) => ({ s: x, km: km(s, x) }))
    .sort((a, b) => a.km - b.km)
  const dir = join(dist, 'spot', s.id)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'index.html'), spotPage(s, enriched, near, VISITOR_RHYTHM), 'utf8')
}

await writeFile(join(dist, 'spot', 'index.html'), hubPage(enriched, REGIONS), 'utf8')

// robots.txt — 도메인 루트에 올릴 때를 위한 것.
// 하위 경로(/korea-now/)로 배포하면 크롤러는 사이트 루트의 robots.txt만 읽으므로 이 파일은 무시된다.
// 둘 중 어디에 올리든 맞도록 함께 만들어 둔다.
await writeFile(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}${BASE}/sitemap.xml\n`,
  'utf8',
)

// 사이트맵 — 앱 첫 화면, 목록, 장소 55개
const today = new Date().toISOString().slice(0, 10)
const urls = [
  { loc: `${SITE}${BASE}/`, pri: '1.0', freq: 'daily' },
  { loc: `${SITE}${BASE}/spot/`, pri: '0.9', freq: 'weekly' },
  ...enriched.map((s) => ({ loc: `${SITE}${BASE}/spot/${s.id}/`, pri: '0.8', freq: 'weekly' })),
]
await writeFile(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`,
  )
  .join('\n')}
</urlset>
`,
  'utf8',
)

console.log(`정적 페이지 ${enriched.length}개 + 목록 1개 + 사이트맵 생성 완료`)
