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
          <h2 className="text-xl font-semibold text-slate-900">My Interests</h2>
          <p className="text-sm text-slate-500 mt-1">Track the status of your interest requests</p>
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
        <div className="space-y-3">
          {sorted.map(interest => {
            const tutor = tutorMap[interest.tutor_id]
            return (
              <div key={interest.interest_id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {tutor?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {tutor?.name ?? `Tutor #${interest.tutor_id}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{tutor?.subject ?? '–'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge status={interest.status} />
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(interest.created).toLocaleDateString('en-SG', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {interest.status === 'ACCEPTED' && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-emerald-700 font-medium">
                      Tutor accepted your interest. Check <strong>My Trials</strong> to confirm and pay.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
