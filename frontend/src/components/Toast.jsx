import { useEffect } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null

  const isSuccess = toast.type === 'success'
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto z-50 animate-in slide-in-from-bottom-4">
      <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border sm:max-w-sm
        ${isSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
        {isSuccess
          ? <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          : <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
        <p className="text-sm font-medium flex-1">{toast.message}</p>
        <button onClick={onClose} className="text-current opacity-50 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
