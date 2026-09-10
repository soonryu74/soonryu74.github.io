import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { enrollment as getEnrollment, lessonsOf, progressOf } from '../lib/db'
import type { Course, Enrollment, Lesson, Progress } from '../types'

export default function AttendancePage() {
  const { enrollmentId = '' } = useParams()
  const [enroll, setEnroll] = useState<(Enrollment & { course: Course }) | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const e = await getEnrollment(enrollmentId)
        const [ls, ps] = await Promise.all([lessonsOf(e.course_id), progressOf(enrollmentId)])
        setEnroll(e)
        setLessons(ls)
        setProgress(ps)
      } catch {
        setErr('출석 현황을 불러오지 못했습니다.')
      }
    })()
  }, [enrollmentId])

  if (err) return <div className="wrap"><div className="warn"><p>{err}</p></div></div>
  if (!enroll) return <div className="center">불러오는 중입니다</div>

  const done = progress.filter((p) => p.completed).length
  const need = Math.ceil(Number(enroll.course.pass_rate) * lessons.length)
  const ok = done >= need

  return (
    <div className="wrap">
      <p className="crumb"><Link to="/">내 강의실</Link> › 출석 현황</p>

      <div>
        <h1>출석 현황</h1>
        <p className="lead">{enroll.course.title} · 전체 {lessons.length}회차</p>
      </div>

      <div className="card">
        <div className="row">
          <div className="grow">
            <p className="muted">이수한 회차</p>
            <span className="big">{done}</span>
            <span className="muted"> / {lessons.length}회차</span>
          </div>
          <div className="grow">
            <p className="muted">수료 요건</p>
            <span className="big">{need}</span>
            <span className="muted">회차 이상</span>
          </div>
          <div>
            {ok
              ? <span className="pill done">출석 요건 충족</span>
              : <span className="pill part">{need - done}회차 남음</span>}
          </div>
        </div>
        {enroll.course.requires_task && (
          <div className="note"><p>이 과정은 출석 외에 <b>결과물 제출</b>이 수료 요건입니다.</p></div>
        )}
      </div>

      <div className="tw">
        <table>
          <thead>
            <tr><th>회차</th><th>제목</th><th>시청</th><th>상태</th></tr>
          </thead>
          <tbody>
            {lessons.map((l) => {
              const p = progress.find((x) => x.lesson_id === l.id)
              const pct = Math.round(Number(p?.coverage ?? 0) * 100)
              return (
                <tr key={l.id}>
                  <td className="c">{l.seq}</td>
                  <td style={{ whiteSpace: 'normal' }}>{l.title}</td>
                  <td className="c">{pct}퍼센트</td>
                  <td>
                    {p?.completed
                      ? <span className="pill done">이수</span>
                      : pct > 0
                        ? <span className="pill part">보는 중</span>
                        : <span className="pill none">아직</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="note">
        <p>
          <b>세는 방법.</b> 한 회차를 90퍼센트 이상 보시면 그 회차를 이수한 것으로 처리합니다.
          건너뛴 구간은 세지 않습니다. 배속으로 보셔도 되고, 그때도 영상 시간을 기준으로 셉니다.
        </p>
      </div>
    </div>
  )
}
