import { Link } from 'react-router-dom'
import {
  BookOpen, Users, CalendarCheck, Star, ArrowRight,
  CheckCircle2, Clock, Shield, MessageSquare, Sparkles,
  GraduationCap, TrendingUp, Award, ChevronRight
} from 'lucide-react'
import { getSession } from '../lib/auth'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const SUBJECTS = [
  { name: 'Mathematics',  color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { name: 'Physics',      color: 'bg-purple-50 text-purple-700 border-purple-100' },
  { name: 'Chemistry',    color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { name: 'English',      color: 'bg-green-50 text-green-700 border-green-100' },
  { name: 'Biology',      color: 'bg-teal-50 text-teal-700 border-teal-100' },
  { name: 'Economics',    color: 'bg-rose-50 text-rose-700 border-rose-100' },
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
  { icon: Users,       text: 'Connect with motivated students' },
  { icon: Award,       text: 'Set your own rate and schedule' },
  { icon: MessageSquare, text: 'Automated notifications & reminders' },
  { icon: TrendingUp,  text: 'Build a recurring student base' },
]

export default function Home() {
  const navigate = useNavigate()
  const session  = getSession()

  useEffect(() => {
    if (session) navigate(session.role === 'student' ? '/student' : '/tutor', { replace: true })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-800 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">TutorMatch</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#for-students" className="hover:text-slate-900 transition-colors">For Students</a>
            <a href="#for-tutors"   className="hover:text-slate-900 transition-colors">For Tutors</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"    className="btn-secondary text-xs px-3 py-2">Sign In</Link>
            <Link to="/register" className="btn-primary  text-xs px-3 py-2">Get Started</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-green-50 blur-3xl opacity-70" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-amber-50 blur-3xl opacity-60" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-medium mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Singapore's Tutor Matching Platform
            </div>
            <h1 className="text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-5">
              Find the right<br />
              <span className="text-green-800">tutor for you.</span>
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-md">
              TutorMatch connects students with expert tutors across every subject.
              Browse, book a trial lesson, and start learning — all in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register?role=student"
                className="btn-primary px-6 py-3 text-sm">
                Find a Tutor <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/register?role=tutor"
                className="btn-secondary px-6 py-3 text-sm">
                Become a Tutor
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-8 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> No commitment required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Trial lessons available</span>
            </div>
          </div>

          {/* Right — mock tutor card */}
          <div className="relative flex justify-center">
            <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-amber-100 blur-xl opacity-80" />
            <div className="relative w-full max-w-sm">
              {/* Floating card */}
              <div className="card p-5 shadow-xl border-slate-100">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white font-bold text-lg shrink-0">A</div>
                  <div>
                    <p className="font-semibold text-slate-900">Alice Tan</p>
                    <p className="text-xs text-slate-500">Mathematics &amp; Physics</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                      <span className="text-xs text-slate-500 ml-1">4.9 (87 reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="font-semibold text-slate-900">SGD 60</p>
                    <p className="text-slate-400">per hour</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="font-semibold text-slate-900">5 yrs</p>
                    <p className="text-slate-400">experience</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="font-semibold text-slate-900">120+</p>
                    <p className="text-slate-400">students</p>
                  </div>
                </div>
                <button className="btn-primary w-full justify-center text-xs py-2.5">
                  Indicate Interest
                </button>
              </div>

              {/* Second floating card offset */}
              <div className="absolute -bottom-6 -right-6 card p-3 shadow-lg flex items-center gap-2 text-xs w-44">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Trial Booked!</p>
                  <p className="text-slate-400">Wed, 9 Apr · 3 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative max-w-6xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Tutors',   value: '500+' },
              { label: 'Students Matched', value: '2,000+' },
              { label: 'Subjects Covered', value: '15+' },
              { label: 'Avg. Rating',     value: '4.8 ★' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-2xl p-5 text-center">
                <p className="text-2xl font-bold text-green-800">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Subjects ────────────────────────────────────────────── */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5 text-center">Subjects Available</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUBJECTS.map(({ name, color }) => (
              <span key={name} className={`px-4 py-2 rounded-full text-sm font-medium border ${color}`}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-3xl font-bold text-slate-900">How TutorMatch works</h2>
            <p className="text-slate-500 mt-3 max-w-md mx-auto text-sm">From browsing to booking in minutes. No complicated setup required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px bg-slate-200" />

            {STEPS.map(({ num, icon: Icon, title, desc }) => (
              <div key={num} className="relative">
                <div className="card p-6 h-full hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-green-800 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-3xl font-black text-slate-100 select-none">{num}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Students & Tutors ───────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8">

          {/* Students */}
          <div id="for-students" className="bg-green-800 rounded-3xl p-8 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mb-5">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">For Students</h3>
            <p className="text-green-100 text-sm mb-6 leading-relaxed">
              Find an expert tutor who matches your learning style. Take a trial lesson risk-free before committing.
            </p>
            <ul className="space-y-3 mb-8">
              {STUDENT_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm">
                  <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-green-100" />
                  </div>
                  <span className="text-green-50">{text}</span>
                </li>
              ))}
            </ul>
            <Link to="/register?role=student"
              className="inline-flex items-center gap-2 bg-white text-green-900 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-green-50 transition-colors">
              Browse Tutors <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Tutors */}
          <div id="for-tutors" className="bg-slate-900 rounded-3xl p-8 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mb-5">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">For Tutors</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Grow your tutoring practice. Reach motivated students, set your own rates, and manage all your bookings in one place.
            </p>
            <ul className="space-y-3 mb-8">
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
              className="inline-flex items-center gap-2 bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-amber-300 transition-colors">
              Join as Tutor <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────── */}
      <section className="py-20 bg-green-800">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-green-200 text-sm mb-8 max-w-sm mx-auto">
            Create your account in under a minute. No credit card required to browse.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register"
              className="inline-flex items-center gap-2 bg-white text-green-900 font-semibold text-sm px-6 py-3 rounded-lg hover:bg-green-50 transition-colors">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-6 py-3 rounded-lg hover:bg-white/20 transition-colors border border-white/20">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-green-700 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-300">TutorMatch</span>
          </div>
          <p className="text-xs text-slate-600">
            © 2026 TutorMatch · ESD G7T1 · Singapore Management University
          </p>
          <div className="flex gap-4 text-xs">
            <Link to="/login"    className="hover:text-slate-200 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-slate-200 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
