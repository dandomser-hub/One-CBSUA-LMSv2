# Source and Evidence Register

Version: 0.2 | Updated: 14 October 2026 | Status: Supporting evidence and approved decision history for Artifacts 0 and 1

## Evidence method

The current task recovered and read the two existing assessment reports and reconciled them with the user's current instructions. It did not rerun the live LMS2 review, extract the Moodle archive again, execute Moodle, inspect deployed LMS2 source, or validate connected university APIs.

Reports are prior analytical artifacts. Their observed/source-verified findings are attributed to those reports rather than presented as independently reverified in this change. The current user instructions take precedence over prior recommendations. No learner names, individual grade records, login credentials or screenshots are copied into this repository.

Evidence dimensions are separate:
- **Requirement authority:** confirmed by user versus proposed or unresolved.
- **Observation confidence:** reported interface observation, reported static-source finding, or unverified.
- **Delivery state:** proposed, implemented, validated or deployed. This change is proposed documentation only.

## Source register

| ID | Source and date | Location / identity | Use and limits |
| --- | --- | --- | --- |
| U0 | User direction, prior analysis conversation, 13 October 2026 | Recovered context: enhance LMS2 and simplify only the selected Moodle experience/capabilities | Supersedes the earlier direction to simplify/defer existing LMS2 features |
| U1 | User project alignment, 14 October 2026 at approximately 11:16, UTC+08 | Current conversation: repository artifacts and complete functional code; LMS2 plus Moodle equals VLPv2 | Direct requirement authority for product identity and target |
| U2 | User additional notes, 14 October 2026 at approximately 11:40, UTC+08 | Current conversation: ERP integrations, local authentication then SSO, three learner categories | Direct requirement authority; does not specify detailed workflow policies or final stack |
| U3 | User authorization, 14 October 2026 at approximately 11:51, UTC+08 | “proceed with your recommendation” following proposed Artifacts 0/1 and draft PR | Authorizes document preparation and draft PR, not blanket acceptance of new proposals |
| L1 | CBSUA_LMS2_Architecture_and_Functional_Assessment_v1.0.docx; 13 October 2026; 16 pages | Library ID: libfile_64601cf082b0819183735b0676f3dd77 | Read for this task. Administrator-interface observations and proposed logical models; not physical database/source or full role testing |
| M1 | CBSUA_Moodle_Architecture_and_LMS2_Enhancement_Blueprint_v1.0.docx; 13 October 2026; 20 pages | Library ID: libfile_30c90f392e488191aa2d32e8f2451dea | Read for this task. Reports static analysis of supplied package and LMS2 enhancement proposals; no executed Moodle acceptance test |
| A1 | moodle-5.3.tgz, previously uploaded package | Library ID: libfile_9be4e3a2274481919384e2c054d96b3d | Underlying source referenced by M1; not re-extracted or rehashed in this task |
| G1 | Repository initial state checked 14 October 2026 | Main commit 3440ca88c0ea294150749a9c0006026652e70a26; initial tree fb91ac4ba390988a5c3f727434e26a42ad608f91 | Only README.md present at inspection; no existing app code, architecture files or repository instruction files in returned tree |
| T1 | Bid-Supplement-No.-G-22-02-A-Smart-Campus.pdf, known project source | Library ID: libfile_8fee7572e84c8191b3f48751c66ac9e9 | Not read or mapped in this task; contractual/approved LMS requirements reconciliation remains an explicit dependency |

Library IDs identify the user's source documents; they are not public URLs. Relevant findings are summarized below so reviewers can understand this draft without accessing the source system. Original reports and archives are not duplicated in GitHub by this change.

## L1: supported baseline and boundaries

L1 pp.3–4 reports the following interface capabilities: class directory and scheduled offerings; class workspace; lessons; resource types/previews; activity authoring; five question types; submission/attempt review; students/attendance; guardian requests; news posts/comments/reactions; events; direct/group chat workspace; user directory; activity-type control panel; profiles; feedback and theme control.

Observed action buttons establish offered controls, not completed transactions. Uploading, copying, deleting, publishing, grading, attendance changes and guardian decisions were not executed during that review. Student, faculty and guardian authenticated journeys were not tested.

L1 pp.1–2 reports Nuxt/Vue frontend fingerprints and local/Keycloak login options. It does not identify the backend framework, physical database, deployment topology, functioning SSO federation or integration contracts. Its proposed schema must not be treated as extracted LMS2 tables.

L1 pp.10–11 reports counter/roster/context/date discrepancies, loading-state confusion, broad profile fields and a sample content/key review concern. These are carry-forward validation priorities, not current security certifications or root-cause findings.

## M1: selected learning capabilities and boundaries

M1 pp.3–4 describes the supplied Moodle package as a PHP modular monolith with shared authorization, course, enrollment, question, grading, file and task infrastructure. This supports dependency-aware evaluation; it does not mandate this architecture for VLPv2.

M1 pp.9–12 recommends assignments, quizzes, question-bank functions, controlled resource types, forums, common question types, exam/practice presets and rubric/gradebook support. M1 pp.14,16,18 supplies proposed acceptance patterns for attempts, history, reconciliation, integration and recovery.

M1 p.2 reports archive identity and inventory; those figures are historical report findings, not recalculated here. A claimed package version is not independent proof of upstream provenance. Do not infer runtime performance or production readiness from file/component/table counts.

M1 pp.15–17 leaves the learning-engine choice open. Supported Moodle integration was a candidate, not approval to replace the LMS2 backend. Source/schema access, maintainability, rights and representative prototypes remain prerequisites.

## Supersession and reconciliation

| Earlier recommendation | Current controlling direction | Treatment in this draft |
| --- | --- | --- |
| L1 simplify LMS2 and defer feed/chat/guardian functions | U0 and U1: LMS2 must be enhanced; selected Moodle functionality tailored to CBSUA | Keep those features in the inventory; validate applicability and policy rather than remove |
| M1 disable commercial enrollment/payment in an ordinary-instruction profile | U2: integrate FMIS for relevant payment/cashiering/POS modules | Financial integration is required; local financial workflow and domain applicability remain open |
| M1 institutional authentication and controlled recovery as the preferred profile | U2: local authentication/authorization initially, eventual IAM SSO | Standalone authentication is required from the start; plan account linking and coexistence |
| M1 self-enrollment only by exception in an academic profile | U2: add MOOC learners | MOOC registration/admission/self-enrollment becomes a domain-specific proposal |
| M1 defer full learning plans and badges | U2: add Employee L&D and MOOC | Reevaluate against HR/program needs; no automatic inclusion or blanket exclusion |
| M1 curated Moodle pilot alongside LMS2 enhancement | U1/U3: first align VLPv2 scope and architecture | Preserve as an engine-evaluation option; do not deploy a pilot in this documentation task |
| Earlier conceptual tables or suggested Laravel stack | U3: establish scope before final architecture | Treat as candidates only; physical schema and technology remain undecided |

## Evidence gaps and next verification work

| Gap | Why it matters | Evidence needed | Decision links |
| --- | --- | --- | --- |
| LMS2 source and permitted reuse | Determines feasibility of literal refactoring and maintained ownership | Authorized source, dependency manifests and reuse terms | D-06–07 |
| Physical schema and service topology | Prevents implementation against an invented database | Schema-only DDL/migrations; redacted service/deployment inventory | D-06–08 |
| Full cross-role behavior | Interface review cannot establish enforcement or assessment reliability | Controlled synthetic faculty/student/guardian sessions and negative access tests | D-11, D-14 |
| Existing course content and historical records | Determines migration and safe optional-feature disposition | Content-type inventory, exports and reconciliation samples | D-15, D-17 |
| University-approved/contractual LMS requirements | Prevents dropping obligations while curating scope | T1 LMS requirements extraction and traceability review; other approved sources if applicable | D-15 |
| Registrar/SIS, HRMIS, FMIS and IAM contracts | Integration directions do not identify endpoints or field ownership | Owner-approved schemas, identifiers, sandboxes, policies and service expectations | D-08–10 |
| Academic, L&D and MOOC policies | Determines real enrollment, grading and completion workflows | Domain-owner decisions and representative accepted scenarios | D-11–14 |
| Nonfunctional and operating targets | Prevents invented capacity, deadlines and service promises | Workload model, user task baseline, recovery and support objectives | D-16 |

The gaps do not block preparation of these draft artifacts. They constrain final scope approval, architecture selection and implementation claims.

## U4 approved decisions on 14 October 2026

At approximately 23:09 UTC+08, Archi-D approved D-05; specified the current Bolt-connected frontend, backend/data, tooling and infrastructure for D-06/D-07; established UIS/Registrar as the student-record source and HRIS as the employee-record source under D-08; and confirmed that records without ERP connections are locally controlled by VLPv2.

U4 resolves D-09 as financial inquiry/assessment only. VLPv2 does not process payments, collect money, issue payment receipts or provide cashiering/POS. This supersedes the earlier U2 financial wording and the historical open-boundary discussion above. Interface fields and the exact meaning of financial assessment still require specification.

The current repository contains an evolving React/TypeScript prototype and database migrations, as shown by main commit 5af8ee3f015faf3fc4308fc4c7a340170c8f70d6 and its current README. This decision update does not independently certify hosted Postgres version, deployed Edge Functions, dependency versions or production acceptance. The current stack versions in Artifact 0 are user-declared baseline decisions.

Historical evidence gaps concerning legacy source remain relevant for migration and faithful mapping; they no longer require reopening the approved current Bolt implementation choice. D-08 interface contracts and D-10–16 policy/operational details remain unresolved.
