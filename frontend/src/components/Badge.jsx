const COLORS = {
  PENDING:         'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_PAYMENT: 'bg-orange-50 text-orange-700 border-orange-200',
  ACCEPTED:        'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  COMPLETED:       'bg-indigo-50 text-indigo-700 border-indigo-200',
  EXPIRED:         'bg-slate-100 text-slate-500 border-slate-200',
  CANCELLED:       'bg-red-50 text-red-600 border-red-200',
  USER_CANCELLED:  'bg-red-50 text-red-600 border-red-200',
  TUTOR_CANCELLED: 'bg-red-50 text-red-600 border-red-200',
}

export default function Badge({ status }) {
  const cls = COLORS[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${cls}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}
