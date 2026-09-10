import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { lessonsOf, myEnrollments, progressOf } from '../lib/db'
import type { Course, Enrollment, Lesson, Progress } from '../types'

interface Row {
  enrollment: Enrollment & { course: Course }
  lessons: Lesson[]
  progress: Progress[]
}

export default function ClassroomPage() {
  const { session, student } = useAuth()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    ;(async () => {
      try {
        const enrolls = await myEnrollments(session.user.id)
        const built = await Promise.all(
          enrolls.map(async (enrollment) => ({
            enrollment,
            lessons: await lessonsOf(enrollment.course_id),
            progress: enrollment.paid ? await progressOf(enrollment.id) : [],
          })),
        )
        setRows(built)
      } catch {
        setErr('수강 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.')
      }
    })()
  }, [session])

  if (err) return <div className="wrap"><div className="warn"><p>{err}</p></div></div>
  if (!rows) return <div className="center">불러오는 중입니다</div>

  return (
    <div className="wrap">
      <div>
        <h1>내 강의실</h1>
        <p className="lead">
          {student?.name ? `${student.name}님, ` : ''}수강 중인 과정입니다.
          회차를 누르면 강의가 열립니다.
        </p>
      </div>

      {rows.length === 0 && (
        <div className="note">
          <p>아직 배정된 과정이 없습니다. 수강 신청과 학습비 납부가 확인되면 이 자리에 과정이 나타납니다.</p>
        </div>
      )}

      {rows.map(({ enrollment, lessons, progress }) => {
        const done = progress.filter((p) => p.completed).length
        const rate = lessons.length ? done / lessons.length : 0
        const need = Number(enrollment.course.pass_rate)
        return (
          <section key={enrollment.id} className="card">
            <div className="row">
              <div className="grow">
                <h2>{enrollment.course.title}</h2>
                <p className="muted">{enrollment.course.hours}시간 · 전체 {lessons.length}회차</p>
              </div>
              {enrollment.paid
                ? <Link className="btn ghost small" to={`/attendance/${enrollment.id}`}>출석 현황</Link>
                : <span className="pill wait">납부 확인 전</span>}
            </div>

            {enrollment.paid && (
              <>
                <div className="bar"><i style={{ width: `${Math.round(rate * 100)}%` }} /></div>
                <p className="muted">
                  {done}회차 이수 · 수료 기준 {Math.round(need * 100)}퍼센트
                  {rate >= need ? ' · 출석 요건을 채우셨습니다' : ` · ${Math.max(0, Math.ceil(need * lessons.length) - done)}회차 남았습니다`}
                </p>
                <div className="list">
                  {lessons.map((l) => {
                    const p = progress.find((x) => x.lesson_id === l.id)
                    const ready = !!l.video_url
                    return (
                      <Link
                        key={l.id}
                        className={`lesson${ready ? '' : ' off'}`}
                        to={`/lesson/${enrollment.id}/${l.id}`}
                      >
                        <span className="n">{l.seq}</span>
                        <span>
                          <span className="t">{l.title}</span>
                          {l.summary && <span className="s">{l.summary}</span>}
                        </span>
                        {!ready
                          ? <span className="pill none">준비 중</span>
                          : p?.completed
                            ? <span className="pill done">이수</span>
                            : p && p.coverage > 0
                              ? <span className="pill part">{Math.round(Number(p.coverage) * 100)}퍼센트</span>
                              : <span className="pill none">아직</span>}
                      </Link>
                    )
                  })}
                </div>
              </>
            )}

            {!enrollment.paid && (
              <div className="warn">
                <p>학습비 납부가 확인되면 강의가 열립니다. 확인에 하루 정도 걸립니다.</p>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
