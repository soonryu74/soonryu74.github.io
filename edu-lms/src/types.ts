// DB 테이블과 1:1. 컬럼 이름은 supabase/migrations/0002_edu_lms.sql 을 따른다.

export interface Student {
  id: string
  email: string
  name: string | null
  phone: string | null
  org: string | null
  role: 'student' | 'admin'
  created_at: string
}

export interface Course {
  id: string
  title: string
  audience: string | null
  hours: number
  pass_rate: number
  requires_task: boolean
  sort: number
  active: boolean
}

export interface Lesson {
  id: string
  course_id: string
  seq: number
  module: string | null
  title: string
  summary: string | null
  video_url: string | null
  audio_url: string | null
  handout_url: string | null
  duration_sec: number
  done_rate: number
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  started_at: string
  ends_at: string | null
  paid: boolean
  paid_at: string | null
  note: string | null
  created_at: string
}

/** [시작초, 끝초] 구간. 겹치는 구간은 저장 전에 합쳐 둔다 */
export type Segment = [number, number]

export interface Progress {
  enrollment_id: string
  lesson_id: string
  segments: Segment[]
  watched_sec: number
  coverage: number
  completed: boolean
  completed_at: string | null
  last_pos: number
  updated_at: string
}

export interface Completion {
  enrollment_id: string
  attendance: number
  task_submitted: boolean
  cert_no: string | null
  issued_at: string
}
