# One-CBSUA LMSv2 (VLPv2)

An independently operational learning platform within the One-CBSUA ERP direction, serving Academic, Employee Learning & Development, and MOOC learners. This repository contains requirements artifacts and an evolving React/TypeScript + Supabase prototype. It is **not yet the complete production LMS**.

## Working branch

`main` is the active development baseline after the October 2026 prototype repair. Use short-lived branches for future changes, with `npm run check` required before integration. The original documentation artifacts retain their draft decision status; merging the implementation does not approve unresolved architectural or university policy decisions.

## Run locally

Requirements: Node.js 22+, npm, and a dedicated Supabase project (or local Supabase instance).

1. Run `npm ci`.
2. Apply **all migrations in filename order** in `supabase/migrations/` using the Supabase CLI or SQL editor as the database owner. For an existing prototype database, apply only migrations not already recorded as applied. Do not stop after migration 003; 004 and 005 complete the security repair.
3. Copy `.env.example` to `.env.local`. Set the project URL and **public anon key**. Never put a service-role key in a `VITE_*` variable or browser file.
4. Keep `private` outside the Supabase Data API exposed schemas. Use `public` for the application API. Refresh the PostgREST schema cache after migration if needed (`NOTIFY pgrst, 'reload schema';`).
5. Configure Supabase Auth site/redirect URLs for your local and hosted origins, along with your email-confirmation policy. New users receive a profile through a database trigger; they cannot assign their own institutional roles.
6. Run `npm run dev`. A clear setup screen appears if client environment variables are missing.

For hosting, set the two public build variables, run `npm run build`, serve `dist/`, and configure SPA rewrites to `index.html` for application routes. Applying source changes does not automatically migrate or deploy a hosted Supabase project.

## Synthetic demo data

Use a disposable project only. The seed script requires server-side environment variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VLP_DEMO_PASSWORD` (12+ characters), and `VLP_ALLOW_DEMO_SEED=yes`. Supply them through your shell or secret manager, then run `npm run seed:demo`. Do not commit these values.

The script creates `admin`, `faculty`, `student`, `student2`, `facilitator`, `employee`, `mooc`, and `multirole` accounts under `@vlpv2.test`, plus synthetic offerings and activities. Existing identities are reused without silently resetting passwords. On repeat runs, use the same configured password. Existing quiz attempts are preserved; an existing demo quiz is not rewritten. The prototype provides optional test-account shortcuts using the original shared demo password; see Appearance and test accounts below.

For a non-demo installation, provision the first scoped administrator through a trusted database/service-role operation. Subsequently, scoped administrators can call `assign_membership` and `assign_enrollment`; administrative screens for those operations remain future work.

## Validation

- `npm run test:db`: executes every migration in PGlite (PostgreSQL-compatible engine), then checks real SQL privileges, RLS and transactional assessment operations under simulated auth roles.
- `npm run test:ui`: React/jsdom regression tests with mocked API transport, covering quiz persistence, submission, attendance and contextual gradebook behavior.
- `npm run build`: TypeScript and Vite production build.
- `npm run check`: all of the above. GitHub Actions runs the same command.

These checks do not substitute for hosted Supabase/PostgREST tests, browser acceptance testing, real ERP integration tests, or production load/accessibility testing.

## Architecture and security

The browser reads scoped records through Supabase RLS. Nonrecursive helper functions enforce domain, campus and assigned-course permissions. Trusted database RPCs perform enrollment, quiz submission/scoring, assignment marking, grade release, extensions and attendance recording. Answer keys live in the unexposed `private` schema. Learners cannot directly write roles, enrollments, scores or grading metadata.

Quiz drafts persist on the current device and sync to the server. Final submission atomically stores the final answers and scores the assessment. If a deadline has passed, only the last pre-deadline server save is accepted. Released grades are read from the gradebook; assignment feedback follows the same release decision.

The integration monitor is a read-only log viewer. No live Registrar/SIS, HRMIS, FMIS or IAM adapter, payment processing, or real replay mechanism is implemented yet.

## Project artifacts

- [Artifact 0 — Project Charter, Scope, and Decision Register](docs/00-project-charter-scope-decision-register.md)
- [Artifact 1 — Functional Scope and Capability Matrix](docs/01-functional-scope-capability-matrix.md)
- [Source and Evidence Register](docs/02-source-and-evidence-register.md)
- [Prototype documentation and supported workflows](docs/03-prototype-documentation.md)
- [Error remediation and validation record](docs/04-prototype-error-remediation.md)

## Appearance and test accounts

The landing page and shared module header offer Light, Dark and System themes.
The preference persists in local storage as `vlpv2:theme`; System follows device
appearance automatically. The uploaded rice-field palette is preserved in
`src/styles/lms-tokens.css` and exposed through `tailwind.lms-preset.js`.
Accessibility overrides provide readable status text and visible light-mode focus rings.

The prototype landing page lists the seeded role-based test accounts and signs in
through Supabase using the original shared test password `Password123!`.
Accounts must exist in the connected database; shortcuts do not create accounts
or grant roles. If seeded with a different `VLP_DEMO_PASSWORD`, use the manual
sign-in form. Set `VITE_ENABLE_DEMO_LOGIN=false` at build time to hide these
synthetic account shortcuts for a live deployment.
