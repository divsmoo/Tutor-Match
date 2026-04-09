import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BookOpen, Users, Calendar, LogOut, Sun, Moon } from 'lucide-react'
import Toast from '../../components/Toast'
import InterestedStudents from './InterestedStudents'
import TutorTrials from './TutorTrials'
import Spinner from '../../components/Spinner'
import { getSession, logout } from '../../lib/auth'
import { getTutor } from '../../lib/api'
import { useTheme } from '../../lib/theme'

const TABS = [
  { id: 'students', label: 'Interested Students', icon: Users },
  { id: 'trials',   label: 'My Trials',           icon: Calendar },
]

export default function TutorApp() {
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()
  const [tutor, setTutor]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]     = useState('students')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'tutor') { navigate('/login', { replace: true }); return }
    getTutor(session.id)
      .then(res => setTutor(res.data))
      .catch(() => { logout(); navigate('/login', { replace: true }) })
      .finally(() => setLoading(false))
  }, [])

  const notify = (message, type = 'success') => setToast({ message, type })

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center dark:bg-slate-900">
      <Spinner size="lg" />
    </div>
  )

  if (!tutor) return null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 dark:bg-slate-800 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-700 flex items-center justify-center">
              <span className="text-white text-[11px] font-black tracking-tight leading-none">TM</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight dark:text-white">TutorMatch</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${tab === id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={toggle} title="Toggle theme"
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <BookOpen className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-none">{tutor.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">ID #{tutor.tutor_id}</p>
              </div>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-8 pb-24 sm:pb-8">
        {tab === 'students' && <InterestedStudents tutor={tutor} notify={notify} />}
        {tab === 'trials'   && <TutorTrials        tutor={tutor} notify={notify} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 sm:hidden bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex z-30">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
              tab === id
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </button>
        ))}
      </nav>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
