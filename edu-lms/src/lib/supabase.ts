import { createClient } from '@supabase/supabase-js'

// korea-now와 같은 Supabase 프로젝트. 키는 공개용(publishable)이고 데이터는 RLS로 보호한다.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  // 강의실은 데모 모드가 없다. 설정이 빠지면 바로 알 수 있게 한다.
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 없습니다. .env.production 을 확인하세요.')
}

export const supabase = createClient(url, key, {
  auth: {
    // 이메일 링크로 돌아올 때 해시 라우터와 충돌하지 않게 PKCE 흐름을 쓴다
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
