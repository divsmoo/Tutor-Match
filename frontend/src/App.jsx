import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentApp from './pages/student/StudentApp'
import TutorApp from './pages/tutor/TutorApp'
import Status from './pages/Status'
import { getSession } from './lib/auth'

function RequireAuth({ children, role }) {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  if (role && session.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Home />} />
      <Route path="/login"     element={<Login />} />
      <Route path="/register"  element={<Register />} />
      <Route path="/student/*" element={<RequireAuth role="student"><StudentApp /></RequireAuth>} />
      <Route path="/tutor/*"   element={<RequireAuth role="tutor"><TutorApp /></RequireAuth>} />
      <Route path="/status"    element={<Status />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  )
}
