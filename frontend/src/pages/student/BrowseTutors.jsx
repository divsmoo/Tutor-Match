import { useState, useEffect } from 'react'
import { BookOpen, DollarSign, Mail, Heart, Search } from 'lucide-react'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import { getTutors, indicateInterest, studentName } from '../../lib/api'

export default function BrowseTutors({ student, notify }) {
  const [tutors, setTutors]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)  // tutor to indicate interest in
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getTutors()
      .then(res => setTutors(res.data ?? []))
      .catch(() => setTutors([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = tutors.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.subject?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleInterest() {
    setSubmitting(true)
    try {
      await indicateInterest(student.student_id, selected.tutor_id, studentName(student))
      notify(`Interest sent to ${selected.name}! They'll be notified.`)
      setSelected(null)
    } catch (err) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? 'Failed to send interest'
      notify(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Browse Tutors</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Find the right tutor and indicate your interest</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or subject…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {filtered.length === 0
        ? <EmptyState icon={BookOpen} title="No tutors found" description="Try adjusting your search" />
        : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(tutor => (
              <div key={tutor.tutor_id} className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                {/* Avatar + name */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                    {tutor.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{tutor.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">Tutor #{tutor.tutor_id}</p>
                  </div>
                </div>

                {/* Subject & rate */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{tutor.subject ?? 'General'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>SGD {tutor.rate ?? '–'} / hr</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">{tutor.contact_info ?? '–'}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelected(tutor)}
                  className="btn-primary w-full justify-center mt-auto"
                >
                  <Heart className="h-3.5 w-3.5" />
                  Indicate Interest
                </button>
              </div>
            ))}
          </div>
        )}

      {/* Confirm modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Indicate Interest"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          You're about to express interest in{' '}
          <span className="font-semibold text-slate-900 dark:text-white">{selected?.name}</span>.
          They'll receive an email notification.
        </p>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-xs space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Subject</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{selected?.subject}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Rate</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">SGD {selected?.rate}/hr</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setSelected(null)} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button onClick={handleInterest} disabled={submitting} className="btn-primary flex-1 justify-center">
            {submitting ? <Spinner size="sm" /> : 'Confirm'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
