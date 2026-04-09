import { useState, useEffect } from 'react'
import { Calendar, XCircle, RefreshCw, Mail } from 'lucide-react'
import Spinner from '../../components/Spinner'
import Badge from '../../components/Badge'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import { getAllTrials, getStudent, cancelTrialLessons, studentName, studentEmail } from '../../lib/api'

function fmt(dateStr) {
  if (!dateStr) return '–'
  return new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function calcRefund(trial, rate) {
  if (!trial?.start_time || !trial?.end_time || !rate) return null
  const [sh, sm] = trial.start_time.split(':').map(Number)
  const [eh, em] = trial.end_time.split(':').map(Number)
  const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60
  return Math.max(0, Math.round(rate * hours * 100) / 100)
}

export default function TutorTrials({ tutor, notify }) {
  const [trials, setTrials]             = useState([])
  const [studentMap, setStudentMap]     = useState({})
  const [loading, setLoading]           = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [submitting, setSubmitting]     = useState(false)
  const [contactReveal, setContactReveal] = useState(null) // trial to show in reveal modal

  // localStorage key scoped to this tutor
  const seenKey = `tutor_contact_seen_${tutor.tutor_id}`

  function checkNewCompletions(completedTrials, map) {
    const seen = new Set(JSON.parse(localStorage.getItem(seenKey) ?? '[]'))
    const newlyCompleted = completedTrials.filter(
      t => t.status === 'COMPLETED' && map[t.student_id] && !seen.has(t.trial_id)
    )
    if (newlyCompleted.length > 0) {
      // Show modal for the first unseen completion; mark all as seen
      setContactReveal(newlyCompleted[0])
      newlyCompleted.forEach(t => seen.add(t.trial_id))
      localStorage.setItem(seenKey, JSON.stringify([...seen]))
    }
  }

  async function load() {
    setLoading(true)
    try {
      const res  = await getAllTrials()
      const all  = res.data ?? []
      const mine = all.filter(t => t.tutor_id === tutor.tutor_id)
      setTrials(mine)

      const ids = [...new Set(mine.map(t => t.student_id))]
      const pairs = await Promise.allSettled(ids.map(id => getStudent(id)))
      const map = {}
      pairs.forEach((p, idx) => {
        if (p.status === 'fulfilled') map[ids[idx]] = p.value.data
      })
      setStudentMap(map)
      checkNewCompletions(mine, map)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tutor.tutor_id])

  // ── Scenario 3b: Tutor cancels & refunds ────────────────────
  async function handleCancel() {
    setSubmitting(true)
    try {
      await cancelTrialLessons(cancelTarget.trial_id)
      const refund = calcRefund(cancelTarget, tutor.rate)
      notify(`Trial cancelled. Student has been refunded SGD ${refund ?? '–'} in credits.`)
      setCancelTarget(null)
      load()
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Failed to cancel trial'
      notify(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const sorted = [...trials].sort((a, b) => new Date(b.created_at ?? b.trial_date) - new Date(a.created_at ?? a.trial_date))

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">My Trials</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your scheduled trial lessons</p>
        </div>
        <button onClick={load} className="btn-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No trials scheduled"
          description="Accept a student's interest to create a trial"
        />
      ) : (
        <div className="space-y-3">
          {sorted.map(trial => {
            const student = studentMap[trial.student_id]
            const isCancellable = ['PENDING', 'CONFIRMED', 'PENDING_PAYMENT'].includes(trial.status)
            const isCompleted = trial.status === 'COMPLETED'

            return (
              <div key={trial.trial_id} className="card overflow-hidden hover:shadow-md transition-shadow">
                {/* Top accent stripe */}
                <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-sm">
                      {studentName(student)?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">
                        {studentName(student) !== '–' ? studentName(student) : `Student #${trial.student_id}`}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                        Trial #{trial.trial_id}
                      </span>
                    </div>
                  </div>
                  <Badge status={trial.status} />
                </div>

                <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 mb-4 text-xs">
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 mb-0.5">Date</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{fmt(trial.trial_date)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 mb-0.5">Time</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {trial.start_time?.slice(0, 5)} – {trial.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 mb-0.5">Subject</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{trial.subject ?? tutor.subject ?? '–'}</p>
                  </div>
                </div>

                {isCompleted && student && (
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 py-2 mb-3 text-xs">
                    <Mail className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Student email:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 break-all">{studentEmail(student)}</span>
                  </div>
                )}

                {trial.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 italic">"{trial.notes}"</p>
                )}

                {isCancellable && (
                  <button onClick={() => setCancelTarget(trial)} className="btn-danger">
                    <XCircle className="h-3.5 w-3.5" /> Cancel & Refund
                  </button>
                )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Contact Reveal Modal — shown once when a trial first becomes COMPLETED */}
      <Modal open={!!contactReveal} onClose={() => setContactReveal(null)} title="Student Contact Info">
        {contactReveal && (() => {
          const student = studentMap[contactReveal.student_id]
          return (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Great! <strong>{studentName(student)}</strong> has decided to continue lessons with you.
                You can now reach them directly:
              </p>
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 break-all">
                  {studentEmail(student)}
                </span>
              </div>
              <button onClick={() => setContactReveal(null)} className="btn-primary w-full justify-center">Done</button>
            </>
          )
        })()}
      </Modal>

      {/* Cancel Modal */}
      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Trial & Refund">
        {cancelTarget && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Are you sure you want to cancel Trial #{cancelTarget.trial_id}?
              The student will be notified and{' '}
              <strong>SGD {calcRefund(cancelTarget, tutor.rate) ?? '–'} in credits</strong> will be refunded to them.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400 mb-5">
              This action cannot be undone. The student will receive an email notification.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCancelTarget(null)} className="btn-secondary flex-1 justify-center">
                Keep Trial
              </button>
              <button onClick={handleCancel} disabled={submitting} className="btn-danger flex-1 justify-center">
                {submitting ? <Spinner size="sm" /> : <><XCircle className="h-3.5 w-3.5" /> Cancel & Refund</>}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
