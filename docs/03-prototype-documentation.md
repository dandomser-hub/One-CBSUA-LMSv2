# VLPv2 Prototype — Documentation and Capability Mapping

Version: 0.1 | Date: 14 October 2026 | Status: Prototype (Bolt stack)

## Overview

This prototype demonstrates synthetic end-to-end journeys for all three learning domains (Academic, Employee L&D, MOOC) of the One-CBSUA LMS v2 system. It proves four charter-mandated demonstrations: quiz resilience, assignment marking, identity/role separation, and integration failure handling.

The prototype uses the default Bolt stack (React + Vite + TypeScript + Tailwind CSS) with Supabase for database and authentication. The production system will be implemented in Laravel (modular monolith) with PostgreSQL and containerization — the data model and domain separation in this prototype are designed to transfer cleanly.

## Test User Credentials

All passwords: `Password123!`

| Email | Role | Domain(s) | Purpose |
| --- | --- | --- | --- |
| admin@vlpv2.test | Administrator | Academic, L&D, MOOC | Full access, integration monitor, audit log |
| faculty@vlpv2.test | Faculty | Academic | Teach courses, create quizzes/assignments, grade, take attendance |
| student@vlpv2.test | Student | Academic | Take quizzes, submit assignments, view released grades |
| student2@vlpv2.test | Student | Academic | Second student for roster/attendance testing |
| facilitator@vlpv2.test | Facilitator | L&D | Manage L&D programs, track competencies |
| employee@vlpv2.test | L&D Learner | L&D | Employee training participation |
| mooc@vlpv2.test | MOOC Learner | MOOC | External learner, self-enrollment, certificates |
| multirole@vlpv2.test | Faculty + Student + L&D Learner | Academic + L&D | Proves multi-domain identity isolation |

## Walkthrough Guide

### 1. Quiz Resilience (LRN-04, LRN-08)

1. Log in as `student@vlpv2.test`
2. Navigate to Academic Courses → Introduction to Agricultural Economics → Quizzes tab
3. Open "Short Quiz: Supply and Demand"
4. Answer some questions
5. Observe the autosave indicator (saves every 10 seconds to the database)
6. Toggle your browser offline (DevTools → Network → Offline) — the offline warning appears
7. Toggle back online — answers are preserved
8. Submit the quiz — duplicate submission prevention is enforced server-side
9. Log in as `faculty@vlpv2.test` to view attempt results

### 2. Assignment Marking (LRN-03, LRN-09, LRN-10)

1. Log in as `student@vlpv2.test`
2. Navigate to the course → Assignments tab → "Article Review"
3. Write and submit a review — a receipt is recorded (audit log entry created)
4. Resubmit — prior submission is preserved in history
5. Log in as `faculty@vlpv2.test`
6. Navigate to the same assignment — see all submissions
7. Grade a submission with feedback — grade is saved but NOT released
8. Go to Gradebook → select the course → release the grade
9. Log back in as student — the released grade now appears

### 3. Identity and Role Separation (FND-03, FND-04)

1. Log in as `multirole@vlpv2.test` (Dr. Carlos Lim)
2. The dashboard shows memberships in Academic (faculty + student) and L&D (learner)
3. The sidebar domain switcher lets you filter by active domain
4. Navigate to Academic Courses — you see courses as a student/faculty
5. Navigate to L&D Programs — you see training programs as a learner
6. Try accessing a MOOC course directly by URL — access is denied (no MOOC membership)
7. The audit log tracks which domain context actions were taken in

### 4. Integration Failure Handling (INT-01–05, INT-05)

1. Log in as `admin@vlpv2.test`
2. Navigate to Integration Monitor
3. You see four integration log entries:
   - Registrar/SIS: success (45 records)
   - HRMIS: success (120 records)
   - FMIS: failed (12 records rejected — service unavailable)
   - IAM: pending (30 records waiting)
4. Click "Replay" on the failed FMIS entry — it replays without duplication
5. A new success entry appears showing the replay result

## Capability Mapping (Artifact 1)

| Capability ID | Capability | Prototype Coverage |
| --- | --- | --- |
| FND-01 | Organization and offering context | Organizations table, domain-scoped offerings |
| FND-02 | Local accounts and recovery | Supabase Auth with email/password, session management |
| FND-03 | Contextual authorization | RLS policies enforcing domain/role-based access |
| FND-04 | Multi-domain person and memberships | Multi-role test user with separate memberships |
| FND-05 | Profiles and user directory | Profiles table, scoped directory in roster |
| FND-06 | Activity taxonomy and presets | Quiz types: practice, short_quiz, long_quiz, examination |
| FND-07 | Role dashboards | Dashboard with role-based stats and course cards |
| FND-08 | Support feedback | Notifications system (in-app) |
| LRN-01 | Class/course workspace | OfferingDetailPage with lessons, quizzes, assignments tabs |
| LRN-02 | Lessons and learning resources | Lessons with text content, ordered, published/draft states |
| LRN-03 | Assignments and article reviews | AssignmentPage with submission, resubmission history, extensions |
| LRN-04 | Quiz and examination authoring | Quizzes with attempt limits, time limits, availability windows |
| LRN-05 | Question types | Multiple choice, true/false, short answer, essay |
| LRN-08 | Attempt persistence and deadlines | Autosave to DB, offline indicator, duplicate submit prevention |
| LRN-09 | Marking, rubric and feedback | Grading interface with score, feedback, audit trail |
| LRN-10 | Gradebook and release | Gradebook with release/unrelease control, learner sees only released |
| LRN-11 | Retakes and accommodations | Max attempts configurable, extension_due_date on submissions |
| LRN-12 | Completion and availability | Published/unpublished flags on all content |
| LRN-14 | Attendance and participation | AttendancePage with Present/Late/Absent/Excused, session-based |
| LRN-19 | Notifications | Header notification bell with unread count, mark-all-read |
| ACD-01 | Programs and academic offerings | Academic domain offerings with code, dates, pacing |
| ACD-02 | Student/class-list administration | Roster tab in OfferingDetailPage, enrollment management |
| ACD-03 | Faculty teaching assignments | created_by on offerings, enrollment role = faculty |
| LND-01 | Employee learner context | L&D domain memberships, HRMIS external_id on profiles |
| LND-02 | Programs, cohorts and interventions | L&D offerings with cohort pacing |
| LND-04 | Competencies and evaluation | CompetenciesPage with competency framework and progress tracking |
| MOC-01 | MOOC offerings | MOOC domain offerings with self_paced pacing |
| MOC-02 | Public catalog and external registration | MoocCatalogPage with public listing, search |
| MOC-03 | Admission, pacing and enrollment | Self-enrollment for free MOOCs, paid MOOC shows payment gate |
| MOC-04 | Completion and certificates | CertificatesPage with verification, revocation status |
| MOC-05 | Free/paid offerings | is_paid flag, payment_status, paid MOOC blocks enrollment |
| INT-01 | Registrar/SIS integration | Integration log entry with sync_class_lists action |
| INT-02 | HRMIS integration | Integration log entry with sync_employees action |
| INT-03 | FMIS payments | Integration log entry with payment_confirmation, failure + replay |
| INT-04 | University IAM/SSO | Integration log entry with sync_identities, pending status |
| INT-05 | Integration monitor and resilience | IntegrationMonitorPage with replay without duplication |
| OPS-02 | Audit, privacy and lifecycle | AuditLogPage tracking actor, action, entity, before/after |

## LMS2 Correctness Findings Addressed (F01–F07)

| Finding | Addressed In |
| --- | --- |
| F01 User counter/table mismatch | Dashboard stats derive from same enrollment query |
| F02 Roster/assessment population discrepancy | Roster uses enrollment status = active, distinct from quiz attempts |
| F03 Assessment breadcrumb linked to different class | Offering-scoped quizzes and assignments; RLS prevents cross-offering access |
| F04 Term label inconsistent with dates | Offering has start_date/end_date displayed consistently |
| F05 Empty state shown before records load | Loading states on all pages before data renders |
| F06 Broad personal profile fields exposed | Profiles contain only learning-relevant fields; RLS scopes access |
| F07 Sample assessment content/key | Faculty-created questions with correct_answer stored server-side |

## Data Model Notes for Laravel Migration

The Supabase schema maps directly to Laravel Eloquent models in a modular monolith:

| Supabase Table | Laravel Module | Model |
| --- | --- | --- |
| organizations | Shared | Organization |
| profiles | Shared | Profile |
| domain_memberships | Shared | DomainMembership |
| offerings | Shared (polymorphic by domain) | Offering |
| enrollments | Shared | Enrollment |
| lessons | Shared/Courses | Lesson |
| quizzes | Shared/Assessment | Quiz |
| questions | Shared/Assessment | Question |
| quiz_attempts | Shared/Assessment | QuizAttempt |
| quiz_answers | Shared/Assessment | QuizAnswer |
| assignments | Shared/Assignments | Assignment |
| submissions | Shared/Assignments | Submission |
| grades | Shared/Gradebook | Grade |
| attendance_sessions | Shared/Attendance | AttendanceSession |
| attendance_records | Shared/Attendance | AttendanceRecord |
| notifications | Shared | Notification |
| audit_log | Operations | AuditLog |
| integration_log | Integration | IntegrationLog |
| competencies | L&D | Competency |
| learner_competencies | L&D | LearnerCompetency |
| certificates | MOOC | Certificate |

RLS policies translate to Laravel policies + middleware + database-level row scoping.

## Open Decisions Informed by This Prototype

| Decision | Status After Prototype |
| --- | --- |
| D-05 Shared engine, distinct domain policies | Validated: one schema, domain-scoped offerings, RLS isolation works |
| D-06 Implementation engine | Prototype proves the functional model; Laravel recommended for production |
| D-11 Grading, retakes, extensions | Prototype demonstrates grade release control and extensions |
| D-13 MOOC admission and certification | Prototype demonstrates self-enrollment, payment gate, certificate verification |

## What the MVP Should Cover Next

Based on what this prototype proved and what remains:

1. **Question bank** (LRN-06) — reusable questions across quizzes with versioning
2. **Question import/export** (LRN-07) — bulk question management
3. **Course copy and reuse** (LRN-13) — copy offerings between terms
4. **Announcements and discussions** (LRN-15) — course communication
5. **Guardian access** (ACD-04) — guardian requests and scoped access
6. **Real ERP adapter contracts** (INT-01–04) — actual API integration specs
7. **Backup and restore** (OPS-04) — data recovery procedures
8. **Accessibility audit** (OPS-05) — keyboard navigation, screen reader testing
