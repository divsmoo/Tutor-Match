import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BookOpen, Users, Calendar, LogOut, Sparkles, Sun, Moon } from 'lucide-react'
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

  function handleLogout() {
    logout()
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
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-green-800 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight dark:text-white">TutorMatch</span>
          </Link>

          <nav className="flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${tab === id
                    ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
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

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {tab === 'students' && <InterestedStudents tutor={tutor} notify={notify} />}
        {tab === 'trials'   && <TutorTrials        tutor={tutor} notify={notify} />}
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
