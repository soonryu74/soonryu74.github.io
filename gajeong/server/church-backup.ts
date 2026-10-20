// 목장 나눔터 — 매일 자동 백업 (Supabase Edge Function: church-backup, verify_jwt=false)
//  · 하루에 한 번, 모든 교회 자료를 JSON 한 파일로 떠서 비공개 저장소(church-backup)에 둔다: daily/YYYY-MM-DD.json
//  · 성도·계정 사진은 photos/ 아래에 한 번씩만 복사해 둔다 (바뀐 사진은 다시 복사)
//  · 30일 지난 백업 파일은 지운다
//  · 누가 불러도 '오늘 백업이 없으면 만든다'만 하고, 자료는 돌려주지 않는다 (GitHub Actions가 매일 부른다)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
const BUCKET = 'church-backup'
const PHOTO_BUCKET = 'church-member-photo'
const KEEP_DAYS = 30
const TABLES = ['church_church', 'church_profile', 'church_mokjang', 'church_mokwon',
  'church_journal', 'church_prayer', 'church_comment']

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })

// 1000줄씩 끊어서 다 읽는다
async function all(table: string) {
  const rows: unknown[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select('*').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) return rows
  }
}

// 폴더 안 파일 이름 전부 (사진은 교회 id 폴더마다 있다)
async function list(bucket: string, prefix: string) {
  const out: { name: string; updated_at?: string }[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset })
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

async function ensureBucket() {
  const { data } = await admin.storage.getBucket(BUCKET)
  if (data) return
  const { error } = await admin.storage.createBucket(BUCKET, { public: false })
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST만 받습니다' }, 405)
  try {
    await ensureBucket()
    const day = new Date().toISOString().slice(0, 10)
    const file = `daily/${day}.json`
    const done = (await list(BUCKET, 'daily')).some((f) => f.name === `${day}.json`)

    let counts: Record<string, number> = {}
    if (!done) {
      const dump: Record<string, unknown> = { made_at: new Date().toISOString() }
      for (const t of TABLES) { dump[t] = await all(t); counts[t] = (dump[t] as unknown[]).length }
      const { error } = await admin.storage.from(BUCKET)
        .upload(file, new Blob([JSON.stringify(dump)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
      if (error) throw new Error(error.message)
    }

    // 사진: 백업에 없거나 원본이 더 새로우면 복사
    let photos = 0
    const have = new Map<string, string>()
    for (const dir of await list(BUCKET, 'photos')) {
      for (const f of await list(BUCKET, `photos/${dir.name}`)) have.set(`${dir.name}/${f.name}`, f.updated_at ?? '')
    }
    for (const dir of await list(PHOTO_BUCKET, '')) {
      for (const f of await list(PHOTO_BUCKET, dir.name)) {
        const key = `${dir.name}/${f.name}`
        if (have.has(key) && (have.get(key) ?? '') >= (f.updated_at ?? '')) continue
        const { data: blob } = await admin.storage.from(PHOTO_BUCKET).download(key)
        if (!blob) continue
        await admin.storage.from(BUCKET).upload(`photos/${key}`, blob, { upsert: true, contentType: 'image/jpeg' })
        photos++
      }
    }

    // 오래된 백업 지우기
    const cut = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10)
    const old = (await list(BUCKET, 'daily')).map((f) => f.name).filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n) && n.slice(0, 10) < cut)
    if (old.length) await admin.storage.from(BUCKET).remove(old.map((n) => `daily/${n}`))

    return json({ ok: true, day, made: !done, counts, photos_copied: photos, removed: old.length })
  } catch (e) {
    console.error('backup', e)
    return json({ error: '백업하지 못했습니다' }, 500)
  }
})
