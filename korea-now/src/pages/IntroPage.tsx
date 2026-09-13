// 첫 실행 때 한 번 보여주는 안내. 기능을 나열하지 않고, 이 앱이 무엇을 하려는 것인지만 적는다.
// 처음 온 사람은 설명을 읽지 않는다. 그래서 짧아야 하고, 건너뛸 수 있어야 한다.
import { useNavigate } from 'react-router-dom'
import { markIntroSeen } from '../lib/intro'

const TABS = [
  { ic: '🗺️', name: 'Home', text: 'Which places are quiet right now, and what each one costs to enter.' },
  { ic: '📍', name: 'Nearby', text: 'What is around you, with the walk in minutes.' },
  { ic: '🇰🇷', name: 'Today', text: 'One Korean phrase, one custom worth knowing, and the won in your own currency.' },
  { ic: '🎫', name: 'Stamps', text: 'A record of where you went. It stays on your phone.' },
]

export default function IntroPage() {
  const nav = useNavigate()
  const leave = () => {
    markIntroSeen()
    nav('/', { replace: true })
  }

  return (
    <main className="intro">
      <button className="intro-skip" onClick={leave}>Skip</button>

      <p className="intro-eyebrow">Before you start</p>
      <h1 className="intro-title">Korea is not crowded everywhere.</h1>

      <div className="intro-body">
        <p>
          It is crowded in <em>certain places</em>, at <em>certain hours</em>, on <em>certain days</em>.
          Most of that can be known ahead of time. It simply isn't written down anywhere a visitor can read.
        </p>
        <p>This app is that writing-down.</p>
      </div>

      <ul className="intro-tabs">
        {TABS.map((t) => (
          <li key={t.name}>
            <span className="ic" aria-hidden="true">{t.ic}</span>
            <div>
              <strong>{t.name}</strong>
              <span>{t.text}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="intro-notes">
        <p><strong>Free, and no account.</strong> Nothing here asks who you are.</p>
        <p>
          <strong>The prices were checked by hand.</strong> Admission, opening hours and closed days
          for all 55 places, verified in September 2026. Korea changes them, so each page shows when it was last checked.
        </p>
        <p>
          <strong>The crowd figures come from Korean public data</strong> — the city of Seoul's live
          readings and the Korea Tourism Organization's visitor counts. Where a number is an estimate
          rather than a headcount, the app says so on the spot.
        </p>
      </div>

      <button className="intro-start" onClick={leave}>Start →</button>
      <p className="intro-foot">You can reopen this from the Today tab.</p>
    </main>
  )
}
