import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { X, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import Spinner from './Spinner'
import { initiatePayment, confirmBooking } from '../lib/api'
import { useTheme } from '../lib/theme'

// Load Stripe once at module level (never re-created on re-render)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// ── Inner form (must live inside <Elements>) ──────────────────
function CardForm({ trial, tutorName, tutorRate, clientSecret, onClose, onBooked }) {
  const stripe   = useStripe()
  const elements = useElements()
  const { dark } = useTheme()

  const [state, setState]       = useState('idle')   // idle | processing | success | error
  const [apiError, setApiError] = useState('')
  const [txnId, setTxnId]       = useState('')

  const cardStyle = {
    style: {
      base: {
        fontSize: '14px',
        color: dark ? '#e2e8f0' : '#1e293b',
        fontFamily: 'Inter, system-ui, sans-serif',
        '::placeholder': { color: dark ? '#64748b' : '#94a3b8' },
      },
      invalid: { color: '#ef4444' },
    },
  }

  async function handlePay() {
    if (!stripe || !elements) return
    setState('processing')
    setApiError('')

    const cardElement = elements.getElement(CardElement)

    // Confirm the card payment with Stripe
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    })

    if (error) {
      setApiError(error.message ?? 'Card payment failed. Please try again.')
      setState('error')
      return
    }

    // Stripe charged the card — now tell our backend to confirm the trial
    try {
      await confirmBooking({
        trial_id:          trial.trial_id,
        student_id:        trial.student_id,
        tutor_id:          trial.tutor_id,
        trial_date:        trial.trial_date,
        start_time:        trial.start_time,
        end_time:          trial.end_time,
        payment_intent_id: paymentIntent.id,
      })
      setTxnId(paymentIntent.id)
      setState('success')
      onBooked()   // refresh the trials list
    } catch (err) {
      // Payment succeeded but booking record failed — very edge case
      const msg = err?.response?.data?.error ?? 'Booking confirmation failed. Contact support.'
      setApiError(msg)
      setState('error')
    }
  }

  const amount = tutorRate ?? '–'

  // ── Success ────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <div className="p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="h-8 w-8 text-green-700 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Payment Confirmed!</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Your trial with <strong>{tutorName}</strong> is now confirmed.
          A confirmation email has been sent to you and your tutor.
        </p>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-xs space-y-2 mb-6 text-left">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Amount charged</span>
            <span className="font-semibold text-slate-900 dark:text-white">SGD {amount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Payment ID</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-200 truncate max-w-[180px]">{txnId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Status</span>
            <span className="text-green-700 dark:text-green-400 font-medium">Success</span>
          </div>
        </div>
        <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
      </div>
    )
  }

  // ── Idle / Processing / Error ──────────────────────────────
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-green-700 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Secure Payment</h3>
        </div>
        <button onClick={onClose} disabled={state === 'processing'}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
        {/* Order summary */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-xs space-y-2">
          <p className="font-medium text-slate-700 dark:text-slate-200 mb-2">Order Summary</p>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Trial with</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{tutorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Date</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {trial?.trial_date ? new Date(trial.trial_date).toLocaleDateString('en-SG', {
                day: 'numeric', month: 'short', year: 'numeric'
              }) : '–'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Time</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {trial?.start_time?.slice(0, 5)} – {trial?.end_time?.slice(0, 5)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-600 mt-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Total</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">SGD {amount}</span>
          </div>
        </div>

        {/* Stripe CardElement */}
        <div>
          <label className="label">Card details</label>
          <div className="input py-3">
            <CardElement options={cardStyle} />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
            Test card: 4242 4242 4242 4242 · Any future date · Any 3-digit CVC
          </p>
        </div>

        {/* API / Stripe error */}
        {state === 'error' && apiError && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Security note */}
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <Lock className="h-3 w-3" />
          <span>Payments are processed securely by Stripe. We never store your card details.</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 px-4 sm:px-6 pb-5 sm:pb-6">
        <button onClick={onClose} disabled={state === 'processing'}
          className="btn-secondary flex-1 justify-center">
          Cancel
        </button>
        <button onClick={handlePay} disabled={state === 'processing' || !stripe}
          className="btn-primary flex-1 justify-center">
          {state === 'processing'
            ? <><Spinner size="sm" /> Processing…</>
            : <>Pay SGD {amount}</>}
        </button>
      </div>
    </>
  )
}

// ── Outer modal (manages clientSecret lifecycle) ──────────────
export default function PaymentModal({ open, onClose, trial, tutorName, tutorRate, onBooked }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [initError, setInitError]       = useState('')
  const [initLoading, setInitLoading]   = useState(false)

  // Fetch a new PaymentIntent whenever the modal opens with a trial
  useEffect(() => {
    if (!open || !trial) return
    setClientSecret(null)
    setInitError('')
    setInitLoading(true)

    initiatePayment({
      student_id: trial.student_id,
      tutor_id:   trial.tutor_id,
      trial_id:   trial.trial_id,
    })
      .then(res => setClientSecret(res.client_secret))
      .catch(err => {
        const msg = err?.response?.data?.error ?? 'Could not initialise payment. Please try again.'
        setInitError(msg)
      })
      .finally(() => setInitLoading(false))
  }, [open, trial?.trial_id])

  function handleClose() {
    // Reset so next open starts fresh
    setClientSecret(null)
    setInitError('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md overflow-hidden">

        {/* Loading PaymentIntent */}
        {initLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Preparing secure checkout…</p>
          </div>
        )}

        {/* Init error */}
        {!initLoading && initError && (
          <div className="p-8">
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400 mb-5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{initError}</span>
            </div>
            <button onClick={handleClose} className="btn-secondary w-full justify-center">Close</button>
          </div>
        )}

        {/* Stripe Elements card form */}
        {!initLoading && clientSecret && (
          <Elements stripe={stripePromise}>
            <CardForm
              trial={trial}
              tutorName={tutorName}
              tutorRate={tutorRate}
              clientSecret={clientSecret}
              onClose={handleClose}
              onBooked={onBooked ?? (() => {})}
            />
          </Elements>
        )}
      </div>
    </div>
  )
}
