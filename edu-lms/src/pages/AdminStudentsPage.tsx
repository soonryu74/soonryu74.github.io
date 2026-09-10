import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { allCourses, allStudents, enroll as doEnroll, setPaid } from '../lib/db'
import type { Course, Enrollment, Student } from '../types'

type Row = Student & { enrollments: (Enrollment & { course: Pick<Course, 'id' | 'title'> })[] }

export default function AdminStudentsPage() {
  const { student } = useAuth()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [pick, setPick] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    try {
      const [s, c] = await Promise.all([allStudents(), allCourses()])
      setRows(s)
      setCourses(c)
    } catch {
      setErr('목록을 불러오지 못했습니다.')
    }
  }

  useEffect(() => { void load() }, [])

  if (student && student.role !== 'admin') {
    return <div className="wrap"><div className="warn"><p>관리자만 볼 수 있는 화면입니다.</p></div></div>
  }
  if (err) return <div className="wrap"><div className="warn"><p>{err}</p></div></div>
  if (!rows) return <div className="center">불러오는 중입니다</div>

  const add = async (studentId: string) => {
    const courseId = pick[studentId]
    if (!courseId) return
    try {
      await doEnroll(studentId, courseId)
      await load()
    } catch {
      setErr('과정을 배정하지 못했습니다. 이미 배정된 과정일 수 있습니다.')
    }
  }

  const toggle = async (enrollmentId: string, paid: boolean) => {
    try {
      await setPaid(enrollmentId, paid)
      await load()
    } catch {
      setErr('납부 표시를 바꾸지 못했습니다.')
    }
  }

  return (
    <div className="wrap">
      <div>
        <h1>수강생</h1>
        <p className="lead">
          첫 로그인을 하면 이 목록에 자동으로 올라옵니다. 과정을 배정하고 납부를 확인하시면 강의가 열립니다.
        </p>
      </div>

      <p className="muted">모두 {rows.length}명</p>

      <div className="list">
        {rows.map((s) => (
          <div key={s.id} className="card">
            <div className="row">
              <div className="grow">
                <b>{s.name ?? '이름 미입력'}</b>
                <span className="muted"> · {s.email}</span>
                {s.org && <span className="muted"> · {s.org}</span>}
                {s.role === 'admin' && <span className="pill part" style={{ marginLeft: '.5rem' }}>관리자</span>}
              </div>
              <div className="row">
                <select
                  value={pick[s.id] ?? ''}
                  onChange={(e) => setPick({ ...pick, [s.id]: e.target.value })}
                  style={{ width: 'auto' }}
                >
                  <option value="">과정 고르기</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <button type="button" className="btn small" onClick={() => void add(s.id)} disabled={!pick[s.id]}>
                  배정
                </button>
              </div>
            </div>

            {s.enrollments.length > 0 && (
              <div className="tw">
                <table>
                  <thead><tr><th>과정</th><th>시작일</th><th>납부</th><th /></tr></thead>
                  <tbody>
                    {s.enrollments.map((e) => (
                      <tr key={e.id}>
                        <td>{e.course.title}</td>
                        <td>{e.started_at}</td>
                        <td>{e.paid ? <span className="pill done">확인</span> : <span className="pill wait">대기</span>}</td>
                        <td>
                          <button type="button" className="btn ghost small" onClick={() => void toggle(e.id, !e.paid)}>
                            {e.paid ? '납부 취소' : '납부 확인'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
