export type Domain = 'academic' | 'lnd' | 'mooc'

export type DomainRole =
  'admin' | 'faculty' | 'facilitator' | 'student' | 'learner' | 'mooc_learner' | 'guardian'

export interface Profile {
  id: string
  user_id: string
  display_name: string
  external_id: string | null
  email: string | null
  avatar_url: string | null
}

export interface DomainMembership {
  id: string
  user_id: string
  domain: Domain
  role: DomainRole
  organization_id: string | null
}

export interface Offering {
  id: string
  title: string
  description: string | null
  code: string | null
  domain: Domain
  organization_id: string | null
  offering_type: string
  is_published: boolean
  is_public: boolean
  is_paid: boolean
  payment_status: string
  start_date: string | null
  end_date: string | null
  pacing: string
  created_by: string | null
}

export interface Enrollment {
  id: string
  user_id: string
  offering_id: string
  role: string
  status: string
  enrolled_at: string
  completed_at: string | null
}

export interface Lesson {
  id: string
  offering_id: string
  title: string
  content: string | null
  lesson_type: string
  order_index: number
  is_published: boolean
}

export interface Quiz {
  id: string
  offering_id: string
  title: string
  description: string | null
  quiz_type: string
  max_attempts: number
  time_limit_minutes: number | null
  open_at: string | null
  close_at: string | null
  is_published: boolean
  feedback_release: string
  total_points: number
}

export interface Question {
  id: string
  quiz_id: string
  question_text: string
  question_type: string
  points: number
  options: any[] | null
  order_index: number
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  user_id: string
  attempt_number: number
  status: string
  started_at: string
  submitted_at: string | null
  score: number | null
  max_score: number | null
  autosave_state: any
}

export interface QuizAnswer {
  id: string
  attempt_id: string
  question_id: string
  answer_data: any
  is_correct: boolean | null
  points_awarded: number
}

export interface Assignment {
  id: string
  offering_id: string
  title: string
  description: string | null
  max_points: number
  due_date: string | null
  allow_late: boolean
  allow_resubmission: boolean
  is_published: boolean
}

export interface Submission {
  id: string
  assignment_id: string
  user_id: string
  content: string | null
  file_url: string | null
  status: string
  grade: number | null
  feedback: string | null
  graded_by: string | null
  graded_at: string | null
  extension_due_date: string | null
  prior_submission_id: string | null
  submitted_at: string
}

export interface Grade {
  id: string
  offering_id: string
  user_id: string
  item_name: string
  item_type: string
  item_id: string | null
  score: number
  max_score: number
  weight: number
  is_released: boolean
  graded_by: string | null
  graded_at: string
}

export interface AttendanceSession {
  id: string
  offering_id: string
  session_date: string
  label: string | null
  created_by: string | null
}

export interface AttendanceRecord {
  id: string
  session_id: string
  user_id: string
  status: string
  recorded_by: string | null
  recorded_at: string
}

export interface Notification {
  id: string
  user_id: string
  domain: string | null
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export interface AuditLogEntry {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  domain: string | null
  before_value: any
  after_value: any
  reason: string | null
  created_at: string
}

export interface IntegrationLogEntry {
  id: string
  source_system: string
  source_batch_id: string | null
  action: string
  status: string
  records_processed: number
  records_accepted: number
  records_rejected: number
  error_detail: string | null
  source_timestamp: string | null
  replayed_at: string | null
}

export interface Competency {
  id: string
  offering_id: string
  name: string
  description: string | null
}

export interface LearnerCompetency {
  id: string
  competency_id: string
  user_id: string
  evidence_type: string
  evidence_id: string | null
  is_met: boolean
  met_at: string | null
}

export interface Certificate {
  id: string
  offering_id: string
  user_id: string
  certificate_number: string
  issued_at: string
  status: string
  revoked_reason: string | null
  revoked_at: string | null
  verification_code: string
}
