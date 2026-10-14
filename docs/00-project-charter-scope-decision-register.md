# Artifact 0 — Project Charter, Scope, and Decision Register

Version: 0.1 | Prepared: 14 October 2026 | Status: Draft for review  
Project: One-CBSUA Learning Management System v2 (One-CBSUA-LMSv2), also called VLPv2  
Repository: https://github.com/dandomser-hub/One-CBSUA-LMSv2  
Requirements authority for this draft: Archi-D, University ICT Director / Lead Systems Architect  
Companion: [Artifact 1 — Functional Scope and Capability Matrix](01-functional-scope-capability-matrix.md)  
Evidence: [Source and Evidence Register](02-source-and-evidence-register.md)

## 1. Charter and governing direction

VLPv2 is a complete, independently functional university learning management system within the One-CBSUA ERP ecosystem. It takes the relevant functionality of LMS2 (lms2.cbsua.edu.ph), refactors and tailors it to CBSUA, and enhances it with selected capabilities derived from the previously analyzed Moodle package.

**Functional direction: LMS2 baseline + selected Moodle capabilities + CBSUA requirements = VLPv2.**

The repository must ultimately contain the system design and architecture artifacts, complete application source code, database migrations, tests, configuration templates, deployment and operational instructions. The current change creates requirements documentation only; it does not deliver a working application.

The complete system is the target. Controlled increments and an MVP are delivery stages, not an automatic reduction of the final scope. Existing LMS2 features cannot be dropped merely because an earlier report recommended a smaller interface or deferred social/guardian features. Any scope retirement needs an explicit decision with rationale, usage and dependency evidence.

This functional direction does not select a technology stack, require a literal merge of codebases, authorize copying vendor source, or approve a Moodle-backed implementation. Those choices require design evidence.

## 2. RPM: result, purpose, massive action plan

**Result:** A deployable, supported and validated LMS serving Academic, Employee Learning and Development, and MOOC learning, with independently operable workflows and defined integrations to Registrar/SIS, HRMIS, FMIS and university IAM.

**Purpose:** Deliver dependable teaching and learning, protect assessment evidence, reduce duplicate institutional records, and support university-wide learning through a coherent experience and accountable record ownership.

**Massive Action Plan:** Reconcile evidence and requirements; approve domain boundaries and capability scope; define workflows and authorization; evaluate the implementation engine; design data and integration contracts; prototype representative journeys; plan increments; implement; validate; deploy; operate and improve.

### Completion measures proposed for approval

| Outcome | Acceptance evidence | Target status |
| --- | --- | --- |
| Independent operation | Each domain completes registration/provisioning, enrollment, learning, assessment and completion in a deployment without connected ERP/IAM services, subject to its approved policies | Required direction; exact domain journeys to approve |
| Three-domain coverage | Academic, employee L&D and MOOC scenarios pass; a multi-domain person retains separated memberships and learning records | Required domains; detailed model proposed |
| Data integrity | Repeated imports do not create duplicate memberships; every counter/export reconciles to its documented population; corrections retain history | Proposed mandatory gate |
| Assessment reliability | Disconnect/resume, duplicate submission, deadlines, marking and release scenarios pass with no lost acknowledged responses in the agreed test suite | Proposed mandatory gate |
| ERP readiness and operation | Versioned contracts and adapter tests exist; production-connected workflows pass with the actual owning systems before integrated rollout | Integration required; schedules unresolved |
| Reproducible delivery | A clean environment can install the documented code version, migrate the schema, run checks and restore protected data and files | Proposed mandatory gate |
| Usability and capacity | Representative users complete tasks; measured workload meets approved response-time, accessibility and concurrency targets | Numeric targets unresolved; never inferred from source size |

No budget, delivery date, throughput, recovery objective or service level is committed by this draft.

## 3. Confirmed requirements register

These are confirmed user directions, not approval of every proposed matrix row.

| ID | Confirmed requirement | Source |
| --- | --- | --- |
| CR-01 | Use this GitHub repository for system design/architecture artifacts and complete functional application code | U1 |
| CR-02 | Retain the relevant LMS2 baseline, refactor it for CBSUA and enhance it using selected Moodle capabilities | U1, U0 |
| CR-03 | Build as part of the university ERP while remaining fully functional independently | U2 |
| CR-04 | Integrate Registrar/SIS to pull and populate student and class lists | U2 |
| CR-05 | Integrate HRMIS as the employee/faculty list source | U2 |
| CR-06 | Integrate FMIS for relevant payments, cashiering and POS functionality | U2 |
| CR-07 | Begin with local authentication and authorization, with eventual university IAM/SSO integration | U2 |
| CR-08 | Support Academic learners: collegiate, graduate, special and short-term programs | U2 |
| CR-09 | Support Employee L&D learners as distinct from regular university students | U2 |
| CR-10 | Support distant learners participating in university MOOC programs | U2 |
| CR-11 | Prepare this charter and capability matrix on a documentation branch and present a draft pull request | U3 |

## 4. Scope and learning domains

### Academic learning

Support academic offerings, faculty assignments, students and class lists, lessons/materials, activities, assessment, feedback, learning progress and attendance. Collegiate, graduate, special and short-term offerings belong here according to the user's classification; a short duration alone must not turn an offering into a MOOC.

Registrar/SIS is the confirmed source for students and class lists once integrated. Ownership of terms, subject catalog, teaching assignments and official grade handoff must be agreed with academic owners. LMS activity marks are not automatically official Registrar grades.

### Employee Learning and Development

Provide a distinct employee learning context linked to HRMIS employee identity. Proposed workflows include training offerings, cohorts, nomination or enrollment, attendance/participation, assessment, competencies, completion and employee learning history. These detailed workflows require HR/L&D validation; they must not be represented as already observed LMS2 features.

### MOOC learning

Support university MOOC offerings for distant learners. Proposed workflows include public discovery, registration, self-enrollment or controlled admission, self-paced/cohort delivery, assessment and completion/certification. Free and paid offerings, identity assurance and certificate eligibility require approved policies. The category does not imply unrestricted access to academic or employee records.

### Shared services proposed

One shared learning engine with domain-specific policies is the recommended logical model. Shared services cover identity, scoped roles, learning content, assessments, files, communication, progress, reporting and operations. Domain rules determine enrollment, curriculum metadata, grading, completion, financial conditions and administration.

One person may have several memberships and roles, such as faculty, L&D learner and graduate student. Role switching is a candidate interface pattern; regardless of UI, the effective resource context must govern authorization. Cross-domain records must not be combined merely because the person shares an account.

Existing LMS2 guardian requests, news feed, reactions/comments, events, chat, feedback, profile maintenance and activity-type administration remain visible in the inventory. Domain applicability and operating policy are review items, not silent exclusions.

## 5. System ownership and independent operation

This is a proposed responsibility contract under the confirmed integration directions, not a verified description of existing university APIs.

| Data/service | Connected authority | Standalone VLPv2 behavior proposed | Cutover and conflict rule proposed |
| --- | --- | --- | --- |
| Student identity and class membership | Registrar/SIS | Authorized local entry or validated import with provenance | Match approved stable identifiers; review conflicts; do not overwrite history |
| Terms, subjects, sections and offerings | Academic owner to designate | Local catalog and offering administration | Define field ownership before synchronization |
| Employee/faculty identity | HRMIS | Authorized local records/import | Link source identities; employment status does not silently erase learning history |
| Faculty teaching assignment | Academic scheduling owner, to confirm | Authorized offering assignment | HRMIS identity alone does not grant course teaching access |
| Employee training enrollment | HR/L&D process, to confirm | L&D administrators manage program cohorts | Separate employment identity from training participation |
| MOOC identity/enrollment | VLPv2 or designated service, to confirm | Approved external registration/admission | Define linking to institutional identity without email-only merging |
| Authentication | University IAM when integrated | Local login, recovery and session management | Preserve account IDs and records; define local-account coexistence and recovery |
| Application authorization | VLPv2 under institutional policy | Scoped local roles and memberships | SSO authentication alone must not confer course or administrative rights |
| Learning content, attempts and feedback | Selected VLPv2 learning implementation | Fully operated locally | One authoritative owner for each assessment and grade |
| Official academic grades | Registrar-approved process, to confirm | Retain LMS gradebook evidence | Approved export/acknowledgment; avoid automatic official posting |
| Payments, cashiering and POS | FMIS for its financial responsibilities | Local requirement unresolved; no invented settlement or receipt authority | Define initiation, confirmation, reversals, reconciliation and outage handling |
| Completion and certificates | Domain owner and VLPv2 implementation | Apply approved eligibility and issuing rules | Preserve evidence, versions and revocation history |

### Integration requirements proposed

Use documented, versioned interfaces or controlled import contracts. Record source IDs, target IDs, source version/effective date, batch/event ID, result and reconciliation totals. Repeated and out-of-order messages must not duplicate or silently reverse records. Provide rejected-item review, replay and visible source timestamps.

Do not treat upstream unavailability as permission to invent enrollment, payment confirmation or access rights. Preserve existing authorized learning according to an approved outage policy. Local corrections to mastered fields require a documented exception and reconciliation path.

Integration testing requires synthetic or appropriately governed test records. Never commit production learner records, passwords, tokens, payment credentials or private attachments to this repository.

### Authentication transition requirements proposed

Separate the local user from login identities and domain memberships. Link university IAM identities through a verified procedure and stable provider identifiers. Test duplicate identity conflicts, account suspension, session termination and permission changes. Define external MOOC learner login and controlled recovery access during the IAM transition. Protocol, provider configuration, MFA policy and local-login retirement remain open.

## 6. Boundaries and non-goals of this change

- This draft establishes a reviewable requirements baseline; it does not implement, deploy, migrate or change the live LMS2.
- It does not select Laravel, Nuxt, Moodle or any database as the final VLPv2 stack.
- It does not certify the existing system, its physical database or its contractual compliance.
- It does not assume all Moodle modules belong in VLPv2, or authorize deleting Moodle core/dependencies.
- It does not replace Registrar/SIS, HRMIS, FMIS or university IAM.
- AI, blockchain, specialist assessment/content services and other optional tools are not automatically in scope; explicit need and approval are required.
- Payments/cashiering/POS are required integration concerns, not blanket exclusions. Their exact local and FMIS boundaries are unresolved.

## 7. Proposed responsibilities and review groups

| Review responsibility | Proposed reviewer/owner | Decision scope |
| --- | --- | --- |
| Product and architecture | Archi-D / University ICT Office | Scope, architecture, engineering and release coordination |
| Academic learning | Designated academic, Registrar and faculty representatives | Offerings, assessment, grading, attendance and official handoff |
| Employee L&D | Designated HR/L&D representatives | Training enrollment, competencies and employee learning records |
| MOOC programs | Designated university program owner | Admission, delivery, completion, certificates and applicable fees |
| Financial integration | Designated FMIS, accounting/cashiering owners | Financial authority, payment states, POS boundaries and reconciliation |
| Identity and information governance | IAM administrators and designated privacy/security owners | Identity lifecycle, access, retention and disclosure |
| Operations and support | ICT operations and campus support representatives | Deployment, monitoring, support, recovery and service targets |

These are proposed responsibilities, not appointed signatories or a claim of approval by those offices.

## 8. Decision register

| ID | Status | Decision or question | Resolution evidence / owner proposed |
| --- | --- | --- | --- |
| D-01 | Confirmed | VLPv2 name, complete-system destination and GitHub artifacts/code | CR-01–02 |
| D-02 | Confirmed | Independently functional within university ERP | CR-03 |
| D-03 | Confirmed | Registrar/SIS, HRMIS, FMIS and IAM integration directions | CR-04–07 |
| D-04 | Confirmed | Academic, Employee L&D and MOOC domains | CR-08–10 |
| D-05 | Proposed | Shared engine, distinct domain policies and one identity with contextual memberships | Product owner and domain reviewers; prove multi-role isolation |
| D-06 | Open | Native LMS2 refactor, supported Moodle-backed learning services, or another maintainable implementation | ICT: obtain LMS2 source, reuse rights, manifests, schema and API evidence; compare representative prototypes |
| D-07 | Open | Final stack, database, deployment and supported version policy | Architecture decision record after D-06 |
| D-08 | Open | Authoritative fields, identifiers, API availability and synchronization cadence for each ERP link | Registrar/SIS, HRMIS, FMIS, IAM owners |
| D-09 | Open | Local financial workflows, cashiering/POS scope, fee authority, reversals and outage behavior | Financial and domain owners; resolve before paid enrollment implementation |
| D-10 | Open | IAM protocol, identity linking, external MOOC accounts, MFA and local-login coexistence | IAM and ICT owners |
| D-11 | Open | Academic grading, rounding, retakes, extensions, accommodations and official grade handoff | Academic/Registrar owners |
| D-12 | Open | L&D nomination, competencies, hours/credits and completion reporting | HR/L&D owners |
| D-13 | Open | MOOC admission, pacing, assessment identity assurance and certificate rules | MOOC program owners |
| D-14 | Open | Guardian applicability, verification, consent, access scope, expiry and revocation | Academic and information-governance owners |
| D-15 | Open | Existing content migration, historical records, contractual requirements and retention | ICT plus responsible institutional owners |
| D-16 | Open | Capacity, accessibility target, support hours, RPO/RTO and pilot success thresholds | ICT and representative users |
| D-17 | Proposed | Optional Moodle capabilities require usage evidence and a maintained support owner | Capability review; see Artifact 1 |
| D-18 | Confirmed | Draft documentation branch and pull request; detailed scope still subject to review | CR-11 |

## 9. Risks and dependencies

| Risk | Impact | Next action |
| --- | --- | --- |
| LMS2 source, schema and reuse rights unverified | Cannot yet promise a literal code refactor or estimate implementation effort | Obtain permitted source/manifests and schema-only evidence |
| Interface observations mistaken for tested functions | False confidence in assessment and authorization behavior | Controlled faculty/student/guardian tests; preserve observed versus verified distinction |
| Three domains modeled as one student category | Incorrect access, enrollment and reporting | Validate separate domain journeys and multi-membership scenarios |
| Payment scope left implicit | Conflicting receipts, access grants or accounting records | Resolve D-09 with FMIS owners before financial implementation |
| Duplicate master data and grade ownership | Drift and incorrect institutional reports | Agree contracts and one owner for each record/field |
| Historical Moodle simplification applied without inventory | Loss of content/dependencies or university-required features | Approve dispositions against content and requirements inventory |
| Nonfunctional targets or staffing absent | Unreliable capacity and delivery estimates | Set targets from representative workloads and operational capacity |

## 10. RPM delivery gates and next artifacts

| Stage | Work product | Exit evidence proposed |
| --- | --- | --- |
| Conceptualization | Artifacts 0 and 1, evidence register | Confirmed directions separated from approved proposals and open questions |
| Analysis | Domain journeys, role matrix, full requirements and traceability | Each required capability has an owner, acceptance criteria and resolved critical policy |
| Design and architecture | Engine ADR, context/container/module designs, ERD, data dictionary, API/security contracts | Ownership, dependencies, migration and operation reviewed |
| Prototype | Synthetic end-to-end Academic, L&D and MOOC journeys | Quiz resilience, assignment marking, identity separation and integration failure handling demonstrated |
| MVP planning | Increment plan linked to complete scope | Explicit release contents and later increments; no silent final-scope loss |
| Controlled implementation | Application code, migrations, tests and CI | Each increment meets its acceptance contract |
| Validation | Cross-role/domain/campus, load, accessibility, migration and restore evidence | Agreed gates pass; blocking defects resolved |
| Deployment | Controlled rollout, cutover and rollback plan | Operational readiness and accountable release decision |
| Operations | Monitoring, support, backups and integration reconciliation | Service targets tracked and incidents actionable |
| Continuous improvement | Measured backlog and updated decisions/artifacts | Changes remain traceable to requirements and evidence |

## 11. Review and change control

Review Artifact 1 in five groups: shared foundation; Academic; Employee L&D; MOOC; cross-cutting/integrations. Confirm, amend or defer proposed rows explicitly. Maintain requirement IDs through future workflow, schema, issue, code and test references.

Approval to prepare a draft is not blanket approval of its recommendations. This pull request remains a draft until reviewed. Record approved changes in this register with date, authority and rationale; a capability deferred from an increment remains visible in the complete-system scope.

### Revision history

| Version | Date | Change | Approval |
| --- | --- | --- | --- |
| 0.1 | 2026-10-14 | Initial charter reconciled with recovered assessments and current user directions | Pending review |
