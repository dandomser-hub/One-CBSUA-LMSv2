/*
# VLPv2 Learning Content Schema — Lessons, Quizzes, Assignments, Grades, Attendance, Notifications, Audit

1. New Tables
- `lessons` — Ordered content items within an offering (text, files, links)
- `quizzes` — Assessment definitions with timing, attempts, availability
- `questions` — Individual questions belonging to a quiz
- `quiz_attempts` — Learner attempt sessions with autosave state
- `quiz_answers` — Individual answers within an attempt (supports disconnect/resume)
- `assignments` — Assignment definitions with deadlines and extensions
- `submissions` — Learner submissions for assignments
- `grades` — Gradebook entries with release control and audit
- `attendance_sessions` — Attendance taking sessions
- `attendance_records` — Individual attendance records per learner per session
- `notifications` — In-app notifications scoped to domain
- `audit_log` — Tracks privileged changes (actor, action, entity, before/after)
- `integration_log` — Tracks ERP integration runs with status and replay support
- `competencies` — L&D competency definitions
- `learner_competencies` — Maps completion evidence to competencies
- `certificates` — MOOC certificate issuance with verification and revocation

2. Security
- RLS on all tables with ownership and faculty/facilitator/admin access patterns
- Quiz answers and attempts support autosave ( learner can update own attempt )
- Grades enforce release control: learners see only released grades
- Audit log is insert-only for authenticated users, readable by admins

3. Important Notes
- Quiz attempts store autosave_state JSONB for disconnect/resume resilience
- Submissions preserve history via resubmission_link to prior submission
- Integration log supports replay idempotency via source_batch_id
*/

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  lesson_type text NOT NULL DEFAULT 'text' CHECK (lesson_type IN ('text', 'file', 'link', 'folder', 'page')),
  order_index integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_lessons" ON lessons;
CREATE POLICY "select_lessons" ON lessons FOR SELECT
  TO authenticated USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM offerings o WHERE o.id = lessons.offering_id AND o.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM enrollments e WHERE e.offering_id = lessons.offering_id AND e.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_lessons" ON lessons;
CREATE POLICY "insert_lessons" ON lessons FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = lessons.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role IN ('admin','faculty','facilitator'))
  );

DROP POLICY IF EXISTS "update_lessons" ON lessons;
CREATE POLICY "update_lessons" ON lessons FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = lessons.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = lessons.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_lessons" ON lessons;
CREATE POLICY "delete_lessons" ON lessons FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = lessons.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  quiz_type text NOT NULL DEFAULT 'practice' CHECK (quiz_type IN ('practice', 'short_quiz', 'long_quiz', 'examination')),
  max_attempts integer NOT NULL DEFAULT 1,
  time_limit_minutes integer,
  open_at timestamptz,
  close_at timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  feedback_release text NOT NULL DEFAULT 'after_close' CHECK (feedback_release IN ('immediate', 'after_close', 'manual')),
  total_points numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_quizzes" ON quizzes;
CREATE POLICY "select_quizzes" ON quizzes FOR SELECT
  TO authenticated USING (
    is_published = true
    OR EXISTS (SELECT 1 FROM offerings o WHERE o.id = quizzes.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM enrollments e WHERE e.offering_id = quizzes.offering_id AND e.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_quizzes" ON quizzes;
CREATE POLICY "insert_quizzes" ON quizzes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = quizzes.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role IN ('admin','faculty','facilitator'))
  );

DROP POLICY IF EXISTS "update_quizzes" ON quizzes;
CREATE POLICY "update_quizzes" ON quizzes FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = quizzes.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = quizzes.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_quizzes" ON quizzes;
CREATE POLICY "delete_quizzes" ON quizzes FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = quizzes.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'numerical')),
  points numeric NOT NULL DEFAULT 1,
  options jsonb,
  correct_answer jsonb,
  explanation text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_questions" ON questions;
CREATE POLICY "select_questions" ON questions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes q JOIN offerings o ON o.id = q.offering_id WHERE q.id = questions.quiz_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM enrollments e JOIN quizzes q ON q.offering_id = e.offering_id WHERE q.id = questions.quiz_id AND e.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_questions" ON questions;
CREATE POLICY "insert_questions" ON questions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes q JOIN offerings o ON o.id = q.offering_id WHERE q.id = questions.quiz_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role IN ('admin','faculty','facilitator'))
  );

DROP POLICY IF EXISTS "update_questions" ON questions;
CREATE POLICY "update_questions" ON questions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes q JOIN offerings o ON o.id = q.offering_id WHERE q.id = questions.quiz_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes q JOIN offerings o ON o.id = q.offering_id WHERE q.id = questions.quiz_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_questions" ON questions;
CREATE POLICY "delete_questions" ON questions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes q JOIN offerings o ON o.id = q.offering_id WHERE q.id = questions.quiz_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Quiz attempts (with autosave for resilience)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded', 'abandoned')),
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  score numeric,
  max_score numeric,
  autosave_state jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(quiz_id, user_id, attempt_number)
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_attempts" ON quiz_attempts;
CREATE POLICY "select_own_attempts" ON quiz_attempts FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM quizzes q JOIN offerings o ON o.id = q.offering_id WHERE q.id = quiz_attempts.quiz_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_own_attempt" ON quiz_attempts;
CREATE POLICY "insert_own_attempt" ON quiz_attempts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_attempt" ON quiz_attempts;
CREATE POLICY "update_own_attempt" ON quiz_attempts FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM quizzes q JOIN offerings o ON o.id = q.offering_id WHERE q.id = quiz_attempts.quiz_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM quizzes q JOIN offerings o ON o.id = q.offering_id WHERE q.id = quiz_attempts.quiz_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_attempt" ON quiz_attempts;
CREATE POLICY "delete_attempt" ON quiz_attempts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Quiz answers (individual answers within an attempt)
CREATE TABLE IF NOT EXISTS quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_data jsonb,
  is_correct boolean,
  points_awarded numeric DEFAULT 0,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_answers" ON quiz_answers;
CREATE POLICY "select_own_answers" ON quiz_answers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.id = quiz_answers.attempt_id AND qa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id JOIN offerings o ON o.id = q.offering_id WHERE qa.id = quiz_answers.attempt_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_own_answer" ON quiz_answers;
CREATE POLICY "insert_own_answer" ON quiz_answers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.id = quiz_answers.attempt_id AND qa.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_answer" ON quiz_answers;
CREATE POLICY "update_own_answer" ON quiz_answers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.id = quiz_answers.attempt_id AND qa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id JOIN offerings o ON o.id = q.offering_id WHERE qa.id = quiz_answers.attempt_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.id = quiz_answers.attempt_id AND qa.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id JOIN offerings o ON o.id = q.offering_id WHERE qa.id = quiz_answers.attempt_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_answer" ON quiz_answers;
CREATE POLICY "delete_answer" ON quiz_answers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  max_points numeric NOT NULL DEFAULT 100,
  due_date timestamptz,
  allow_resubmission boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_assignments" ON assignments;
CREATE POLICY "select_assignments" ON assignments FOR SELECT
  TO authenticated USING (
    is_published = true
    OR EXISTS (SELECT 1 FROM offerings o WHERE o.id = assignments.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM enrollments e WHERE e.offering_id = assignments.offering_id AND e.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_assignments" ON assignments;
CREATE POLICY "insert_assignments" ON assignments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = assignments.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role IN ('admin','faculty','facilitator'))
  );

DROP POLICY IF EXISTS "update_assignments" ON assignments;
CREATE POLICY "update_assignments" ON assignments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = assignments.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = assignments.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_assignments" ON assignments;
CREATE POLICY "delete_assignments" ON assignments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = assignments.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  file_url text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'resubmitted', 'graded', 'late')),
  grade numeric,
  feedback text,
  graded_by uuid REFERENCES auth.users(id),
  graded_at timestamptz,
  extension_due_date timestamptz,
  prior_submission_id uuid REFERENCES submissions(id),
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_submissions" ON submissions;
CREATE POLICY "select_submissions" ON submissions FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM assignments a JOIN offerings o ON o.id = a.offering_id WHERE a.id = submissions.assignment_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_own_submission" ON submissions;
CREATE POLICY "insert_own_submission" ON submissions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_submission" ON submissions;
CREATE POLICY "update_submission" ON submissions FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM assignments a JOIN offerings o ON o.id = a.offering_id WHERE a.id = submissions.assignment_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM assignments a JOIN offerings o ON o.id = a.offering_id WHERE a.id = submissions.assignment_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_submission" ON submissions;
CREATE POLICY "delete_submission" ON submissions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Grades (gradebook with release control)
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  item_type text NOT NULL DEFAULT 'assignment' CHECK (item_type IN ('assignment', 'quiz', 'attendance', 'manual')),
  item_id uuid,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 100,
  weight numeric DEFAULT 1,
  is_released boolean NOT NULL DEFAULT false,
  graded_by uuid REFERENCES auth.users(id),
  graded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_grades" ON grades;
CREATE POLICY "select_grades" ON grades FOR SELECT
  TO authenticated USING (
    (user_id = auth.uid() AND is_released = true)
    OR EXISTS (SELECT 1 FROM offerings o WHERE o.id = grades.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_grades" ON grades;
CREATE POLICY "insert_grades" ON grades FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = grades.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role IN ('admin','faculty','facilitator'))
  );

DROP POLICY IF EXISTS "update_grades" ON grades;
CREATE POLICY "update_grades" ON grades FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = grades.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = grades.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_grades" ON grades;
CREATE POLICY "delete_grades" ON grades FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Attendance sessions
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  label text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_attendance_sessions" ON attendance_sessions;
CREATE POLICY "select_attendance_sessions" ON attendance_sessions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = attendance_sessions.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM enrollments e WHERE e.offering_id = attendance_sessions.offering_id AND e.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_attendance_sessions" ON attendance_sessions;
CREATE POLICY "insert_attendance_sessions" ON attendance_sessions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = attendance_sessions.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role IN ('admin','faculty','facilitator'))
  );

DROP POLICY IF EXISTS "update_attendance_sessions" ON attendance_sessions;
CREATE POLICY "update_attendance_sessions" ON attendance_sessions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = attendance_sessions.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = attendance_sessions.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_attendance_sessions" ON attendance_sessions;
CREATE POLICY "delete_attendance_sessions" ON attendance_sessions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 from domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Attendance records
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'late', 'absent', 'excused')),
  recorded_by uuid REFERENCES auth.users(id),
  recorded_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_attendance_records" ON attendance_records;
CREATE POLICY "select_attendance_records" ON attendance_records FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM attendance_sessions sas JOIN offerings o ON o.id = sas.offering_id WHERE sas.id = attendance_records.session_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 from domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_attendance_records" ON attendance_records;
CREATE POLICY "insert_attendance_records" ON attendance_records FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM attendance_sessions sas JOIN offerings o ON o.id = sas.offering_id WHERE sas.id = attendance_records.session_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 from domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role IN ('admin','faculty','facilitator'))
  );

DROP POLICY IF EXISTS "update_attendance_records" ON attendance_records;
CREATE POLICY "update_attendance_records" ON attendance_records FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM attendance_sessions sas JOIN offerings o ON o.id = sas.offering_id WHERE sas.id = attendance_records.session_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 from domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM attendance_sessions sas JOIN offerings o ON o.id = sas.offering_id WHERE sas.id = attendance_records.session_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 from domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_attendance_records" ON attendance_records;
CREATE POLICY "delete_attendance_records" ON attendance_records FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 from domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain text,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  domain text,
  before_value jsonb,
  after_value jsonb,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_log" ON audit_log;
CREATE POLICY "select_audit_log" ON audit_log FOR SELECT
  TO authenticated USING (
    actor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_audit_log" ON audit_log;
CREATE POLICY "insert_audit_log" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = actor_id);

-- Integration log
CREATE TABLE IF NOT EXISTS integration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL CHECK (source_system IN ('registrar_sis', 'hrmis', 'fmis', 'iam')),
  source_batch_id text,
  action text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'pending', 'failed', 'replayed', 'rejected')),
  records_processed integer DEFAULT 0,
  records_accepted integer DEFAULT 0,
  records_rejected integer DEFAULT 0,
  error_detail text,
  source_timestamp timestamptz,
  replayed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE integration_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_integration_log" ON integration_log;
CREATE POLICY "select_integration_log" ON integration_log FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_integration_log" ON integration_log;
CREATE POLICY "insert_integration_log" ON integration_log FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "update_integration_log" ON integration_log;
CREATE POLICY "update_integration_log" ON integration_log FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Competencies (L&D)
CREATE TABLE IF NOT EXISTS competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_competencies" ON competencies;
CREATE POLICY "select_competencies" ON competencies FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = competencies.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM enrollments e WHERE e.offering_id = competencies.offering_id AND e.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_competencies" ON competencies;
CREATE POLICY "insert_competencies" ON competencies FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = competencies.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role IN ('admin','facilitator'))
  );

DROP POLICY IF EXISTS "update_competencies" ON competencies;
CREATE POLICY "update_competencies" ON competencies FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = competencies.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = competencies.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_competencies" ON competencies;
CREATE POLICY "delete_competencies" ON competencies FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Learner competencies (maps completion to competencies)
CREATE TABLE IF NOT EXISTS learner_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id uuid NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_type text NOT NULL DEFAULT 'assessment',
  evidence_id uuid,
  is_met boolean NOT NULL DEFAULT false,
  met_at timestamptz,
  UNIQUE(competency_id, user_id)
);

ALTER TABLE learner_competencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_learner_competencies" ON learner_competencies;
CREATE POLICY "select_learner_competencies" ON learner_competencies FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM competencies c JOIN offerings o ON o.id = c.offering_id WHERE c.id = learner_competencies.competency_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_learner_competencies" ON learner_competencies;
CREATE POLICY "insert_learner_competencies" ON learner_competencies FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM competencies c JOIN offerings o ON o.id = c.offering_id WHERE c.id = learner_competencies.competency_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role IN ('admin','facilitator'))
  );

DROP POLICY IF EXISTS "update_learner_competencies" ON learner_competencies;
CREATE POLICY "update_learner_competencies" ON learner_competencies FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM competencies c JOIN offerings o ON o.id = c.offering_id WHERE c.id = learner_competencies.competency_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM competencies c JOIN offerings o ON o.id = c.offering_id WHERE c.id = learner_competencies.competency_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_learner_competencies" ON learner_competencies;
CREATE POLICY "delete_learner_competencies" ON learner_competencies FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 from domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

-- Certificates (MOOC)
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE,
  issued_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'revoked')),
  revoked_reason text,
  revoked_at timestamptz,
  verification_code text NOT NULL UNIQUE,
  UNIQUE(offering_id, user_id)
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_certificates" ON certificates;
CREATE POLICY "select_certificates" ON certificates FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM offerings o WHERE o.id = certificates.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_certificates" ON certificates;
CREATE POLICY "insert_certificates" ON certificates FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = certificates.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 from domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role IN ('admin','facilitator'))
  );

DROP POLICY IF EXISTS "update_certificates" ON certificates;
CREATE POLICY "update_certificates" ON certificates FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = certificates.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = certificates.offering_id AND o.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_certificates" ON certificates;
CREATE POLICY "delete_certificates" ON certificates FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 from domain_memberships dm WHERE dm.user_id = auth.uid() AND dm.role = 'admin')
  );
