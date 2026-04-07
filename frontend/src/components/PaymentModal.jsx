import { useState } from 'react'
import { X, Lock, CheckCircle2, CreditCard, AlertCircle } from 'lucide-react'
import Spinner from './Spinner'

// ── Card utilities ────────────────────────────────────────────
function formatCardNumber(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2)
  return digits
}

function detectCardType(number) {
  const n = number.replace(/\s/g, '')
  if (/^4/.test(n))      return 'Visa'
  if (/^5[1-5]/.test(n)) return 'Mastercard'
  if (/^3[47]/.test(n))  return 'Amex'
  return null
}

function isExpiryValid(expiry) {
  const [mm, yy] = expiry.split('/')
  if (!mm || !yy || mm.length < 2 || yy.length < 2) return false
  const now  = new Date()
  const exp  = new Date(2000 + parseInt(yy), parseInt(mm) - 1)
  return exp > now
}

// ── Component ─────────────────────────────────────────────────
export default function PaymentModal({ open, onClose, trial, tutorName, tutorRate, onSuccess }) {
  const [form, setForm] = useState({ name: '', number: '', expiry: '', cvv: '' })
  const [errors, setErrors]     = useState({})
  const [state, setState]       = useState('idle')  // idle | processing | success | error
  const [txnId, setTxnId]       = useState('')
  const [apiError, setApiError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  function validate() {
    const errs = {}
    if (!form.name.trim())               errs.name   = 'Cardholder name is required.'
    const raw = form.number.replace(/\s/g, '')
    if (raw.length < 13)                 errs.number = 'Enter a valid card number.'
    if (!isExpiryValid(form.expiry))     errs.expiry = 'Enter a valid expiry date.'
    if (form.cvv.length < 3)             errs.cvv    = 'Enter a valid CVV.'
    return errs
  }

  async function handlePay() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setState('processing')
    setApiError('')

    // Simulate a brief processing delay for UX realism
    await new Promise(r => setTimeout(r, 1500))

    try {
      const res = await onSuccess(trial)
      const id = res?.transaction_id ?? res?.data?.transaction_id ?? `TXN-${trial.trial_id}-${trial.student_id}`
      setTxnId(id)
      setState('success')
    } catch (err) {
      const msg = err?.response?.data?.error
        ?? err?.response?.data?.details
        ?? 'Payment could not be processed. Please try again.'
      setApiError(msg)
      setState('error')
    }
  }

  function handleClose() {
    if (state === 'processing') return
    // Reset on close
    setTimeout(() => { setForm({ name: '', number: '', expiry: '', cvv: '' }); setErrors({}); setState('idle'); setApiError('') }, 200)
    onClose()
  }

  if (!open) return null

  const amount  = tutorRate ?? '–'
  const cardType = detectCardType(form.number)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">

        {/* ── Success state ─────────────────────────────────── */}
        {state === 'success' && (
          <div className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8 text-green-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Confirmed!</h3>
            <p className="text-sm text-slate-500 mb-4">
              Your trial with <strong>{tutorName}</strong> is now confirmed.
              A confirmation email has been sent to you and your tutor.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2 mb-6 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount charged</span>
                <span className="font-semibold text-slate-900">SGD {amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-mono font-medium text-slate-700">{txnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="text-green-700 font-medium">Success</span>
              </div>
            </div>
            <button onClick={handleClose} className="btn-primary w-full justify-center">
              Done
            </button>
          </div>
        )}

        {/* ── Idle / Processing / Error state ───────────────── */}
        {state !== 'success' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-700" />
                <h3 className="text-sm font-semibold text-slate-900">Secure Payment</h3>
              </div>
              <button onClick={handleClose} disabled={state === 'processing'}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Order summary */}
              <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2">
                <p className="font-medium text-slate-700 mb-2">Order Summary</p>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trial with</span>
                  <span className="font-medium text-slate-800">{tutorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium text-slate-800">
                    {trial?.trial_date ? new Date(trial.trial_date).toLocaleDateString('en-SG', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    }) : '–'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time</span>
                  <span className="font-medium text-slate-800">
                    {trial?.start_time?.slice(0,5)} – {trial?.end_time?.slice(0,5)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 mt-1">
                  <span className="font-semibold text-slate-800">Total</span>
                  <span className="font-bold text-slate-900 text-sm">SGD {amount}</span>
                </div>
              </div>

              {/* Card form */}
              <div className="space-y-3">
                <div>
                  <label className="label">Cardholder name</label>
                  <input type="text" placeholder="Jane Doe" autoComplete="cc-name"
                    value={form.name} onChange={e => set('name', e.target.value)}
                    disabled={state === 'processing'} className="input" />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="label">Card number</label>
                  <div className="relative">
                    <input type="text" inputMode="numeric" placeholder="1234 5678 9012 3456"
                      autoComplete="cc-number"
                      value={form.number}
                      onChange={e => set('number', formatCardNumber(e.target.value))}
                      disabled={state === 'processing'} className="input pr-20" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-slate-400">
                      {cardType
                        ? <span className="font-medium text-slate-600">{cardType}</span>
                        : <CreditCard className="h-4 w-4" />}
                    </div>
                  </div>
                  {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Expiry date</label>
                    <input type="text" inputMode="numeric" placeholder="MM/YY" autoComplete="cc-exp"
                      value={form.expiry}
                      onChange={e => set('expiry', formatExpiry(e.target.value))}
                      disabled={state === 'processing'} className="input" />
                    {errors.expiry && <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>}
                  </div>
                  <div>
                    <label className="label">CVV</label>
                    <input type="text" inputMode="numeric" placeholder="123" autoComplete="cc-csc"
                      maxLength={4}
                      value={form.cvv}
                      onChange={e => set('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                      disabled={state === 'processing'} className="input" />
                    {errors.cvv && <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>}
                  </div>
                </div>
              </div>

              {/* API error */}
              {state === 'error' && apiError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* Security note */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Lock className="h-3 w-3" />
                <span>Your payment information is encrypted and secure</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={handleClose} disabled={state === 'processing'}
                className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button onClick={handlePay} disabled={state === 'processing'}
                className="btn-primary flex-1 justify-center">
                {state === 'processing'
                  ? <><Spinner size="sm" /> Processing…</>
                  : <>Pay SGD {amount}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
