import axios from 'axios'

// The student API stores name inside details.studentName (not top-level).
// Use this helper everywhere you need the student's display name.
export function studentName(student) {
  return student?.details?.studentName ?? student?.name ?? '–'
}

export function studentEmail(student) {
  return student?.details?.studentEmail ?? '–'
}

// Direct service ports — Kong routing is used where paths align exactly.
// Composite services with sub-routes are called directly for reliability.
const SVC = {
  tutor:                'http://localhost:5001',
  student:              'http://localhost:5002',
  interest:             'http://localhost:5003',
  trials:               'http://localhost:5004',
  payment:              'http://localhost:5005',
  credit:               'http://localhost:5007',
  indicateInterest:     'http://localhost:5010',
  getInterestedStudents:'http://localhost:5011',
  acceptStudent:        'http://localhost:5012',
  makeTrialBooking:     'http://localhost:5013',
  continueLessons:      'http://localhost:5014',
  cancelTrialBooking:   'http://localhost:5015',
  cancelTrialLessons:   'http://localhost:5016',
}

const get  = (base, path, params) => axios.get(`${base}${path}`, { params }).then(r => r.data)
const post = (base, path, body)   => axios.post(`${base}${path}`, body).then(r => r.data)
const put  = (base, path, body)   => axios.put(`${base}${path}`, body).then(r => r.data)

// ── Atomic ──────────────────────────────────────────────────────
export const getTutors      = ()    => get(SVC.tutor, '/tutor')
export const getTutor       = (id)  => get(SVC.tutor, `/tutor/${id}`)
export const getStudent     = (id)  => get(SVC.student, `/student/${id}`)

export const getInterestsByStudent = (studentId) =>
  get(SVC.interest, `/interest/student/${studentId}`)
export const getInterestsByTutor = (tutorId) =>
  get(SVC.interest, `/interest/tutor/${tutorId}`)

export const getAllTrials = () => get(SVC.trials, '/trials')

export const getStudentCredit = (studentId) =>
  post(SVC.credit, '/graphql', {
    query: `query { credit(studentId: ${studentId}) { student_id balance } }`,
  })

// ── Scenario 1: Student indicates interest ──────────────────────
export const indicateInterest = (studentId, tutorId, studentName) =>
  post(SVC.indicateInterest, '/indicate-interest', {
    student_id: studentId,
    tutor_id: tutorId,
    student_name: studentName,
  })

// ── Scenario 2a: Tutor views interested students & accepts ──────
export const getInterestedStudents = (tutorId) =>
  get(SVC.getInterestedStudents, `/interested-students/${tutorId}`)

export const acceptStudent = (payload) =>
  post(SVC.acceptStudent, '/accept-student', payload)

// ── Scenario 2b: Student confirms trial & pays ──────────────────
export const makeTrialBooking = (payload) =>
  post(SVC.makeTrialBooking, '/make-trial-booking', payload)

// ── Scenario 2c: Student continues lessons ──────────────────────
export const continueLessons = (trialId, studentId, tutorId) =>
  post(SVC.continueLessons, '/continue-lessons', {
    trial_id: trialId,
    student_id: studentId,
    tutor_id: tutorId,
  })

// ── Scenario 3a: Student cancels trial ──────────────────────────
export const getCancellableTrials = (studentId, tutorId) =>
  get(SVC.cancelTrialBooking, '/trials/available-dates', {
    student_id: studentId,
    tutor_id: tutorId,
  })

export const cancelTrialBooking = (studentId, tutorId, trialId) =>
  post(SVC.cancelTrialBooking, '/cancel-trial-booking', {
    student_id: studentId,
    tutor_id: tutorId,
    trial_id: trialId,
  })

// ── Scenario 3b: Tutor cancels trial & refunds ──────────────────
export const cancelTrialLessons = (trialId) =>
  post(SVC.cancelTrialLessons, '/cancel-trial', { trial_id: trialId })
