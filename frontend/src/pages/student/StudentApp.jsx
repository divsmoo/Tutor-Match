import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Search, BookMarked, Calendar, LogOut, Sparkles } from 'lucide-react'
import Toast from '../../components/Toast'
import BrowseTutors from './BrowseTutors'
import MyInterests from './MyInterests'
import MyTrials from './MyTrials'
import Spinner from '../../components/Spinner'
import { getSession, logout } from '../../lib/auth'
import { studentName as getStudentName } from '../../lib/api'
import { getStudent } from '../../lib/api'

const TABS = [
  { id: 'browse',    label: 'Browse Tutors',  icon: Search },
  { id: 'interests', label: 'My Interests',   icon: BookMarked },
  { id: 'trials',    label: 'My Trials',      icon: Calendar },
]

export default function StudentApp() {
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]     = useState('browse')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'student') { navigate('/login', { replace: true }); return }
    getStudent(session.id)
      .then(res => setStudent(res.data))
      .catch(() => { logout(); navigate('/login', { replace: true }) })
      .finally(() => setLoading(false))
  }, [])

  const notify = (message, type = 'success') => setToast({ message, type })

  function handleLogout() {
    logout()
    navigate('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  if (!student) return null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-green-800 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight">TutorMatch</span>
          </div>

          <nav className="flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${tab === id
                    ? 'bg-green-50 text-green-800'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                <GraduationCap className="h-3.5 w-3.5 text-green-700" />
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-slate-700 leading-none">{getStudentName(student)}</p>
                <p className="text-xs text-slate-400 mt-0.5">ID #{student.student_id}</p>
              </div>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className="text-slate-400 hover:text-slate-600 transition-colors p-1">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {tab === 'browse'    && <BrowseTutors student={student} notify={notify} />}
        {tab === 'interests' && <MyInterests  student={student} notify={notify} />}
        {tab === 'trials'    && <MyTrials     student={student} notify={notify} />}
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
