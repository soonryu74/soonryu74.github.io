import { NavLink, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'
import ClassroomPage from './pages/ClassroomPage'
import LessonPage from './pages/LessonPage'
import AttendancePage from './pages/AttendancePage'
import AdminStudentsPage from './pages/AdminStudentsPage'
import AdminAttendancePage from './pages/AdminAttendancePage'

// 회차를 옮길 때 재생 상태가 섞이지 않도록 id별로 새로 마운트한다
function LessonRoute() {
  const { lessonId = '' } = useParams()
  return <LessonPage key={lessonId} />
}

function Header() {
  const { student, signOut } = useAuth()
  const admin = student?.role === 'admin'
  return (
    <header className="top">
      <div className="in">
        <a className="brand" href="#/">
          통합돌봄사이버교육원
          <small>강의실</small>
        </a>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>내 강의실</NavLink>
          {admin && <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>수강생</NavLink>}
          {admin && <NavLink to="/admin/attendance" className={({ isActive }) => (isActive ? 'active' : '')}>출석표</NavLink>}
          <button type="button" className="btn ghost small" onClick={signOut}>나가기</button>
        </nav>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}

function Shell() {
  const { session, loading } = useAuth()
  if (loading) return <div className="center">불러오는 중입니다</div>
  if (!session) return <LoginPage />
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<ClassroomPage />} />
        <Route path="/lesson/:enrollmentId/:lessonId" element={<LessonRoute />} />
        <Route path="/attendance/:enrollmentId" element={<AttendancePage />} />
        <Route path="/admin" element={<AdminStudentsPage />} />
        <Route path="/admin/attendance" element={<AdminAttendancePage />} />
      </Routes>
    </>
  )
}
