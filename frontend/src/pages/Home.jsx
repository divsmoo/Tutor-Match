import { Link } from 'react-router-dom'
import {
  BookOpen, Users, CalendarCheck, Star, ArrowRight,
  CheckCircle2, Clock, Shield, MessageSquare,
  GraduationCap, TrendingUp, Award, ChevronRight, Sun, Moon
} from 'lucide-react'
import { getSession } from '../lib/auth'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useTheme } from '../lib/theme'

const SUBJECTS = [
  { name: 'Mathematics',  color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { name: 'Physics',      color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { name: 'Chemistry',    color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  { name: 'English',      color: 'bg-sky-50 text-sky-700 border-sky-100' },
  { name: 'Biology',      color: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  { name: 'Economics',    color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { name: 'Programming',  color: 'bg-slate-50 text-slate-700 border-slate-200' },
  { name: 'History',      color: 'bg-orange-50 text-orange-700 border-orange-100' },
]

const STEPS = [
  {
    num: '01',
    icon: Users,
    title: 'Browse Verified Tutors',
    desc: 'Explore our network of qualified tutors across a wide range of subjects. View their rates, subjects, and availability.',
  },
  {
    num: '02',
    icon: CalendarCheck,
    title: 'Book a Trial Lesson',
    desc: 'Indicate your interest, let the tutor accept and schedule a time that works for both of you, then confirm and pay securely.',
  },
  {
    num: '03',
    icon: TrendingUp,
    title: 'Continue & Grow',
    desc: 'If the trial goes well, opt in to continue regular lessons. Your progress is our priority from day one.',
  },
]

const STUDENT_FEATURES = [
  { icon: BookOpen,    text: 'Access tutors across 15+ subjects' },
  { icon: Shield,      text: 'Secure, verified tutor profiles' },
  { icon: Clock,       text: 'Flexible scheduling around you' },
  { icon: Star,        text: 'Trial lesson before committing' },
]

const TUTOR_FEATURES = [
  { icon: Users,         text: 'Connect with motivated students' },
  { icon: Award,         text: 'Set your own rate and schedule' },
  { icon: MessageSquare, text: 'Automated notifications & reminders' },
  { icon: TrendingUp,    text: 'Build a recurring student base' },
]

export default function Home() {
  const navigate = useNavigate()
  const session  = getSession()
  const { dark, toggle } = useTheme()

  useEffect(() => {
    if (session) navigate(session.role === 'student' ? '/student' : '/tutor', { replace: true })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100 dark:bg-slate-900/90 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 shrink-0">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-blue-700 flex items-center justify-center">
              <span className="text-white text-[11px] font-black tracking-tight leading-none">TM</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base">TutorMatch</span>
          </button>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">How It Works</a>
            <a href="#for-students" className="hover:text-slate-900 dark:hover:text-white transition-colors">For Students</a>
            <a href="#for-tutors"   className="hover:text-slate-900 dark:hover:text-white transition-colors">For Tutors</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button onClick={toggle} title="Toggle theme"
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1.5">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/login"    className="hidden sm:inline-flex btn-secondary text-xs px-3 py-1.5">Sign In</Link>
            <Link to="/register" className="btn-primary text-xs px-3 py-1.5">Get Started</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white dark:bg-slate-900">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-blue-50 dark:bg-blue-900/20 blur-3xl opacity-70" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-yellow-50 dark:bg-yellow-900/20 blur-3xl opacity-60" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 lg:py-24 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-medium mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Singapore's Tutor Matching Platform
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-4 sm:mb-5">
              Find the right<br />
              <span className="text-blue-700 dark:text-blue-400">tutor for you.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-6 sm:mb-8 max-w-md">
              TutorMatch connects students with expert tutors across every subject.
              Browse, book a trial lesson, and start learning — all in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register?role=student" className="btn-primary px-5 sm:px-6 py-2.5 sm:py-3 text-sm">
                Find a Tutor <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/register?role=tutor"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-medium rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 transition-colors dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300">
                Become a Tutor
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-6 sm:mt-8 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> No commitment required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Trial lessons available</span>
            </div>
          </div>

          {/* Right — mock tutor card */}
          <div className="relative hidden sm:flex justify-center">
            <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 blur-xl opacity-80" />
            <div className="relative w-full max-w-sm">
              <div className="card p-5 shadow-xl border-slate-100 dark:border-slate-700">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">A</div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Alice Tan</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Mathematics &amp; Physics</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">4.9 (87 reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                    <p className="font-semibold text-slate-900 dark:text-white">SGD 60</p>
                    <p className="text-slate-400 dark:text-slate-500">per hour</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                    <p className="font-semibold text-slate-900 dark:text-white">5 yrs</p>
                    <p className="text-slate-400 dark:text-slate-500">experience</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                    <p className="font-semibold text-slate-900 dark:text-white">120+</p>
                    <p className="text-slate-400 dark:text-slate-500">students</p>
                  </div>
                </div>
                <button className="btn-primary w-full justify-center text-xs py-2.5">
                  Indicate Interest
                </button>
              </div>

              {/* Floating offset card */}
              <div className="absolute -bottom-6 -right-6 card p-3 shadow-lg hidden md:flex items-center gap-2 text-xs w-44">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">Trial Booked!</p>
                  <p className="text-slate-400 dark:text-slate-500">Wed, 9 Apr · 3 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12 lg:pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Active Tutors',    value: '500+' },
              { label: 'Students Matched', value: '2,000+' },
              { label: 'Subjects Covered', value: '15+' },
              { label: 'Avg. Rating',      value: '4.8 ★' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-blue-50 dark:bg-slate-800 rounded-2xl p-4 sm:p-5 text-center border border-blue-100 dark:border-slate-700">
                <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Subjects ────────────────────────────────────────────── */}
      <section className="py-10 sm:py-16 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5 text-center">Subjects Available</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUBJECTS.map(({ name, color }) => (
              <span key={name} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border ${color}`}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-12 sm:py-20 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">How TutorMatch works</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-md mx-auto text-sm">From browsing to booking in minutes. No complicated setup required.</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px bg-blue-100 dark:bg-slate-700" />

            {STEPS.map(({ num, icon: Icon, title, desc }) => (
              <div key={num} className="relative">
                <div className="card p-5 sm:p-6 h-full hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-700 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-3xl font-black text-blue-50 dark:text-slate-700 select-none">{num}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Students & Tutors ───────────────────────────────── */}
      <section className="py-12 sm:py-20 lg:py-24 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-4 sm:gap-8">

          {/* Students */}
          <div id="for-students" className="bg-blue-700 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 sm:mb-5">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">For Students</h3>
            <p className="text-blue-100 text-sm mb-5 sm:mb-6 leading-relaxed">
              Find an expert tutor who matches your learning style. Take a trial lesson risk-free before committing.
            </p>
            <ul className="space-y-3 mb-6 sm:mb-8">
              {STUDENT_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm">
                  <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-blue-100" />
                  </div>
                  <span className="text-blue-50">{text}</span>
                </li>
              ))}
            </ul>
            <Link to="/register?role=student"
              className="inline-flex items-center gap-2 bg-white text-blue-800 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors">
              Browse Tutors <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Tutors */}
          <div id="for-tutors" className="bg-slate-900 dark:bg-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 sm:mb-5">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">For Tutors</h3>
            <p className="text-slate-300 text-sm mb-5 sm:mb-6 leading-relaxed">
              Grow your tutoring practice. Reach motivated students, set your own rates, and manage all your bookings in one place.
            </p>
            <ul className="space-y-3 mb-6 sm:mb-8">
              {TUTOR_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm">
                  <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                  <span className="text-slate-200">{text}</span>
                </li>
              ))}
            </ul>
            <Link to="/register?role=tutor"
              className="inline-flex items-center gap-2 bg-yellow-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-yellow-300 transition-colors">
              Join as Tutor <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 bg-gradient-to-r from-blue-700 to-blue-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-blue-200 text-sm mb-6 sm:mb-8 max-w-sm mx-auto">
            Create your account in under a minute. No credit card required to browse.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register"
              className="inline-flex items-center gap-2 bg-yellow-400 text-slate-900 font-semibold text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-yellow-300 transition-colors">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-white/20 transition-colors border border-white/20">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-8 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-blue-700 flex items-center justify-center">
              <span className="text-white text-[9px] font-black tracking-tight leading-none">TM</span>
            </div>
            <span className="text-sm font-semibold text-slate-300">TutorMatch</span>
          </div>
          <p className="text-xs text-slate-600 text-center">
            © 2026 TutorMatch · ESD G7T1 · Singapore Management University
          </p>
          <div className="flex gap-4 text-xs">
            <Link to="/login"    className="hover:text-slate-200 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-slate-200 transition-colors">Register</Link>
            <Link to="/status"   className="hover:text-slate-200 transition-colors">System Status</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
