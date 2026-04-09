import { useState, useEffect } from 'react'
import { BookMarked, RefreshCw } from 'lucide-react'
import Spinner from '../../components/Spinner'
import Badge from '../../components/Badge'
import EmptyState from '../../components/EmptyState'
import { getInterestsByStudent, getTutor } from '../../lib/api'

export default function MyInterests({ student }) {
  const [interests, setInterests] = useState([])
  const [tutorMap, setTutorMap]   = useState({})
  const [loading, setLoading]     = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await getInterestsByStudent(student.student_id)
      const list = res.data ?? []
      setInterests(list)

      // Fetch tutor names for each unique tutor_id
      const ids = [...new Set(list.map(i => i.tutor_id))]
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

  const sorted = [...interests].sort((a, b) => new Date(b.created) - new Date(a.created))

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">My Interests</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track the status of your interest requests</p>
        </div>
        <button onClick={load} className="btn-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="No interests yet"
          description="Browse tutors and indicate interest to get started"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(interest => {
            const tutor = tutorMap[interest.tutor_id]
            return (
              <div key={interest.interest_id}
                className="card overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                {/* Top accent stripe */}
                <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

                <div className="p-5 flex flex-col gap-4 flex-1">
                  {/* Avatar + name */}
                  <div className="flex items-start gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-sm">
                      {tutor?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="font-semibold text-slate-900 dark:text-white truncate text-sm">
                        {tutor?.name ?? `Tutor #${interest.tutor_id}`}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                        {tutor?.subject ?? 'General'}
                      </span>
                    </div>
                  </div>

                  {/* Status + date */}
                  <div className="flex items-center justify-between">
                    <Badge status={interest.status} />
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(interest.created).toLocaleDateString('en-SG', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>

                  {interest.status === 'ACCEPTED' && (
                    <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/60">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                        Tutor accepted — check <strong>My Trials</strong> to confirm and pay.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
