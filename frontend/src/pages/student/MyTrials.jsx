import { useState, useEffect } from 'react'
import { Calendar, CheckCircle2, XCircle, RefreshCw, CreditCard, Wallet, Mail, AlertCircle } from 'lucide-react'
import Spinner from '../../components/Spinner'
import Badge from '../../components/Badge'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import PaymentModal from '../../components/PaymentModal'
import { getAllTrials, getTutor, continueLessons, cancelTrialBooking } from '../../lib/api'
import { supabase } from '../../lib/supabase'

// ── Improvement 2: Trial status timeline ──────────────────────
const STEPS = ['Proposed', 'Payment', 'Confirmed', 'Completed']

function statusToStep(status) {
  if (['USER_CANCELLED', 'TUTOR_CANCELLED'].includes(status)) return -1
  if (status === 'PENDING')         return 0
  if (status === 'PENDING_PAYMENT') return 1
  if (status === 'CONFIRMED')       return 2
  if (status === 'COMPLETED')       return 3
  return 0
}

function StatusTimeline({ status }) {
  const step = statusToStep(status)
  const cancelled = step === -1
  if (cancelled) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-4">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">
          {status === 'USER_CANCELLED' ? 'You cancelled this trial' : 'Tutor cancelled this trial'}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center mb-4">
      {STEPS.map((label, i) => {
        const done    = i < step
        const current = i === step
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 transition-colors ${
                done    ? 'bg-blue-700 text-white ring-blue-700' :
                current ? 'bg-white dark:bg-slate-800 text-blue-700 ring-blue-700' :
                          'bg-slate-100 dark:bg-slate-700 text-slate-400 ring-slate-200 dark:ring-slate-600'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] whitespace-nowrap font-medium ${
                done || current ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
              }`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 transition-colors ${
                i < step ? 'bg-blue-700' : 'bg-slate-200 dark:bg-slate-600'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

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
  const [credit, setCredit]       = useState(null)

  async function loadCredit() {
    try {
      const { data } = await supabase
        .from('credit')
        .select('balance')
        .eq('student_id', student.student_id)
        .single()
      setCredit(data?.balance ?? null)
    } catch {
      // credit display is non-critical, fail silently
    }
  }

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

  useEffect(() => {
    load()
    loadCredit()

    const channel = supabase
      .channel(`credit:${student.student_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credit', filter: `student_id=eq.${student.student_id}` },
        payload => setCredit(payload.new?.balance ?? null),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [student.student_id])

  // ── Scenario 2b — called by PaymentModal after Stripe confirms ──
  function handleBooked() {
    notify('Payment confirmed! Your trial is now booked.')
    setPayTrial(null)
    load()
    loadCredit()
  }

  // ── Scenario 2c ─────────────────────────────────────────────
  async function handleContinue(trial) {
    setSubmitting(true)
    try {
      await continueLessons(trial.trial_id, trial.student_id, trial.tutor_id)
      notify('Marked as completed! Your tutor has been notified.')
      setModal({ type: 'contact', trial })
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
      loadCredit()
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <Wallet className="h-3.5 w-3.5" />
            {credit === null ? '–' : `SGD ${Number(credit).toFixed(2)}`}
          </div>
          <button onClick={load} className="btn-secondary">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
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
            const isPending    = ['PENDING', 'PENDING_PAYMENT'].includes(trial.status)
            const isConfirmed  = trial.status === 'CONFIRMED'
            const isCompleted  = trial.status === 'COMPLETED'
            const isCancellable = ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED'].includes(trial.status)

            return (
              <div key={trial.trial_id} className="card overflow-hidden hover:shadow-md transition-shadow">
                {/* Top accent stripe */}
                <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-sm">
                      {tutor?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">
                        {tutor?.name ?? `Tutor #${trial.tutor_id}`}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                        {tutor?.subject ?? 'General'}
                      </span>
                    </div>
                  </div>
                  <Badge status={trial.status} />
                </div>

                <StatusTimeline status={trial.status} />

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

                {isCompleted && tutor?.contact_info && (
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 py-2 mb-3 text-xs">
                    <Mail className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Tutor email:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 break-all">{tutor.contact_info}</span>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap pt-1">
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
        onBooked={handleBooked}
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

      {/* Contact Reveal Modal — shown after student confirms continuing lessons */}
      <Modal open={modal?.type === 'contact'} onClose={() => setModal(null)} title="Tutor Contact Info">
        {modal?.trial && (() => {
          const tutor = tutorMap[modal.trial.tutor_id]
          return (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Great! <strong>{tutor?.name}</strong> has been notified. You can now reach them directly:
              </p>
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 break-all">
                  {tutor?.contact_info ?? '–'}
                </span>
              </div>
              <button onClick={() => setModal(null)} className="btn-primary w-full justify-center">Done</button>
            </>
          )
        })()}
      </Modal>
    </div>
  )
}
