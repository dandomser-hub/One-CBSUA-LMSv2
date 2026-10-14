# VLPv2 Prototype — Implemented Workflows and Limits

Version: 0.2 | Date: 14 October 2026 | Status: repaired development prototype

This revision supersedes the original v0.1 claims that domain isolation, resilient submissions and integration replay had already been proved. Those claims were contradicted by the source review. See [the remediation record](04-prototype-error-remediation.md) for the fixes and their validation.

The current implementation is React + TypeScript + Vite + Tailwind, with Supabase Auth and PostgreSQL/RLS/RPCs. The complete-system requirements remain in Artifacts 0 and 1. A production Laravel transition is an architectural proposal, not a decision established by this prototype.

## Supported workflows

| Area | Current behavior | Capability references |
| --- | --- | --- |
| Accounts | Email/password login and external registration; database-triggered profiles; scoped memberships assigned by trusted administrators | FND-02–05 |
| Domain/course context | Academic, L&D and MOOC offerings; domain-filtered dashboard and lists; per-course learner/manager permissions | FND-01, FND-03–04, FND-07 |
| Course workspace | Published lessons, quizzes, assignments and an instructor roster; unassigned users cannot read private content | LRN-01–02, ACD-02–03 |
| Quiz attempts | Server-enforced attempts and deadlines; local drafts; checked server saves; atomic final submission and objective scoring | LRN-04–05, LRN-08, LRN-11 |
| Quiz marking | Instructor attempt review, manual essay marking and explicit grade release | LRN-09–10 |
| Assignments | Append-only submissions/history, enforced resubmission policy, late-submission rules and instructor extensions | LRN-03, LRN-11 |
| Grade release | Unreleased scores/feedback are masked for learners; grading and release require assignment to the offering | LRN-09–10 |
| Attendance | Instructor session creation/selection and attendance marking; learner session-by-session record viewing | LRN-14 |
| L&D | Distinct L&D course context and competency progress viewing; global faculty status does not grant L&D instructor controls | LND-01–02, LND-04 |
| MOOC | Anonymous discovery of published public offerings; registration; server-authorized free enrollment; paid admission requires trusted administration | MOC-01–03, MOC-05 |
| Certificates | Viewing issued records and exact-token public verification; revoked status displayed | MOC-04 |
| Integrations | Read-only logs, explicitly labelled as unconnected to live ERP adapters | INT-01–05: infrastructure remains pending |
| Audit | Server-generated records for the repaired enrollment/assessment/attendance operations; own-actor and university-wide-admin reading | OPS-02: partial coverage |

## Reproducible acceptance walkthrough

Apply the migrations and optional synthetic seed following the [README](../README.md). Use the password supplied to the seed script; no default password is embedded in the application.

1. **Quiz:** sign in as `student@vlpv2.test`, open Demo Agricultural Economics, answer the quiz, and submit immediately without waiting for autosave. Check the submission receipt. Use `faculty@vlpv2.test` to review the objective score and mark the essay. Release the grade in Gradebook; only then should the student see it.
2. **Reconnect:** before submission, enter answers offline, remount/reload when the application is available, and confirm the draft restores on the same device. Reconnect before the deadline and confirm server save. After the deadline, new local edits are not accepted: the server uses its last saved state. Browser storage failures are explicitly reported.
3. **Assignment:** submit and resubmit the demo review; previous submissions remain available. Mark as faculty. Confirm that the learner cannot see score or feedback before release. Grant an individual extension and verify it applies to later submissions.
4. **Context:** use `multirole@vlpv2.test`. The seeded account is an Academic student in the demo course and an L&D learner, despite holding an Academic faculty membership. Gradebook and attendance must show learner controls in those offerings. Change the active domain to filter course lists.
5. **Attendance:** as faculty, create two sessions, record different states, select the older session and change only that session. As student, confirm each session shows the saved state without management controls.
6. **MOOC:** browse `/mooc` without logging in. After signing in, enroll in the free offering. Paid offerings cannot be self-enrolled; hiding the button is backed by server enforcement.
7. **Certificates:** use `/verify` with the seeded synthetic token `demo-certificate-verification-001`. Ordinary certificate-list queries remain owner/manager-scoped. Legacy tokens shorter than 16 characters require administrative verification or controlled reissue.
8. **Integrations:** university-wide demo admin can view the synthetic pending FMIS log. No button should manufacture a successful processing or replay result.

The walkthrough describes expected behavior; hosted execution is still required after deploying the migrations. Automated evidence is listed separately in the remediation record.

## Implementation boundaries

- The course/quiz authoring interface, reusable question bank, import/export, course copying, discussions, guardian workflows and other complete-system capabilities are not implemented by this repair. A scoped `save_question` RPC supports four question types for setup and future authoring. Started quizzes cannot be edited; create a revision instead.
- Matching and numerical question types from the older schema are not supported by the current learner interface and cannot be authored through the new RPC.
- Account recovery screens, administrative membership/enrollment screens, automated competency evaluation and certificate issuance, and full operational tooling remain pending.
- The free-MOOC flow is implemented. Payments, per-learner payment reconciliation and real FMIS admission remain future adapter work. Offering-wide `payment_status` is legacy metadata and is not trusted as proof of payment.
- Certificates are records issued by a trusted operator/service. Public verification exposes only certificate number, holder display name, course, date and status for an exact token.
- Audit coverage is limited to the repaired database operations; it is not an exhaustive institution-wide audit implementation.
- Offline draft persistence does not make this a service-worker/PWA offline application. Reloading the application itself still needs the assets to be available.
- Migration to another application framework requires explicit interface and authorization design; RLS-to-framework migration is not presumed automatic.
