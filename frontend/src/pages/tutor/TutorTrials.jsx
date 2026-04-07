import { useState, useEffect } from 'react'
import { Calendar, XCircle, RefreshCw } from 'lucide-react'
import Spinner from '../../components/Spinner'
import Badge from '../../components/Badge'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import { getAllTrials, getStudent, cancelTrialLessons, studentName, studentEmail } from '../../lib/api'

function fmt(dateStr) {
  if (!dateStr) return '–'
  return new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TutorTrials({ tutor, notify }) {
  const [trials, setTrials]         = useState([])
  const [studentMap, setStudentMap] = useState({})
  const [loading, setLoading]       = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tutor.tutor_id])

  // ── Scenario 3b: Tutor cancels & refunds ────────────────────
  async function handleCancel() {
    setSubmitting(true)
    try {
      const res = await cancelTrialLessons(cancelTarget.trial_id)
      const refund = res.data?.credit_refund?.balance
      notify(`Trial cancelled. Student has been refunded SGD ${refund ?? 50} in credits.`)
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
          <h2 className="text-xl font-semibold text-slate-900">My Trials</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your scheduled trial lessons</p>
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

            return (
              <div key={trial.trial_id} className="card p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {studentName(student)?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {studentName(student) !== '–' ? studentName(student) : `Student #${trial.student_id}`}
                      </p>
                      <p className="text-xs text-slate-400">
                        {studentEmail(student)} · Trial #{trial.trial_id}
                      </p>
                    </div>
                  </div>
                  <Badge status={trial.status} />
                </div>

                <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3 mb-4 text-xs">
                  <div>
                    <p className="text-slate-400 mb-0.5">Date</p>
                    <p className="font-medium text-slate-700">{fmt(trial.trial_date)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-0.5">Time</p>
                    <p className="font-medium text-slate-700">
                      {trial.start_time?.slice(0, 5)} – {trial.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-0.5">Subject</p>
                    <p className="font-medium text-slate-700">{trial.subject ?? tutor.subject ?? '–'}</p>
                  </div>
                </div>

                {trial.notes && (
                  <p className="text-xs text-slate-500 mb-4 italic">"{trial.notes}"</p>
                )}

                {isCancellable && (
                  <button onClick={() => setCancelTarget(trial)} className="btn-danger">
                    <XCircle className="h-3.5 w-3.5" /> Cancel & Refund
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Cancel Modal */}
      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Trial & Refund">
        {cancelTarget && (
          <>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to cancel Trial #{cancelTarget.trial_id}?
              The student will be notified and <strong>SGD 50 in credits</strong> will be refunded to them.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-5">
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
