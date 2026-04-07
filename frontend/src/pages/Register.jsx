import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import { register } from '../lib/auth'
import { getStudent, getTutor } from '../lib/api'
import Spinner from '../components/Spinner'

function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter',  ok: /[A-Z]/.test(password) },
    { label: 'One number',            ok: /[0-9]/.test(password) },
  ]
  if (!password) return null
  return (
    <div className="mt-2 space-y-1">
      {checks.map(({ label, ok }) => (
        <div key={label} className={`flex items-center gap-2 text-xs ${ok ? 'text-green-700 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <CheckCircle2 className={`h-3 w-3 ${ok ? 'text-green-600 dark:text-green-400' : 'text-slate-300 dark:text-slate-600'}`} />
          {label}
        </div>
      ))}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const defaultRole = params.get('role') === 'tutor' ? 'tutor' : 'student'

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: defaultRole, id: '' })
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setError('')
    setFieldErrors(fe => ({ ...fe, [k]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.name.trim())   errs.name    = 'Full name is required.'
    if (!form.email.trim())  errs.email   = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.'
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.'
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match.'
    if (!form.id || parseInt(form.id) < 1) errs.id = `Enter a valid ${form.role} ID.`
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }

    setLoading(true)
    setError('')

    // Verify the ID exists in the backend
    try {
      if (form.role === 'student') await getStudent(parseInt(form.id))
      else await getTutor(parseInt(form.id))
    } catch {
      setFieldErrors(fe => ({ ...fe, id: `${form.role === 'student' ? 'Student' : 'Tutor'} ID ${form.id} not found in the system.` }))
      setLoading(false)
      return
    }

    try {
      register({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role, id: form.id })
      navigate('/login', { state: { registered: true, email: form.email.trim() } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col justify-between p-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">TutorMatch</span>
        </Link>
        <div className="space-y-4">
          {[
            { title: 'Browse Verified Tutors',     desc: 'Every tutor is linked to a verified profile.' },
            { title: 'Book Trial Lessons',          desc: 'Try before you commit — risk-free trial sessions.' },
            { title: 'Seamless Payments',           desc: 'Secure payment handling built right in.' },
          ].map(({ title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-700 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{title}</p>
                <p className="text-slate-400 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs">© 2026 TutorMatch · ESD G7T1</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-white dark:bg-slate-900 overflow-y-auto">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-7 w-7 rounded-lg bg-green-800 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight">TutorMatch</span>
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Create your account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Get started — it's free</p>

          {/* Role toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {['student', 'tutor'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => set('role', r)}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors capitalize
                  ${form.role === r
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                I'm a {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input type="text" placeholder="Jane Doe" autoComplete="name"
                value={form.name} onChange={e => set('name', e.target.value)} className="input" />
              {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="label">Email address</label>
              <input type="email" placeholder="you@example.com" autoComplete="email"
                value={form.email} onChange={e => set('email', e.target.value)} className="input" />
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="label">{form.role === 'student' ? 'Student' : 'Tutor'} ID</label>
              <input type="number" min="1" placeholder={`Your ${form.role} ID in the system`}
                value={form.id} onChange={e => set('id', e.target.value)} className="input" />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                This links your account to your existing {form.role} profile.
              </p>
              {fieldErrors.id && <p className="text-xs text-red-500 mt-1">{fieldErrors.id}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} placeholder="Create a strong password"
                  autoComplete="new-password"
                  value={form.password} onChange={e => set('password', e.target.value)} className="input pr-10" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
            </div>

            <div>
              <label className="label">Confirm password</label>
              <input type="password" placeholder="Repeat your password" autoComplete="new-password"
                value={form.confirm} onChange={e => set('confirm', e.target.value)} className="input" />
              {fieldErrors.confirm && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirm}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <Spinner size="sm" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-green-700 dark:text-green-400 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
