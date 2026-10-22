# Main demo deployment implementation plan

**Goal:** Deploy only an integrated main commit with a real Spring Boot API and persistent PostgreSQL; never report a partial deployment as READY.

**Architecture:** Vite on Vercel, Java 21 container on Railway, managed PostgreSQL. Demo provisioning is an explicit one-off command; ordinary startup never creates demo users. Existing UI remains unchanged.

**Source:** User deployment specification, main b14e2f49da67c36d2bbcef4b7fece95f6dff8088.

## Constraints and review focus

- Preserve existing data, migration checksums, user changes and main history. No reset, force push, automatic schema baseline, Flyway repair or dev merge.
- Require prod environment secrets, exact HTTPS CORS origins, PostgreSQL and schema validation.
- Keep seven demo passwords distinct and external. Reject collisions; one transaction and a ledger make repeated seeds safe.
- Exercise approval and publishing services to generate snapshots and logs.
- Candidate submission and management are incomplete on main and must stay NOT IMPLEMENTED.
- API/network errors must not produce local demo successes.

## Tasks

1. Reproduce frontend baseline; test default initializer exclusion and duplicate Flyway versions before fixing. Run backend on Java 21.
2. Archive conflicting migration copies without modifying SQL; introduce one canonical V24_1 configuration before V25 actions. Validate against a fresh local PostgreSQL; existing databases must pass history validation without repair.
3. Add prod configuration and Java container, Vercel routing/build configuration, and strict deployment environment validation.
4. Add guarded demo seed service, transactional ledger and root seeder.sh. Seed users, catalogues, framework, budget, approval configuration, draft/pending/approved requisitions, recruiter assignment and published posting through domain services.
5. Verify fresh migration, repeat seed, collision rollback, logins, public API, RBAC and persistence; run frontend and backend tests/verify without skipping checks.
6. Push deploy/vercel-main-demo and create a PR to main. Do not merge or deploy failing checks. Only create production services after provider access exists, then deploy the integrated main SHA and run production E2E.

## External prerequisites

Railway connection is pending. Vercel has no matching project. No recruitment PostgreSQL or storage provisioned. Do not repurpose unrelated databases.

## Execution checkpoint

Railway was declined; do not request it again. Backend/container provider and managed PostgreSQL are still missing. Local checks: frontend 266 PASS, backend 515 PASS and all verify/coverage gates PASS. Independent review found the production locations load regression and remaining client fake fallbacks; both were fixed and regression-tested. Browser checked existing organization UI in all five required sizes using a local test backend; this is not production/PostgreSQL E2E. PostgreSQL 16 CI workflow added to obtain native migration/seed evidence. No main merge or production deployment without that evidence and actual hosting resources.
