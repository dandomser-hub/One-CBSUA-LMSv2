# Artifact 1 — Functional Scope and Capability Matrix

Version: 0.1 | Prepared: 14 October 2026 | Status: Draft for review  
Companion: [Artifact 0](00-project-charter-scope-decision-register.md) | [Evidence register](02-source-and-evidence-register.md)

## Reading this matrix

This is a proposed complete-system capability inventory, not a completed application, approved release backlog or claim that every function is already present in LMS2. CR identifiers and D decision identifiers are defined in Artifact 0.

Evidence labels: **C** = confirmed user requirement; **O** = interface observation documented in the recovered LMS2 report; **R** = recommendation or source finding documented in the recovered Moodle/LMS2 reports; **P** = new design proposal. Combinations separate the required direction from its proposed detail. All acceptance criteria below are proposed and unexecuted.

**L1** and **M1** refer to the recovered reports, not a new live inspection or archive execution. An observed control does not establish tested backend behavior. A capability not observed is unverified, not proven absent. Source-backed Moodle availability does not mean approval to include it in VLPv2.

Each group contains a provenance/disposition table followed by the corresponding CBSUA adaptation and observable acceptance criteria. Dispositions are recommendations except where explicitly required by the user. No numerical performance or service-level targets are invented.

## Shared foundation

| ID | Capability | Evidence | Source | Treatment | Intended module |
| --- | --- | --- | --- | --- | --- |
| FND-01 | Organization and offering context | C/P | U2; L1 pp.3–5 | Retain/enhance | Shared / organization |
| FND-02 | Local accounts and recovery | C | U2; L1 pp.2,4 | Required | Shared / identity |
| FND-03 | Contextual authorization | C/P | U2; L1 pp.2,4; M1 pp.3–4 | Required/enhance | Shared / access |
| FND-04 | Multi-domain person and memberships | P | U2; design proposal | Adopt proposal | Shared / identity |
| FND-05 | Profiles and user directory | O/P | L1 pp.4,10–11 | Retain/enhance | Shared / users |
| FND-06 | Activity taxonomy and presets | O/R | L1 pp.3–4; M1 pp.12–13 | Retain/adapt | Shared / configuration |
| FND-07 | Role dashboards and workflow status | R | L1 pp.10–11; M1 p.13 | Enhance proposal | Shared / experience |
| FND-08 | Support feedback and appearance | O/P | L1 p.4 | Retain/validate | Shared / support |

| ID | CBSUA adaptation / target behavior | Acceptance criteria proposed | Decision dependencies |
| --- | --- | --- | --- |
| FND-01 | Campus, unit, domain and offering context; avoid stale term labels | Switching offerings updates all navigation and reports; an unrelated campus/offering cannot be accessed by a scoped user | D-05, D-08 |
| FND-02 | Local login, recovery and account lifecycle independent of IAM | In a standalone deployment an authorized account can log in, recover access and be disabled; recovery cannot grant additional roles | D-10 |
| FND-03 | Local roles plus campus, domain and offering membership; separate administration from teaching | Negative tests deny cross-course, cross-domain and cross-campus access, including direct URLs and files | D-05, D-10 |
| FND-04 | An employee may also be faculty, an L&D learner and an academic student | One test person holds all memberships without exposing one domain's restricted records in another | D-05 |
| FND-05 | Minimal learning-relevant fields; scoped directory and reconciled counters | Directory, counters and export agree under the same filters; unauthorized profile fields are excluded from responses | D-08, D-15 |
| FND-06 | Keep Article Review, Short Quiz, Long Quiz and Examination labels where useful; map to appropriate engines | Each approved preset produces its documented submission, timing, marking and release behavior; disabling a type preserves history | D-06, D-11 |
| FND-07 | Prioritize current learning tasks and marking queues; explicit loading/error/empty states | A delayed query shows loading rather than false emptiness; dashboard tasks match authorized current records | D-05 |
| FND-08 | Retain Bug, Feature Request and General Feedback entry and appearance controls; destination/retention to define | Feedback produces a receipt and reaches the approved support queue; theme choice remains usable across sessions | D-15 |

## Common learning engine

| ID | Capability | Evidence | Source | Treatment | Intended module |
| --- | --- | --- | --- | --- | --- |
| LRN-01 | Class/course workspace and outline | O/R | L1 pp.3,5; M1 pp.9,13 | Retain/enhance | Shared / courses |
| LRN-02 | Lessons and learning resources | O/R | L1 p.3; M1 p.9 | Retain/adapt | Shared / content |
| LRN-03 | Assignments and article reviews | R | L1 pp.3,11; M1 pp.4,9,14 | Adopt/enhance proposal | Shared / assignments |
| LRN-04 | Quiz and examination authoring | O/R | L1 pp.3,5; M1 pp.4,12 | Retain/enhance | Shared / assessment |
| LRN-05 | Question types | O/R | L1 p.3; M1 p.12 | Retain/extend proposal | Shared / questions |
| LRN-06 | Reusable question bank and versions | R | M1 pp.9–12,14 | Adopt proposal | Shared / question bank |
| LRN-07 | Question import/export | R | M1 p.10 | Controlled adoption | Shared / question exchange |
| LRN-08 | Attempt persistence and deadlines | O/R | L1 pp.3,9; M1 pp.4,14 | Validate/enhance | Shared / attempts |
| LRN-09 | Marking, rubric and feedback | O/R | L1 pp.3,5; M1 pp.4,10,14 | Retain/extend | Shared / grading |
| LRN-10 | Gradebook and release | R | L1 pp.5,11; M1 pp.10,14,16 | Adopt/enhance proposal | Shared / gradebook |
| LRN-11 | Retakes and accommodations | O/R | L1 pp.3,5; M1 p.12 | Retain/enhance | Shared / assessment policy |
| LRN-12 | Completion and availability | R | M1 pp.9–10,14 | Adopt proposal | Shared / progress |
| LRN-13 | Course copy and reuse | O/R | L1 pp.3,5; M1 pp.14,18 | Retain/enhance | Shared / course lifecycle |
| LRN-14 | Attendance and participation | O/R | L1 pp.3,5; M1 p.14 | Retain/enhance | Shared / attendance |
| LRN-15 | Announcements and discussions | R | M1 pp.9,13–14 | Adopt proposal | Shared / course communication |
| LRN-16 | News feed, comments and reactions | O | L1 p.4; M1 pp.13–14 | Retain/validate | Shared / institutional communication |
| LRN-17 | Events and learning calendar | O/R | L1 p.4; M1 pp.10,13 | Retain/enhance | Shared / calendar |
| LRN-18 | Direct and group chat | O | L1 p.4; M1 p.14 | Retain/validate | Shared / messaging |
| LRN-19 | Notifications | R | M1 pp.11,13–14,18 | Adopt proposal | Shared / notifications |

| ID | CBSUA adaptation / target behavior | Acceptance criteria proposed | Decision dependencies |
| --- | --- | --- | --- |
| LRN-01 | Ordered content and activities with explicit offering and domain ownership | Every item opens in its actual offering; cross-offering lesson/resource associations are rejected | D-05, D-06 |
| LRN-02 | Rich text, files, links, folders and multi-page readings; human-readable titles and controlled visibility | Authorized learners open published resources; hidden/private items remain inaccessible by guessed URLs; ordering is keyboard operable | D-06, D-15 |
| LRN-03 | Text/file submissions, deadlines, extensions, resubmission history and feedback; group work subject to policy | A learner submits and receives a receipt; an extension affects only its recipient; resubmission preserves earlier evidence | D-11 |
| LRN-04 | Practice/exam presets, availability, attempt limits, question points and explicit feedback release | Configured opening, closing and attempts are enforced server-side; unauthorized edits are rejected | D-11 |
| LRN-05 | Retain fill-answer, true/false, multiple choice, matching and essay; propose numerical tolerance/units | Approved fixtures score objective/numerical answers correctly; essays remain pending until marked; attachments obey access rules | D-11, D-17 |
| LRN-06 | Categories, preview, controlled sharing, version history and random selection | Editing a question creates a version; old attempts retain delivered text and scoring context; sharing respects owner scope | D-06, D-11 |
| LRN-07 | Choose required formats; validate mappings, media and answer fidelity before bulk import | A round trip preserves supported question text, marks and media; unsupported types are reported without silent conversion | D-17 |
| LRN-08 | Server time, acknowledged autosave, ownership, retry and duplicate-submit handling | Disconnect/resume retains acknowledged answers; concurrent final submissions produce one final attempt; deadline boundaries match policy | D-11 |
| LRN-09 | Manual essays, rubric/marking guide and feedback; separate pending from failed | Rubric totals reconcile; unmarked work is not treated as final failure; changes identify actor, reason and prior value | D-11 |
| LRN-10 | Categories, approved weighting/rounding, overrides, history and explicit result/answer release | Fixture aggregates match approved examples; learners cannot retrieve unreleased results/keys; overrides retain an audit trail | D-11 |
| LRN-11 | Retake requests and decisions; scoped extra time/attempts; late policy | An approved exception affects only the intended learner/activity and is audited; retrying approval does not duplicate entitlement | D-11 |
| LRN-12 | Completion independent of attendance; approved date, prerequisite and grade conditions | Attendance alone cannot satisfy an assessment condition; dependent content unlocks only after its approved rule passes | D-11, D-12, D-13 |
| LRN-13 | Copy selected structure/content to a new offering; archive historical offerings | Copy contains no prior learners, attempts or grades; dates and faculty are reviewed; source course remains unchanged | D-15 |
| LRN-14 | Session-based records with Present/Late/Absent/Excused and controlled corrections/export | Two sessions on one date remain distinct; repeated updates do not duplicate records; export matches the scoped register | D-11, D-12 |
| LRN-15 | Course announcements and threaded discussion with audience and moderation policies | Only enrolled/authorized users access private discussions; moderation actions and delivery outcomes are traceable | D-15 |
| LRN-16 | Keep LMS2 capability; establish campus/domain audiences and moderation | A published post reaches only its selected audience; editing/moderation and reaction counts behave consistently | D-15 |
| LRN-17 | Institutional events plus course deadlines; explicit timezone and term context | Displayed dates agree with server deadlines; an event change updates affected authorized views without duplicates | D-08 |
| LRN-18 | Preserve the observed workspace; define membership, retention, moderation and delivery expectations | Authorized recipients receive test messages; nonmembers cannot read group history; removed membership follows approved history rules | D-15 |
| LRN-19 | In-app notifications with optional operated email; retries and preferences; SMS/push by decision | A retried event produces one logical notification; failed delivery is visible; links enforce current access | D-15, D-17 |

## Academic domain

| ID | Capability | Evidence | Source | Treatment | Intended module |
| --- | --- | --- | --- | --- | --- |
| ACD-01 | Programs and academic offerings | C/O/P | U2; L1 pp.3–5 | Required/retain | Academic / offering administration |
| ACD-02 | Student/class-list administration | C/O/P | U2; L1 pp.3,10; M1 pp.14,16 | Required/enhance | Academic / enrollment |
| ACD-03 | Faculty teaching assignments | C/P | U2; L1 pp.3,5; M1 p.16 | Required/define | Academic / staffing |
| ACD-04 | Guardian requests and access | O/R | L1 pp.4–5; M1 pp.13–14 | Retain with policy gate | Academic / guardian services |
| ACD-05 | Academic reports and grade handoff | R | L1 pp.12–14; M1 pp.14,16 | Adopt proposal | Academic / reporting |

| ID | CBSUA adaptation / target behavior | Acceptance criteria proposed | Decision dependencies |
| --- | --- | --- | --- |
| ACD-01 | Collegiate, graduate, special and short-term categories with approved academic metadata | Each category supports an offering, faculty, learners and completion workflow; short-term academic offerings remain distinguishable from MOOCs | D-08, D-11 |
| ACD-02 | Local entry/import initially; additions, drops, transfers and enrollment history | Repeated import creates no duplicates; roster, submission and missed counts explain their populations and reconcile | D-08 |
| ACD-03 | HRMIS identity source; teaching authority granted by approved academic assignment, including changes | Being an employee alone grants no class access; a valid assignment grants the specified scope and expires correctly | D-08 |
| ACD-04 | Verification, relationship, allowed records, approval, expiry and revocation; not automatic L&D/MOOC access | Unapproved requests expose no learner records; revocation blocks subsequent access including private files | D-14 |
| ACD-05 | Attendance, missing work, results and approved Registrar handoff; distinguish LMS marks from official grades | Exports reconcile to source records; handoff records approval and acknowledgment and cannot silently post a second official result | D-08, D-11 |

## Employee Learning and Development domain

| ID | Capability | Evidence | Source | Treatment | Intended module |
| --- | --- | --- | --- | --- | --- |
| LND-01 | Employee learner context | C/P | U2 | Required/define | L&D / learner profiles |
| LND-02 | Programs, cohorts and interventions | P | U2; design proposal | Propose | L&D / program administration |
| LND-03 | Nomination and enrollment | P | U2; design proposal | Propose | L&D / enrollment |
| LND-04 | Competencies and evaluation | R/P | M1 p.17; U2; design proposal | Reconsider for L&D | L&D / development outcomes |
| LND-05 | Completion and employee history | P | U2; design proposal | Propose | L&D / records |

| ID | CBSUA adaptation / target behavior | Acceptance criteria proposed | Decision dependencies |
| --- | --- | --- | --- |
| LND-01 | Distinct employee learning membership linked to HRMIS identity | Employee enrolls in training without a regular-student record; academic records do not appear in L&D views without authority | D-05, D-08 |
| LND-02 | Training catalog, intervention objectives, dates, facilitators, unit/cohort targeting | An L&D administrator creates a cohort and assigns only authorized participants and facilitators | D-12 |
| LND-03 | Nomination, approval, assignment or self-request as approved; capacity/waitlist optional | Approved enrollment follows the chosen workflow; rejected or waitlisted applicants do not gain participant access | D-12 |
| LND-04 | Competencies, needs, pre/post assessment and evaluations where HR requires; not automatically excluded as Moodle bulk | Completion evidence maps to approved outcomes; supervisors see only permitted staff results | D-12 |
| LND-05 | Attendance, learning hours/credits, certificates and HRMIS reporting under approved rules | One completed intervention creates one traceable record; correction/revocation preserves history and reconciles to HRMIS acknowledgment | D-08, D-12 |

## MOOC domain

| ID | Capability | Evidence | Source | Treatment | Intended module |
| --- | --- | --- | --- | --- | --- |
| MOC-01 | MOOC offerings for distant learners | C/P | U2 | Required/define | MOOC / course delivery |
| MOC-02 | Public catalog and external registration | P | U2; design proposal | Propose | MOOC / discovery and identity |
| MOC-03 | Admission, pacing and enrollment | P | U2; design proposal | Propose | MOOC / enrollment |
| MOC-04 | Completion and certificates | P | U2; design proposal | Propose | MOOC / credentials |
| MOC-05 | Free/paid offerings and access | C/P | U2; supersedes blanket M1 commerce deferral | Required boundary; workflow proposed | MOOC / financial enrollment |

| ID | CBSUA adaptation / target behavior | Acceptance criteria proposed | Decision dependencies |
| --- | --- | --- | --- |
| MOC-01 | Distinct MOOC offerings using shared learning capabilities and program-specific policies | An external learner completes an approved MOOC journey without an SIS academic enrollment or HRMIS employee record | D-13 |
| MOC-02 | Public descriptions, registration, account verification and privacy choices | Published catalog is discoverable; registration creates no institutional role; duplicate identity conflicts enter controlled review | D-10, D-13 |
| MOC-03 | Self-enrollment or approval; self-paced or cohort runs; capacity/prerequisite controls where needed | Only eligible learners enroll; cohort dates and self-paced rules remain distinct and enforceable | D-13 |
| MOC-04 | Approved assessment/identity criteria, certificate templates, verification and revocation | A certificate is issued only after criteria pass; verification reveals only approved fields; revoked credentials show their status | D-13, D-15 |
| MOC-05 | Support applicable FMIS payment workflows without assuming all MOOCs are paid | Free offerings require no payment; paid access follows authoritative financial status and approved reversal policy | D-09, D-13 |

## ERP integrations and operations

| ID | Capability | Evidence | Source | Treatment | Intended module |
| --- | --- | --- | --- | --- | --- |
| INT-01 | Registrar/SIS integration | C/P | U2; M1 pp.14,16 | Required | Integration / academic adapter |
| INT-02 | HRMIS integration | C/P | U2 | Required | Integration / HR adapter |
| INT-03 | FMIS payments, cashiering and POS | C/P | U2 | Required; exact scope open | Integration / finance adapter |
| INT-04 | University IAM/SSO transition | C/P | U2; L1 p.2 | Required | Integration / identity adapter |
| INT-05 | Integration monitor and resilience | R/P | M1 pp.16,18 | Adopt proposal | Integration / operations |
| OPS-01 | Private files and uploads | R | L1 pp.2,9; M1 pp.4,18 | Adopt mandatory proposal | Operations / file services |
| OPS-02 | Audit, privacy and lifecycle | R/P | L1 pp.9–11; M1 pp.11,17–18 | Adopt mandatory proposal | Operations / governance |
| OPS-03 | Background jobs and observability | R | M1 pp.3–4,11,18 | Adopt mandatory proposal | Operations / runtime |
| OPS-04 | Backup, restore and migration | R | L1 pp.14–15; M1 pp.17–18 | Adopt mandatory proposal | Operations / recovery |
| OPS-05 | Accessibility, mobile and low bandwidth | R | L1 p.11; M1 pp.13,18 | Adopt proposal | Quality / experience |
| OPS-06 | Capacity, security and release readiness | R/P | L1 pp.11,14; M1 p.18 | Adopt mandatory proposal | Quality / engineering |

| ID | CBSUA adaptation / target behavior | Acceptance criteria proposed | Decision dependencies |
| --- | --- | --- | --- |
| INT-01 | Pull student and class lists; stable identifiers, change history, withdrawals, errors and reconciliation | Replay an import and process a withdrawal: no duplicate class/member; access changes while historical work remains | D-08; ACD-02 |
| INT-02 | Employee/faculty provisioning; proposed L&D completion handoff separately agreed | Repeated source updates map to one person; an employment change follows policy without deleting history; rejected records are visible | D-08; LND-01 |
| INT-03 | Define charge initiation, authoritative confirmation, receipts, reversals, cashier/POS interfaces and reconciliation | Test confirmed, pending, failed, duplicated and reversed transactions under the agreed contract; one payment cannot duplicate access or receipts | D-09 |
| INT-04 | Local-first operation, verified identity linking, provisioning/revocation and external learner policy | A linked user retains courses and learning history; invalid identity assertions and unauthorized auto-linking fail; suspension follows policy | D-10; FND-02–04 |
| INT-05 | Runs, rejected records, source timestamps, retries, ownership conflicts and replay controls | Partial failure can be replayed without duplication; administrators reconcile expected/accepted/rejected counts and stale source state | D-08–10 |
| OPS-01 | Authorized delivery, validation, quotas, content inspection and retention | Unauthorized downloads fail even with known URLs; disallowed uploads are rejected; restored files match recorded checksums | D-15 |
| OPS-02 | Trace permissions, grades and integration changes; approved retention, archiving and disclosure | Privileged changes identify actor/time/context; archive retains required evidence; exports disclose only permitted fields | D-15 |
| OPS-03 | Task scheduling, reliable notifications, assessment processing, failures, metrics and alert ownership | A failed job is visible and safely retryable; monitoring identifies stalled processing without exposing secrets | D-07, D-16 |
| OPS-04 | Consistent database/files/configuration/code recovery; inventory and migration reconciliation | Isolated restore reproduces memberships, submissions, grades and files; migration totals reconcile; RPO/RTO measured against approved targets | D-15–16 |
| OPS-05 | Keyboard, labels, contrast, zoom, responsive views and explicit save states; exact conformance target to agree | Representative users complete content, submission and grading tasks using keyboard/mobile; interrupted connection status is explicit | D-16 |
| OPS-06 | Cross-role isolation, assessment load, dependency management, deployment and rollback checks | Approved simultaneous-assessment workload meets agreed targets; clean install and rollback work; blocking security/data-integrity defects are resolved | D-06–07, D-16 |

## Optional Moodle capabilities and dependency policy

These recommendations come from M1 pp.9–12 and 17 and remain subject to actual course inventory, domain needs and owner approval. They describe capabilities; they do not require deploying Moodle plugins. If Moodle is selected, retain its supported dependency and upgrade mechanisms.

| Capability family | Proposed disposition | Required evidence before enablement or retirement |
| --- | --- | --- |
| Subsections, polls and course evaluations | Controlled availability | Faculty/program use case, reporting owner and accessible workflow |
| H5P interactive content | Controlled availability | Existing/authored content, operated dependencies and upgrade/import tests |
| LTI external tools/labs | Controlled availability | Approved provider, identity/data boundary, grade ownership and failure handling |
| SCORM and IMS content packages | Inventory first; support where needed | Actual legacy/licensed packages and validated completion/scoring behavior |
| Conferencing and similarity checking | Separate integration decision | Operated service, support owner, data rules and tested integration |
| Branching lessons, peer-assessment workshops, wikis, glossaries and structured learner collections | Deferred from default tools; not universally excluded | Domain/faculty requirement, historical content and dependency review |
| Calculated, embedded-answer, drag/drop and ordering questions | Controlled availability | Assessment need, scoring fidelity and accessible alternatives |
| Random short-answer matching | Defer initial exposure | Question inventory and justified teaching use |
| Badges, learning plans and competency extensions | Reassess by domain | L&D and MOOC requirements may justify capabilities previously deferred for ordinary instruction |
| AI providers/placements and predictive analytics | Not in initial proposed scope | Separate institutional decision and demonstrated need; do not infer authorization from availability |
| Extra identity providers, repositories, portfolios and SMS/push services | Enable only for an approved integration | Owner, operating cost, data contract and support plan |
| Payment gateways and paid enrollment | FMIS-first boundary decision | D-09; earlier blanket commerce disablement does not settle VLPv2 financial requirements |
| Core authorization, question/grade history, private files, jobs, backup, privacy and migration support | Preserve necessary responsibilities | Never remove merely to reduce visible feature count; implementation depends on selected engine |
| Compatibility handlers and plugin dependencies | Preserve where needed | Existing content and declared/runtime dependencies; tested migration before removal |

## Initial correctness work carried from LMS2

The recovered L1 findings are historical review observations, not current live defects certified in this change. Resolve their causes in the selected implementation or demonstrate that they do not apply.

| Finding | Evidence in L1 | VLPv2 requirement links | Required resolution evidence |
| --- | --- | --- | --- |
| F01 User counter/table mismatch | p.10 | FND-05 | Same documented population reconciles across counters, lists and exports |
| F02 Roster/assessment population discrepancy and repeated learner row | p.10 | ACD-02, LRN-08, INT-01 | Distinguish current membership, eligible learners and attempts; no duplicate person counting |
| F03 Assessment breadcrumb linked to a different class | p.10 | FND-01, LRN-01 | Resource ownership determines navigation and access |
| F04 Term label inconsistent with displayed activity/attendance dates | p.10 | FND-01, LRN-17 | Approved term scope and dates are consistent, including historical views |
| F05 Empty state shown before records load | pp.10–11 | FND-07 | Loading, error and genuinely empty states are distinct |
| F06 Broad personal profile fields exposed | pp.10–11 | FND-05, OPS-02 | Purpose-limited fields and scoped access approved |
| F07 Sample assessment content/key warrants subject review | p.10 | LRN-04–06, LRN-09 | Faculty validates content and key; do not mislabel content concern as proven engine defect |

## Confirmed-requirement coverage

| Charter requirement | Capability coverage |
| --- | --- |
| CR-01 Artifacts and complete code | Documentation now; implementation, migrations, tests and runbooks remain future outputs under OPS-03–06 |
| CR-02 LMS2 baseline plus Moodle enhancements | FND-05–08; LRN-01–19; ACD-01–05; optional capability policy |
| CR-03 Independent ERP component | FND-01–04; ACD-02; LND-01–03; MOC-01–03; INT-01–05; standalone contract in Artifact 0 |
| CR-04 Registrar/SIS | ACD-02, INT-01 |
| CR-05 HRMIS | ACD-03, LND-01, INT-02 |
| CR-06 FMIS | MOC-05, INT-03; applicability to paid offerings in any domain must be determined |
| CR-07 Local authentication and eventual SSO | FND-02–04, INT-04 |
| CR-08 Academic learners | ACD-01–05 plus shared learning engine |
| CR-09 Employee L&D learners | LND-01–05 plus shared learning engine |
| CR-10 MOOC distant learners | MOC-01–05 plus shared learning engine |
| CR-11 Draft artifacts and PR | This documentation change; scope approval and merge remain separate |

## Review sequence and implementation readiness

1. Shared foundation: agree identity/membership model, context, roles and retained LMS2 features.
2. Academic: agree master data, class rules, grading, attendance and guardian policy.
3. Employee L&D: validate HR workflows, competency/completion rules and reporting.
4. MOOC: validate external registration, admission, pacing, certification and fee applicability.
5. Cross-cutting: settle interfaces, financial boundary, security/privacy, migration, accessibility and capacity.

For each row record **approve**, **amend**, **defer to a named increment**, or **exclude with rationale** in a later revision. Proposed exclusions must be checked against actual content and institutional requirements. Deferment from a release does not remove a capability from complete-system planning.

Before implementation, expand approved rows into workflows, role/permission rules, data definitions, exceptional paths and test fixtures. Reference capability IDs in architecture decisions, issues, pull requests and validation results. All 53 entries currently have an acceptance statement; none is marked implemented or tested.

### Revision history

| Version | Date | Change | Approval |
| --- | --- | --- | --- |
| 0.1 | 2026-10-14 | Initial 53-capability inventory and evidence reconciliation | Pending review |
