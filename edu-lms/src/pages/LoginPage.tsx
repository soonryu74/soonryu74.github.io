import { useState } from 'react'
import { supabase } from '../lib/supabase'

// 비밀번호를 만들지 않는다. 50~70대 수강생에게 비밀번호 찾기가 가장 많은 문의가 되기 때문이다.
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // 링크를 누르면 이 주소로 돌아온다. 해시 라우터 앞의 물음표 부분으로 코드가 붙는다.
        emailRedirectTo: window.location.origin + '/edu/lms/',
      },
    })
    setBusy(false)
    if (error) setErr('메일을 보내지 못했습니다. 주소를 다시 확인해 주세요.')
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="wrap login">
        <h1>메일을 보냈습니다</h1>
        <div className="note">
          <p><b>{email}</b> 으로 들어오는 링크를 눌러 주세요. 비밀번호는 없습니다.</p>
        </div>
        <p className="muted">
          몇 분 안에 오지 않으면 스팸 메일함을 봐 주세요.
          그래도 없으면 <a href="mailto:soonryu74@gmail.com">soonryu74@gmail.com</a> 으로 알려 주세요.
        </p>
        <button type="button" className="btn ghost" onClick={() => setSent(false)}>다시 보내기</button>
      </div>
    )
  }

  return (
    <div className="wrap login">
      <h1>강의실 들어가기</h1>
      <p className="lead">
        수강 신청하실 때 적으신 이메일 주소를 넣어 주세요.
        그 주소로 들어오는 링크를 누르면 바로 들어옵니다.
      </p>
      <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          이메일 주소
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hong@example.com"
            autoComplete="email"
            required
          />
        </label>
        <button type="submit" className="btn" disabled={busy || !email.trim()}>
          {busy ? '보내는 중입니다' : '링크 받기'}
        </button>
      </form>
      {err && <div className="warn"><p>{err}</p></div>}
      <p className="muted">
        아직 수강 신청 전이시면 <a href="../admission.html">수강 안내</a>를 먼저 봐 주세요.
        설치 신고 전이라 지금은 접수를 받지 않습니다.
      </p>
    </div>
  )
}
