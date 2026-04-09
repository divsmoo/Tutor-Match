import { useState, useEffect } from 'react'
import { Users, RefreshCw, CheckCircle2, CalendarCheck } from 'lucide-react'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import { getInterestedStudents, getInterestsByTutor, acceptStudent, studentName } from '../../lib/api'

export default function InterestedStudents({ tutor, notify }) {
  const [students, setStudents]   = useState([])
  const [interests, setInterests] = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)  // { student, interest }
  const [form, setForm]           = useState({ trial_date: '', start_time: '', end_time: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [studentsRes, interestsRes] = await Promise.all([
        getInterestedStudents(tutor.tutor_id),
        getInterestsByTutor(tutor.tutor_id),
      ])
      setStudents(studentsRes.data ?? [])
      setInterests(interestsRes.data ?? [])
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tutor.tutor_id])

  // Match student to their PENDING interest
  function getInterest(studentId) {
    return interests.find(i => i.student_id === studentId && i.status === 'PENDING')
  }

  function openAccept(student) {
    const interest = getInterest(student.student_id)
    if (!interest) { notify('No active interest record found for this student.', 'error'); return }
    setSelected({ student, interest })
    setForm({ trial_date: '', start_time: '', end_time: '', notes: '' })
  }

  async function handleAccept(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await acceptStudent({
        interest_id:    selected.interest.interest_id,
        proposed_dates: [form.trial_date],
        trial_date:     form.trial_date,
        start_time:     form.start_time,
        end_time:       form.end_time,
        notes:          form.notes,
      })
      notify(`${studentName(selected.student)} accepted! A trial has been created and they've been notified.`)
      setSelected(null)
      load()
    } catch (err) {
      const msg = err?.response?.data?.error ?? 'Failed to accept student'
      notify(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Interested Students</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Students who have indicated interest in your tutoring</p>
        </div>
        <button onClick={load} className="btn-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No interested students yet"
          description="Students who indicate interest in you will appear here"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map(student => {
            const interest = getInterest(student.student_id)
            return (
              <div key={student.student_id}
                className="card overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                {/* Top accent stripe */}
                <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

                <div className="p-5 flex flex-col gap-4 flex-1">
                  {/* Avatar + name */}
                  <div className="flex items-start gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-sm">
                      {studentName(student)?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="font-semibold text-slate-900 dark:text-white truncate text-sm">{studentName(student)}</p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                        Student #{student.student_id}
                      </span>
                    </div>
                  </div>

                  {/* Request date */}
                  {interest && (
                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                      <span>Requested</span>
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {new Date(interest.created).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {/* Action */}
                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    {interest ? (
                      <button onClick={() => openAccept(student)} className="btn-primary w-full justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accept & Schedule
                      </button>
                    ) : (
                      <button disabled className="btn-secondary w-full justify-center opacity-60 cursor-not-allowed">
                        <CalendarCheck className="h-3.5 w-3.5" /> Trial Date Set
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Accept Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Accept Student & Schedule Trial">
        {selected && (
          <form onSubmit={handleAccept} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Schedule a trial lesson with <strong>{studentName(selected.student)}</strong>.
              They'll receive an email with the details.
            </p>

            <div>
              <label className="label">Trial Date</label>
              <input type="date" required
                min={new Date().toISOString().split('T')[0]}
                value={form.trial_date}
                onChange={e => setForm(f => ({ ...f, trial_date: e.target.value }))}
                className="input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Time</label>
                <input type="time" required
                  value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">End Time</label>
                <input type="time" required
                  value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any preparation notes for the student…"
                rows={2}
                className="input resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setSelected(null)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                {submitting ? <Spinner size="sm" /> : <><CheckCircle2 className="h-3.5 w-3.5" /> Accept</>}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
