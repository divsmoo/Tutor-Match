import { useState, useEffect, useMemo } from 'react'
import { BookOpen, DollarSign, Heart, Search, SlidersHorizontal, X, Star, ChevronRight, GraduationCap } from 'lucide-react'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import { getTutors, indicateInterest, studentName } from '../../lib/api'

// ── Improvement 1: Subject/rate filters
// ── Improvement 3: Tutor profile card expansion

function ProfileModal({ tutor, onClose, onInterest, submitting }) {
  if (!tutor) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md overflow-hidden">
        {/* Header banner */}
        <div className="h-20 bg-gradient-to-r from-green-700 to-teal-600" />
        <button onClick={onClose} className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-8 mb-4 flex items-end justify-between">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white dark:ring-slate-800 shadow-lg">
              {tutor.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">ID #{tutor.tutor_id}</span>
          </div>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{tutor.name}</h2>

          {/* Subject pill */}
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 mb-4">
            <BookOpen className="h-3 w-3" /> {tutor.subject ?? 'General'}
          </span>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Hourly Rate</p>
              <p className="text-base font-bold text-slate-900 dark:text-white">SGD {tutor.rate ?? '–'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Subject</p>
              <p className="text-base font-bold text-slate-900 dark:text-white truncate">{tutor.subject ?? '–'}</p>
            </div>
          </div>

          {/* Contact / availability note */}
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400 mb-5">
            <Star className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Indicate your interest and the tutor will propose available trial lesson dates via email.
            </span>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Close</button>
            <button onClick={onInterest} disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? <Spinner size="sm" /> : <><Heart className="h-3.5 w-3.5" /> Indicate Interest</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BrowseTutors({ student, notify }) {
  const [tutors, setTutors]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [subjectFilter, setSubject] = useState('All')
  const [maxRate, setMaxRate]       = useState(300)
  const [showFilters, setShowFilters] = useState(false)
  const [profile, setProfile]       = useState(null)   // tutor shown in profile modal
  const [confirmTutor, setConfirm]  = useState(null)   // tutor in confirm-interest modal
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getTutors()
      .then(res => setTutors(res.data ?? []))
      .catch(() => setTutors([]))
      .finally(() => setLoading(false))
  }, [])

  const subjects = useMemo(() => {
    const s = new Set(tutors.map(t => t.subject).filter(Boolean))
    return ['All', ...Array.from(s).sort()]
  }, [tutors])

  const maxPossibleRate = useMemo(() => {
    const rates = tutors.map(t => t.rate).filter(Boolean)
    return rates.length ? Math.ceil(Math.max(...rates) / 10) * 10 : 300
  }, [tutors])

  const filtered = useMemo(() => tutors.filter(t => {
    const matchSearch  = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase())
    const matchSubject = subjectFilter === 'All' || t.subject === subjectFilter
    const matchRate    = !t.rate || t.rate <= maxRate
    return matchSearch && matchSubject && matchRate
  }), [tutors, search, subjectFilter, maxRate])

  async function handleInterest(tutor) {
    setSubmitting(true)
    try {
      await indicateInterest(student.student_id, tutor.tutor_id, studentName(student))
      notify(`Interest sent to ${tutor.name}! They'll be notified by email.`)
      setProfile(null)
      setConfirm(null)
    } catch (err) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? 'Failed to send interest'
      notify(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const activeFilters = (subjectFilter !== 'All' ? 1 : 0) + (maxRate < maxPossibleRate ? 1 : 0)

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Browse Tutors</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Find the right tutor and indicate your interest</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or subject…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`btn-secondary relative ${showFilters ? 'ring-2 ring-green-600' : ''}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilters > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-green-700 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-5 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label mb-1.5">Subject</label>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    subjectFilter === s
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-green-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label mb-1.5">Max Rate: <span className="font-semibold text-slate-800 dark:text-white">SGD {maxRate}/hr</span></label>
            <input
              type="range"
              min={0}
              max={maxPossibleRate}
              step={10}
              value={maxRate}
              onChange={e => setMaxRate(Number(e.target.value))}
              className="w-full accent-green-700"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>SGD 0</span><span>SGD {maxPossibleRate}</span>
            </div>
          </div>
        </div>
      )}

      {/* Result count */}
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
        {filtered.length} tutor{filtered.length !== 1 ? 's' : ''} found
      </p>

      {filtered.length === 0
        ? <EmptyState icon={GraduationCap} title="No tutors match your filters" description="Try adjusting the subject or rate filter" />
        : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(tutor => (
              <div key={tutor.tutor_id} className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow group">
                {/* Avatar + name */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                    {tutor.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{tutor.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">Tutor #{tutor.tutor_id}</p>
                  </div>
                </div>

                {/* Subject & rate */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{tutor.subject ?? 'General'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>SGD {tutor.rate ?? '–'} / hr</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => setProfile(tutor)}
                    className="btn-secondary flex-1 justify-center text-xs"
                  >
                    <ChevronRight className="h-3.5 w-3.5" /> View Profile
                  </button>
                  <button
                    onClick={() => setConfirm(tutor)}
                    className="btn-primary flex-1 justify-center text-xs"
                  >
                    <Heart className="h-3.5 w-3.5" /> Interest
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Profile modal (improvement 3) */}
      <ProfileModal
        tutor={profile}
        onClose={() => setProfile(null)}
        onInterest={() => handleInterest(profile)}
        submitting={submitting}
      />

      {/* Quick confirm modal */}
      <Modal open={!!confirmTutor} onClose={() => setConfirm(null)} title="Indicate Interest">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          You're about to express interest in{' '}
          <span className="font-semibold text-slate-900 dark:text-white">{confirmTutor?.name}</span>.
          They'll receive an email notification.
        </p>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-xs space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Subject</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{confirmTutor?.subject}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Rate</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">SGD {confirmTutor?.rate}/hr</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setConfirm(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={() => handleInterest(confirmTutor)} disabled={submitting} className="btn-primary flex-1 justify-center">
            {submitting ? <Spinner size="sm" /> : 'Confirm'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
