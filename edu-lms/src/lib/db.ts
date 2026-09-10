import { supabase } from './supabase'
import type { Course, Enrollment, Lesson, Progress, Segment, Student } from '../types'
import { coverage, total } from './segments'

// 화면이 쓰는 질의를 한곳에 모은다. RLS가 권한을 걸러 주므로 여기서는 필터만 건다.

export async function myEnrollments(studentId: string) {
  const { data, error } = await supabase
    .from('edu_enrollments')
    .select('*, course:edu_courses(*)')
    .eq('student_id', studentId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as (Enrollment & { course: Course })[]
}

export async function lessonsOf(courseId: string) {
  const { data, error } = await supabase
    .from('edu_lessons').select('*').eq('course_id', courseId).order('seq')
  if (error) throw error
  return (data ?? []) as Lesson[]
}

export async function progressOf(enrollmentId: string) {
  const { data, error } = await supabase
    .from('edu_progress').select('*').eq('enrollment_id', enrollmentId)
  if (error) throw error
  return (data ?? []) as Progress[]
}

export async function lesson(lessonId: string) {
  const { data, error } = await supabase.from('edu_lessons').select('*').eq('id', lessonId).single()
  if (error) throw error
  return data as Lesson
}

export async function enrollment(enrollmentId: string) {
  const { data, error } = await supabase
    .from('edu_enrollments').select('*, course:edu_courses(*)').eq('id', enrollmentId).single()
  if (error) throw error
  return data as Enrollment & { course: Course }
}

/** 시청 구간을 저장한다. coverage와 completed는 여기서 계산해 함께 쓴다 */
export async function saveProgress(
  enrollmentId: string, lesson: Lesson, segments: Segment[], lastPos: number, prev?: Progress | null,
) {
  const cov = coverage(segments, lesson.duration_sec)
  const done = cov >= Number(lesson.done_rate)
  const row = {
    enrollment_id: enrollmentId,
    lesson_id: lesson.id,
    segments,
    watched_sec: total(segments),
    coverage: Number(cov.toFixed(3)),
    completed: done || !!prev?.completed,
    completed_at: prev?.completed_at ?? (done ? new Date().toISOString() : null),
    last_pos: Math.floor(lastPos),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('edu_progress').upsert(row)
  if (error) throw error
  return row as Progress
}

// ── 관리자 ──
export async function allStudents() {
  const { data, error } = await supabase
    .from('edu_students')
    .select('*, enrollments:edu_enrollments(*, course:edu_courses(id,title))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as (Student & { enrollments: (Enrollment & { course: Pick<Course, 'id' | 'title'> })[] })[]
}

export async function allCourses() {
  const { data, error } = await supabase.from('edu_courses').select('*').order('sort')
  if (error) throw error
  return (data ?? []) as Course[]
}

export async function enroll(studentId: string, courseId: string) {
  const { error } = await supabase.from('edu_enrollments').insert({ student_id: studentId, course_id: courseId })
  if (error) throw error
}

export async function setPaid(enrollmentId: string, paid: boolean) {
  const { error } = await supabase
    .from('edu_enrollments')
    .update({ paid, paid_at: paid ? new Date().toISOString() : null })
    .eq('id', enrollmentId)
  if (error) throw error
}

/** 과정 하나의 출석표: 수강생 × 회차 */
export async function attendanceSheet(courseId: string) {
  const [{ data: enr, error: e1 }, lessons] = await Promise.all([
    supabase
      .from('edu_enrollments')
      .select('*, student:edu_students(id,email,name,org), progress:edu_progress(lesson_id,completed,coverage)')
      .eq('course_id', courseId)
      .order('created_at'),
    lessonsOf(courseId),
  ])
  if (e1) throw e1
  type Row = Enrollment & {
    student: Pick<Student, 'id' | 'email' | 'name' | 'org'>
    progress: Pick<Progress, 'lesson_id' | 'completed' | 'coverage'>[]
  }
  return { rows: (enr ?? []) as Row[], lessons }
}
