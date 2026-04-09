import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap, Search, BookMarked, Calendar, LogOut, Sparkles, Sun, Moon, Bell, Wallet, CheckCircle2, AlertCircle } from 'lucide-react'
import Toast from '../../components/Toast'
import BrowseTutors from './BrowseTutors'
import MyInterests from './MyInterests'
import MyTrials from './MyTrials'
import Spinner from '../../components/Spinner'
import { getSession, logout } from '../../lib/auth'
import { studentName as getStudentName } from '../../lib/api'
import { getStudent } from '../../lib/api'
import { useTheme } from '../../lib/theme'
import { supabase } from '../../lib/supabase'

const TABS = [
  { id: 'browse',    label: 'Browse Tutors',  icon: Search },
  { id: 'interests', label: 'My Interests',   icon: BookMarked },
  { id: 'trials',    label: 'My Trials',      icon: Calendar },
]

const MAX_NOTIFICATIONS = 5

export default function StudentApp() {
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()
  const [student, setStudent]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('browse')
  const [toast, setToast]           = useState(null)
  // Improvement 4: credit in header
  const [credit, setCredit]         = useState(null)
  // Improvement 5: notification history
  const [notifications, setNotifs]  = useState([])
  const [bellOpen, setBellOpen]     = useState(false)
  const [unread, setUnread]         = useState(0)
  const bellRef                     = useRef(null)

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'student') { navigate('/login', { replace: true }); return }
    getStudent(session.id)
      .then(res => setStudent(res.data))
      .catch(() => { logout(); navigate('/login', { replace: true }) })
      .finally(() => setLoading(false))
  }, [])

  // Fetch credit + subscribe to realtime changes
  useEffect(() => {
    if (!student) return
    const fetchCredit = async () => {
      try {
        const { data } = await supabase
          .from('credit')
          .select('balance')
          .eq('student_id', student.student_id)
          .single()
        setCredit(data?.balance ?? null)
      } catch { /* non-critical */ }
    }
    fetchCredit()

    const channel = supabase
      .channel(`credit-header:${student.student_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit', filter: `student_id=eq.${student.student_id}` },
        payload => setCredit(payload.new?.balance ?? null))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [student?.student_id])

  // Close bell dropdown on outside click
  useEffect(() => {
    function handler(e) { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const notify = (message, type = 'success') => {
    setToast({ message, type })
    const entry = { id: Date.now(), message, type, time: new Date() }
    setNotifs(prev => [entry, ...prev].slice(0, MAX_NOTIFICATIONS))
    setUnread(n => n + 1)
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center dark:bg-slate-900">
      <Spinner size="lg" />
    </div>
  )

  if (!student) return null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 dark:bg-slate-800 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-700 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight dark:text-white">TutorMatch</span>
          </Link>

          <nav className="flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${tab === id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Improvement 4: Credit balance */}
            {credit !== null && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <Wallet className="h-3 w-3" />
                SGD {Number(credit).toFixed(2)}
              </div>
            )}

            {/* Theme toggle */}
            <button onClick={toggle} title="Toggle theme"
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Improvement 5: Notification bell */}
            <div ref={bellRef} className="relative">
              <button onClick={() => { setBellOpen(o => !o); setUnread(0) }}
                className="relative text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1">
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Notifications</span>
                    {notifications.length > 0 && (
                      <button onClick={() => setNotifs([])} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        Clear all
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">No notifications yet</div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className="flex items-start gap-2.5 px-4 py-3">
                          {n.type === 'error'
                            ? <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                            : <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {n.time.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User info */}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <GraduationCap className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-none">{getStudentName(student)}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">ID #{student.student_id}</p>
              </div>
            </div>

            <button onClick={handleLogout} title="Sign out"
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-8">
        {tab === 'browse'    && <BrowseTutors student={student} notify={notify} />}
        {tab === 'interests' && <MyInterests  student={student} notify={notify} />}
        {tab === 'trials'    && <MyTrials     student={student} notify={notify} />}
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
