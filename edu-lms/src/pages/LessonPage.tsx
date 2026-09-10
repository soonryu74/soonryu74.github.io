import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { enrollment as getEnrollment, lesson as getLesson, progressOf, saveProgress } from '../lib/db'
import { add } from '../lib/segments'
import type { Course, Enrollment, Lesson, Progress, Segment } from '../types'

// 출석 규칙은 docs/edu-lms-spec.md 를 따른다.
// - 재생 중 실제로 지나간 구간만 더한다 (건너뛴 구간은 넣지 않는다)
// - 30초마다 저장한다
const SAVE_EVERY_SEC = 30
// 이만큼보다 크게 시간이 뛰면 건너뛴 것으로 본다
const JUMP_SEC = 3

export default function LessonPage() {
  const { enrollmentId = '', lessonId = '' } = useParams()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [enroll, setEnroll] = useState<(Enrollment & { course: Course }) | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // 저장 사이에 쌓이는 값. 화면을 다시 그리지 않으려고 ref에 둔다.
  const segsRef = useRef<Segment[]>([])
  const resumeRef = useRef(0)
  const lastTimeRef = useRef(0)
  const sinceSaveRef = useRef(0)
  const prevRef = useRef<Progress | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [l, e, all] = await Promise.all([
          getLesson(lessonId),
          getEnrollment(enrollmentId),
          progressOf(enrollmentId),
        ])
        const p = all.find((x) => x.lesson_id === lessonId) ?? null
        setLesson(l)
        setEnroll(e)
        setProgress(p)
        prevRef.current = p
        segsRef.current = p?.segments ?? []
        resumeRef.current = p?.last_pos ?? 0
      } catch {
        setErr('강의를 불러오지 못했습니다.')
      }
    })()
  }, [enrollmentId, lessonId])

  const flush = useCallback(async () => {
    if (!lesson) return
    try {
      const saved = await saveProgress(
        enrollmentId, lesson, segsRef.current, lastTimeRef.current, prevRef.current,
      )
      prevRef.current = saved
      setProgress(saved)
    } catch {
      // 저장 실패는 다음 주기에 다시 시도된다. 재생을 끊지 않는다.
    }
  }, [enrollmentId, lesson])

  const onTimeUpdate = () => {
    const v = videoRef.current
    if (!v || !lesson) return
    const now = v.currentTime
    const delta = now - lastTimeRef.current
    // 이어서 재생된 구간만 더한다
    if (delta > 0 && delta <= JUMP_SEC) {
      segsRef.current = add(segsRef.current, lastTimeRef.current, now)
      sinceSaveRef.current += delta
    }
    lastTimeRef.current = now
    if (sinceSaveRef.current >= SAVE_EVERY_SEC) {
      sinceSaveRef.current = 0
      void flush()
    }
  }

  // 창을 닫거나 다른 회차로 옮길 때 마지막으로 저장한다
  useEffect(() => () => { void flush() }, [flush])

  if (err) return <div className="wrap"><div className="warn"><p>{err}</p></div></div>
  if (!lesson || !enroll) return <div className="center">불러오는 중입니다</div>

  const shown = Number(progress?.coverage ?? 0)

  return (
    <div className="wrap">
      <p className="crumb">
        <Link to="/">내 강의실</Link> › {enroll.course.title} › {lesson.seq}회차
      </p>

      <div>
        <h1>{lesson.seq}. {lesson.title}</h1>
        {lesson.module && <p className="muted">{lesson.module}</p>}
        {lesson.summary && <p className="lead">{lesson.summary}</p>}
      </div>

      <div className="player">
        {lesson.video_url ? (
          <video
            ref={videoRef}
            src={lesson.video_url}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={() => {
              const v = videoRef.current
              if (!v) return
              if (resumeRef.current > 0 && resumeRef.current < v.duration - 5) {
                v.currentTime = resumeRef.current
              }
              lastTimeRef.current = v.currentTime
            }}
            onTimeUpdate={onTimeUpdate}
            onPause={() => void flush()}
            onEnded={() => void flush()}
          />
        ) : (
          <p className="empty">아직 영상이 올라오지 않았습니다. 준비되면 알려드립니다.</p>
        )}
      </div>

      <div className="card">
        <div className="row">
          <div className="grow">
            <p className="muted">
              이 회차는 {Math.round(Number(lesson.done_rate) * 100)}퍼센트 이상 보시면 이수로 처리됩니다.
              건너뛴 구간은 세지 않습니다.
            </p>
            <div className="bar"><i style={{ width: `${Math.round(shown * 100)}%` }} /></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="big">{Math.round(shown * 100)}</span>
            <span className="muted">퍼센트</span>
          </div>
        </div>
        {progress?.completed && <div className="note"><p><b>이수 처리되었습니다.</b> 다시 보셔도 기록은 그대로 남습니다.</p></div>}
      </div>

      <div className="row">
        {lesson.handout_url && <a className="btn" href={lesson.handout_url} target="_blank" rel="noreferrer">교재 내려받기</a>}
        {lesson.audio_url && <a className="btn ghost" href={lesson.audio_url} target="_blank" rel="noreferrer">음성만 듣기</a>}
        <Link className="btn ghost" to="/">목록으로</Link>
      </div>
    </div>
  )
}
