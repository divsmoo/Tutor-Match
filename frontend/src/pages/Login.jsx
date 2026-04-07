import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react'
import { login } from '../lib/auth'
import { getStudent, getTutor } from '../lib/api'
import Spinner from '../components/Spinner'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm]         = useState({ email: '', password: '' })
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setError('') }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email.trim() || !form.password) { setError('Please fill in all fields.'); return }

    setLoading(true)
    try {
      const session = login({ email: form.email.trim(), password: form.password })

      // Fetch full profile from backend
      let profile
      try {
        if (session.role === 'student') {
          const res = await getStudent(session.id)
          profile = res.data
        } else {
          const res = await getTutor(session.id)
          profile = res.data
        }
      } catch {
        setError(`Could not fetch your profile. Check that your ${session.role} ID is correct.`)
        setLoading(false)
        return
      }

      navigate(session.role === 'student' ? '/student' : '/tutor', {
        state: { user: profile },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-green-800 flex-col justify-between p-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">TutorMatch</span>
        </Link>
        <div>
          <blockquote className="text-green-100 text-xl font-medium leading-relaxed mb-4">
            "TutorMatch helped me find the perfect tutor for A-Level Chemistry in under 24 hours."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">S</div>
            <div>
              <p className="text-white text-sm font-medium">Sarah L.</p>
              <p className="text-green-300 text-xs">Student, SMU</p>
            </div>
          </div>
        </div>
        <p className="text-green-300 text-xs">© 2026 TutorMatch · ESD G7T1</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-slate-900">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-7 w-7 rounded-lg bg-green-800 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight">TutorMatch</span>
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Password</label>
                <button type="button" className="text-xs text-slate-400 hover:text-green-700 dark:hover:text-green-400 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="input pr-10"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <Spinner size="sm" /> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-green-700 dark:text-green-400 font-medium hover:underline">Create one here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
