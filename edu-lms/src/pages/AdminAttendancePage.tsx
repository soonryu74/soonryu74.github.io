import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { allCourses, attendanceSheet } from '../lib/db'
import type { Course } from '../types'

type Sheet = Awaited<ReturnType<typeof attendanceSheet>>

export default function AdminAttendancePage() {
  const { student } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [courseId, setCourseId] = useState('')
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    allCourses().then((c) => {
      setCourses(c)
      if (c.length) setCourseId(c[0].id)
    }).catch(() => setErr('과정 목록을 불러오지 못했습니다.'))
  }, [])

  useEffect(() => {
    if (!courseId) return
    setSheet(null)
    attendanceSheet(courseId).then(setSheet).catch(() => setErr('출석표를 불러오지 못했습니다.'))
  }, [courseId])

  if (student && student.role !== 'admin') {
    return <div className="wrap"><div className="warn"><p>관리자만 볼 수 있는 화면입니다.</p></div></div>
  }
  if (err) return <div className="wrap"><div className="warn"><p>{err}</p></div></div>

  // 기관 담당자에게 회신할 때 쓰는 표. 붙여 넣으면 표가 되는 형식으로 내려준다.
  const download = () => {
    if (!sheet) return
    const head = ['성명', '이메일', '소속', ...sheet.lessons.map((l) => `${l.seq}회차`), '이수', '전체']
    const body = sheet.rows.map((r) => {
      const cells = sheet.lessons.map((l) => {
        const p = r.progress.find((x) => x.lesson_id === l.id)
        return p?.completed ? 'O' : p && Number(p.coverage) > 0 ? `${Math.round(Number(p.coverage) * 100)}%` : ''
      })
      const done = r.progress.filter((p) => p.completed).length
      return [r.student.name ?? '', r.student.email, r.student.org ?? '', ...cells, String(done), String(sheet.lessons.length)]
    })
    const tsv = [head, ...body].map((r) => r.join('\t')).join('\n')
    const title = courses.find((c) => c.id === courseId)?.title ?? courseId
    // 브라우저 내려받기가 막히는 환경도 있어 클립보드를 먼저 쓴다
    navigator.clipboard?.writeText(tsv).then(
      () => alert(`${title} 출석표를 복사했습니다. 엑셀이나 한글에 붙여 넣으세요.`),
      () => alert('복사에 실패했습니다. 화면의 표를 직접 선택해 복사해 주세요.'),
    )
  }

  return (
    <div className="wrap">
      <div>
        <h1>출석표</h1>
        <p className="lead">과정을 고르면 수강생별 회차 이수 현황이 나옵니다. 기관 회신용으로 복사할 수 있습니다.</p>
      </div>

      <div className="row">
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '.6rem' }}>
          과정
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ width: 'auto' }}>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
        <button type="button" className="btn ghost small" onClick={download} disabled={!sheet}>표 복사</button>
      </div>

      {!sheet ? (
        <div className="center">불러오는 중입니다</div>
      ) : sheet.rows.length === 0 ? (
        <div className="note"><p>이 과정에 배정된 수강생이 없습니다.</p></div>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>성명</th>
                <th>소속</th>
                {sheet.lessons.map((l) => <th key={l.id} className="c">{l.seq}</th>)}
                <th className="c">이수</th>
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((r) => {
                const done = r.progress.filter((p) => p.completed).length
                return (
                  <tr key={r.id}>
                    <td>{r.student.name ?? r.student.email}</td>
                    <td>{r.student.org ?? ''}</td>
                    {sheet.lessons.map((l) => {
                      const p = r.progress.find((x) => x.lesson_id === l.id)
                      return (
                        <td key={l.id} className="c">
                          {p?.completed ? 'O' : p && Number(p.coverage) > 0 ? `${Math.round(Number(p.coverage) * 100)}` : ''}
                        </td>
                      )
                    })}
                    <td className="c"><b>{done}</b> / {sheet.lessons.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
