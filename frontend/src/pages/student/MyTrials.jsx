import { useState, useEffect } from 'react'
import { Calendar, CheckCircle2, XCircle, RefreshCw, CreditCard } from 'lucide-react'
import Spinner from '../../components/Spinner'
import Badge from '../../components/Badge'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import PaymentModal from '../../components/PaymentModal'
import { getAllTrials, getTutor, makeTrialBooking, continueLessons, cancelTrialBooking } from '../../lib/api'

function fmt(dateStr) {
  if (!dateStr) return '–'
  return new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MyTrials({ student, notify }) {
  const [trials, setTrials]       = useState([])
  const [tutorMap, setTutorMap]   = useState({})
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)    // { type: 'continue'|'cancel', trial }
  const [payTrial, setPayTrial]   = useState(null)    // trial object for payment modal
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res  = await getAllTrials()
      const all  = res.data ?? []
      const mine = all.filter(t => t.student_id === student.student_id)
      setTrials(mine)

      const ids = [...new Set(mine.map(t => t.tutor_id))]
      const pairs = await Promise.allSettled(ids.map(id => getTutor(id)))
      const map = {}
      pairs.forEach((p, idx) => {
        if (p.status === 'fulfilled') map[ids[idx]] = p.value.data
      })
      setTutorMap(map)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [student.student_id])

  // ── Scenario 2b — called by PaymentModal after card entry ───
  async function handlePayment(trial) {
    const res = await makeTrialBooking({
      student_id: trial.student_id,
      tutor_id:   trial.tutor_id,
      trial_id:   trial.trial_id,
      trial_date: trial.trial_date,
      start_time: trial.start_time,
      end_time:   trial.end_time,
    })
    load()   // refresh list in background
    return res
  }

  // ── Scenario 2c ─────────────────────────────────────────────
  async function handleContinue(trial) {
    setSubmitting(true)
    try {
      await continueLessons(trial.trial_id, trial.student_id, trial.tutor_id)
      notify('Marked as completed! Your tutor has been notified.')
      setModal(null)
      load()
    } catch {
      notify('Failed to update. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Scenario 3a ─────────────────────────────────────────────
  async function handleCancel(trial) {
    setSubmitting(true)
    try {
      await cancelTrialBooking(trial.student_id, trial.tutor_id, trial.trial_id)
      notify('Trial cancelled. Your tutor has been notified.')
      setModal(null)
      load()
    } catch (err) {
      notify(err?.response?.data?.error ?? 'Failed to cancel trial', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const sorted = [...trials].sort(
    (a, b) => new Date(b.created_at ?? b.trial_date) - new Date(a.created_at ?? a.trial_date)
  )

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">My Trials</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your trial bookings and lessons</p>
        </div>
        <button onClick={load} className="btn-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No trials yet"
          description="Once a tutor accepts your interest, your trial will appear here"
        />
      ) : (
        <div className="space-y-3">
          {sorted.map(trial => {
            const tutor        = tutorMap[trial.tutor_id]
            const isPending    = trial.status === 'PENDING'
            const isConfirmed  = trial.status === 'CONFIRMED'
            const isCancellable = ['PENDING', 'CONFIRMED'].includes(trial.status)

            return (
              <div key={trial.trial_id} className="card p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {tutor?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {tutor?.name ?? `Tutor #${trial.tutor_id}`}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{tutor?.subject ?? '–'} · Trial #{trial.trial_id}</p>
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
                    <p className="text-slate-400 dark:text-slate-500 mb-0.5">Rate</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">SGD {tutor?.rate ?? '–'}/hr</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {isPending && (
                    <button onClick={() => setPayTrial(trial)} className="btn-primary">
                      <CreditCard className="h-3.5 w-3.5" /> Confirm &amp; Pay
                    </button>
                  )}
                  {isConfirmed && (
                    <button onClick={() => setModal({ type: 'continue', trial })} className="btn-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Continue Lessons
                    </button>
                  )}
                  {isCancellable && (
                    <button onClick={() => setModal({ type: 'cancel', trial })} className="btn-secondary">
                      <XCircle className="h-3.5 w-3.5" /> Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Payment modal */}
      <PaymentModal
        open={!!payTrial}
        onClose={() => setPayTrial(null)}
        trial={payTrial}
        tutorName={payTrial ? tutorMap[payTrial.tutor_id]?.name : ''}
        tutorRate={payTrial ? tutorMap[payTrial.tutor_id]?.rate : ''}
        onSuccess={handlePayment}
      />

      {/* Continue Lessons Modal */}
      <Modal open={modal?.type === 'continue'} onClose={() => setModal(null)} title="Continue Lessons">
        {modal?.trial && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Let <strong>{tutorMap[modal.trial.tutor_id]?.name}</strong> know you'd like to continue regular lessons.
              They'll receive a notification.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">Back</button>
              <button onClick={() => handleContinue(modal.trial)} disabled={submitting} className="btn-success flex-1 justify-center">
                {submitting ? <Spinner size="sm" /> : <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm</>}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal open={modal?.type === 'cancel'} onClose={() => setModal(null)} title="Cancel Booking">
        {modal?.trial && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Are you sure you want to cancel your trial with{' '}
              <strong>{tutorMap[modal.trial.tutor_id]?.name}</strong>? They'll be notified immediately.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">Back</button>
              <button onClick={() => handleCancel(modal.trial)} disabled={submitting} className="btn-danger flex-1 justify-center">
                {submitting ? <Spinner size="sm" /> : <><XCircle className="h-3.5 w-3.5" /> Cancel Trial</>}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
