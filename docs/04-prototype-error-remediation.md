# Prototype Error Remediation and Validation

Date: 14 October 2026 | Reviewed base: `b742d5624a72f27d7c5ccea7c9abf9f9a46e56f2`

The October source review found a compilable prototype with broken RLS and insufficient assessment integrity. The user authorized repairs in blocker, critical, high and medium order, followed by integration into `main` after successful validation.

## Remediation record

| Priority | Finding | Repair | Regression evidence |
| --- | --- | --- | --- |
| Blocker | Recursive offering/enrollment policies | Migration 003 introduces owner-executed, search-path-hardened access helpers; membership checks no longer re-enter policies | Database reads succeed under a non-owner authenticated role |
| Critical | Self-assigned admin/faculty roles | Direct membership writes revoked; scoped administration RPC checks domain and campus | Learner and other-domain/campus administrative requests rejected |
| Critical | Paid/privileged self-enrollment | Direct enrollment writes revoked; free-MOOC admission RPC validates publication, payment flag and dates; institutional changes require scoped admin | Faculty/completed self-enrollment and paid enrollment rejected; free enrollment idempotent |
| Critical | Exposed answer keys and writable scores | Keys moved into unexposed private table; score columns denied; final scoring/marking moved into authorized RPCs | Learner cannot read keys or scoring columns, insert grades or mutate attempts |
| High | Final quiz save skipped | Atomic final-submit RPC accepts the current answer snapshot and closes/scores the attempt in one transaction | Immediate submission stores answers without prior autosave |
| High | Stale timer answers, false save success, no durable draft | Ref-based latest-answer capture, localStorage per user/attempt, serialized autosaves, explicit API error handling and server deadline enforcement | UI tests cover expiry, failed save, offline remount/reconnect and failed submission |
| High | Duplicate quiz submission and permissive attempt limits | Row/advisory locks, status checks and server count/window enforcement | Duplicate finalization produces one grade; attempt limit and post-submit edits rejected |
| High | Invalid profile embeddings | Explicit profile foreign keys and trigger/backfill; queries use exact relationship names | Migration constraints and scoped profile visibility verified in SQL |
| High | Unreleased assignment scores visible | No direct submission table read; release-aware listing RPC masks marks, feedback and marking state | Marks remain hidden until release; changing a mark makes it unreleased again |
| High | Global roles override course/domain context | Contextual course-access RPCs drive controls; domain filter applies to course lists; assigned faculty can manage without being creator | Multi-role learner UI and assigned non-owner instructor tested |
| High | Partial grading writes, unenforced resubmission/deadlines | Transactional marking and submission RPCs; score range validation; append-only versions; separate extension records | SQL rejects out-of-range marks, forbidden resubmission and unextended late work |
| Medium | Attendance missing/incorrect session behavior | Explicit session state, existing-record loading, learner record view, authoritative checked attendance RPC | UI verifies historical-session target and learner view; SQL checks session-specific state |
| Documentation | Fake integration replay and unsupported completion claims | Replay mutation removed; logs read-only; README and capability notes updated; demo seed and setup supplied | Mutation privileges denied; no success-generating replay action remains |

## Validation method

`npm run check` runs database regressions, React/jsdom regressions and the TypeScript/Vite production build. Database tests apply all migrations to an isolated PGlite instance and simulate Supabase `auth.uid()` with non-owner `authenticated`/`anon` roles. Frontend tests exercise actual hooks/pages with a mocked API transport. Test fixtures contain synthetic data only.

The test suite covers SQL authorization, final answer persistence, immutable submitted attempts, manual grading, grade release, extensions, scoped profiles, public catalog, attendance selection and client failure handling. GitHub Actions runs the same checks on main pushes and pull requests.

## Upgrade and deployment notes

1. Back up the target prototype database before applying migrations. Apply 003, 004 and 005 together before deploying the updated frontend; the previous frontend is incompatible with the secured assessment API.
2. Migration 004 backfills profiles and preserves existing question keys in `private.question_keys`. Migration 005 adds explicit profile relationships. Keep `private` unexposed in the Data API and refresh PostgREST's schema cache.
3. Historical prototype roles, enrollments, grades and attempts cannot be assumed trustworthy because the old policies allowed unauthorized writes. Review that data before using it outside the disposable demo. The migrations do not silently delete institutional history.
4. Legacy assignment gradebook rows used an assignment ID instead of a submission ID. They remain preserved; re-mark verified submissions through the new workflow to establish release-linked submission records. Do not bulk infer ownership or marks from potentially tampered historical records.
5. Revoke/reset any previously shared demo account credentials on a hosted environment. Removing hardcoded frontend credentials does not rotate existing hosted passwords.
6. No hosted Supabase credentials, live browser session, real ERP endpoints or production dataset were used for this repair. The optional seed script is syntax-checked; hosted seeding and end-to-end PostgREST acceptance remain deployment checks.

Passing these regressions establishes the repaired repository baseline, not completion of the full LMS or readiness for production use without deployment acceptance.
