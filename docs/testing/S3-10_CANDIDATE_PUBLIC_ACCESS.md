# S3-10 — Candidate and anonymous public access

Branch: `fix/s3-10-candidate-public-access`; PR target: `dev`.
Investigated baseline: `db88f7fae2da4efb4a1d53ee64cf2bb6273b537e`.

## Root cause

- The candidate Dashboard used the internal job-title count and linked to `/job-titles`, which correctly requires `CATALOG_READ`. Candidates do not have that permission.
- The candidate sidebar's “Việc làm đang mở” entry was an upcoming-feature placeholder.
- Dashboard metrics and the public careers department filter requested protected internal catalogs.
- The shared Axios client applied internal JWT, idle expiry, refresh and session-expiry handling to public job reads.
- `/careers`, `/careers/:id`, their public controllers, and GET-only Spring Security access already existed. Repository queries already restricted list/detail to `PUBLISHED` postings with a null deadline or a deadline on/after the server's current date. Those authorization rules and visibility predicates were retained.

## Changes

- Sidebar and candidate Dashboard now open `/careers`. Dashboard uses public `totalElements` with `size=1`, including when the result spans multiple pages. Zero remains zero; a failed request displays an unavailable count and a retry message.
- Dashboard only requests internal catalogs when the server-granted permission includes `CATALOG_READ`.
- `GET /api/public/job-postings/departments` returns distinct `{id, name}` options only for departments referenced by visible public postings. It does not expose the internal department description, manager, hierarchy or other catalog fields.
- Public GET job requests omit the internal bearer token and do not trigger or extend the internal session lifecycle. Protected management requests retain their existing idle checks.
- Existing public DTOs continue to hide internal approval/audit/user/requisition fields and hidden salary amounts. No schema, approval workflow, role grants, CSS or recruitment data were changed.

## Automated acceptance evidence

Backend evidence uses the real Spring Security chain, JWT filter, service, JPA repository and H2 in PostgreSQL compatibility mode. Each test transaction rolls back. It does not connect to the user's local database.

| Requirement | Evidence |
| --- | --- |
| Candidate can list public jobs | `candidateCanReadSameListAndDetailUsingRealJwt`; `CandidatePublicAccess.test.tsx` |
| Candidate can view published detail | Real JWT integration test; `PublicCareerRoutes.test.tsx` |
| Anonymous list and detail work | `anonymousCanReadListAndDetailWithoutInternalFieldsOrHiddenSalary`; public-route tests |
| Draft excluded | `nonPublicStatusesAreExcludedFromListAndDetail[DRAFT]` |
| Pending approval excluded | Same parameterized integration test with `PENDING_APPROVAL` |
| Unpublished excluded | Same parameterized integration test with `UNPUBLISHED` |
| Expired excluded | `expiredPostingsAreHiddenButTodayAndNoDeadlineAreOpen` |
| Candidate approval denied | `candidateCannotMutatePostings[approve]` and `[approve-and-publish]` |
| Candidate publish/unpublish denied | Same test with `publish` and `unpublish`; persisted status remains unchanged |
| Dashboard count correct | Public `totalElements`, multi-page count, refresh, zero and failure tests |

Additional integration checks cover `APPROVED`, `REJECTED`, `CLOSED`, hidden-detail 404s for both candidate and guest, internal list/detail/audit/create/update denial, anonymous public writes denied, department-option privacy and existing public filters. `publicJobClient.test.ts` verifies public reads with a stale internal session and that protected requests still expire.

## Validation commands

```bash
cd frontend
npm run typecheck
npm run lint
npm test
npm run build

cd ../backend/auth-service
./mvnw verify
```

Java 21 is required. In this restricted execution environment Mockito's existing agent dependency was loaded at JVM startup because dynamic self-attach is unavailable. The build used the repository's existing Maven wrapper and dependency versions.

A pre-existing failing assertion in `RbacIntegrationTest.requisitionValidationPastDateAndSalaryStandard` was reproduced on the untouched baseline: the test expected an old salary-validation message. Only its expected text was aligned with the existing `RequisitionService` response; the business validation and API were not modified.

## Recorded results

| Check | Result |
| --- | --- |
| Frontend typecheck | PASS |
| Frontend ESLint | PASS |
| Frontend Vitest | PASS — 283 tests, 33 files |
| Frontend production build | PASS — existing large-chunk warning remains |
| Backend tests within `verify` | PASS — 514 tests, 48 suites; zero failures/errors/skips |
| Backend `./mvnw -DskipTests package` | PASS — executable Spring Boot jar produced; tests were run separately above |
| Backend `./mvnw verify` | FAIL — existing `DepartmentResponse` LINE coverage 5/11 = 45%, below 60% |
| Baseline coverage comparison | Same 5/11 = 45% failure with 496 original tests passing after only aligning the stale assertion in an isolated baseline copy |
| Browser / responsive checks | BLOCKED — not reported as passing |

The coverage threshold was not lowered or bypassed. The baseline comparison confirms the coverage failure was not introduced by the public-access changes.

## Browser limitation and remaining manual acceptance

`frontend/e2e/candidate-public-access.spec.ts` defines 15 UI contract checks across the five existing Playwright projects. They mock API responses for browser navigation/layout verification; backend authorization is tested independently with real JWT integration tests.

Browser execution is **BLOCKED in this environment**, not PASS: Chrome cannot create its process-singleton Unix socket (`socket() failed: Operation not permitted`). The separate cloud browser cannot reach this execution environment's localhost (`ERR_CONNECTION_REFUSED`). Screenshots, console cleanliness and visual/responsive correctness have therefore not been verified.

Run these checks on a machine where Chrome can launch:

```bash
cd frontend
npx playwright install chromium
npm run test:e2e -- e2e/candidate-public-access.spec.ts
```

Manually confirm `JP-2026-0001` in the user's database, provided it remains `PUBLISHED` and unexpired: open `/careers` in an incognito window, open its detail, then sign in as `candidate@company.com` and compare the Dashboard count and “Việc làm đang mở” link. The task did not have access to the user's running local database or candidate password. No password was changed.
