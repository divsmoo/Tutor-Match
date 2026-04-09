import axios from 'axios'

// The student API stores name inside details.studentName (not top-level).
// Use this helper everywhere you need the student's display name.
export function studentName(student) {
  return student?.details?.studentName ?? student?.name ?? '–'
}

export function studentEmail(student) {
  return student?.details?.studentEmail ?? '–'
}

// All requests route through Kong on port 8000.
// The API key is attached as the apikey header for key-auth authentication.
const KONG = 'http://localhost:8000'
const KONG_KEY = 'tm-frontend-api-key-2026'

const kongHeaders = { apikey: KONG_KEY }

const get  = (path, params) => axios.get(`${KONG}${path}`,   { params, headers: kongHeaders }).then(r => r.data)
const post = (path, body)   => axios.post(`${KONG}${path}`,  body,   { headers: kongHeaders }).then(r => r.data)
const put  = (path, body)   => axios.put(`${KONG}${path}`,   body,   { headers: kongHeaders }).then(r => r.data)

// ── Atomic ──────────────────────────────────────────────────────
export const getTutors      = ()    => get('/tutor')
export const getTutor       = (id)  => get(`/tutor/${id}`)
export const getStudent     = (id)  => get(`/student/${id}`)

export const getInterestsByStudent = (studentId) =>
  get(`/interest/student/${studentId}`)
export const getInterestsByTutor = (tutorId) =>
  get(`/interest/tutor/${tutorId}`)

export const getAllTrials = () => get('/trials')

export const getStudentCredit = (studentId) =>
  post('/graphql', {
    query: `query { credit(studentId: ${studentId}) { student_id balance } }`,
  })

// ── Scenario 1: Student indicates interest ──────────────────────
export const indicateInterest = (studentId, tutorId, sName) =>
  post('/indicate-interest', {
    student_id: studentId,
    tutor_id: tutorId,
    student_name: sName,
  })

// ── Scenario 2a: Tutor views interested students & accepts ──────
export const getInterestedStudents = (tutorId) =>
  get(`/interested-students/${tutorId}`)

export const acceptStudent = (payload) =>
  post('/accept-student', payload)

// ── Scenario 2b: Student confirms trial & pays ──────────────────
// Step 1: Create Stripe PaymentIntent, get client_secret back
export const initiatePayment = (payload) =>
  post('/initiate-payment', payload)

// Step 2: After Stripe confirms card on frontend, finalise booking
export const confirmBooking = (payload) =>
  post('/confirm-booking', payload)

// Legacy single-step (kept for compatibility)
export const makeTrialBooking = (payload) =>
  post('/make-trial-booking', payload)

// ── Scenario 2c: Student continues lessons ──────────────────────
export const continueLessons = (trialId, studentId, tutorId) =>
  post('/continue-lessons', {
    trial_id: trialId,
    student_id: studentId,
    tutor_id: tutorId,
  })

// ── Scenario 3a: Student cancels trial ──────────────────────────
export const getCancellableTrials = (studentId, tutorId) =>
  get('/trials/available-dates', {
    student_id: studentId,
    tutor_id: tutorId,
  })

export const cancelTrialBooking = (studentId, tutorId, trialId) =>
  post('/cancel-trial-booking', {
    student_id: studentId,
    tutor_id: tutorId,
    trial_id: trialId,
  })

// ── Scenario 3b: Tutor cancels trial & refunds ──────────────────
export const cancelTrialLessons = (trialId) =>
  post('/cancel-trial', { trial_id: trialId })
