# Bounded platform completion

Local acceptance for the inherited uncommitted platform slice on
`feat/learner-experience-vertical-slice`, based on `9845fad`. This is not a
deployment approval or completion of the P2 platform roadmap.

## Inherited intent retained

- Campaign discovery: list contracts, repository/service/route, web list/helper.
- Commons creation/remix panels and API helpers, retaining attribution.
- Compute retry environment settings, delayed queue selection, provider-run/detail
  contracts, and worker retry events.
- LTI discovery and Google OAuth contracts/scaffolds. Unsafe LTI behavior is
  deliberately unavailable rather than presented as verified authentication.

The backlog, integration overview and local-hardening document govern this scope.
No applicable AGENTS.md was found in the checkout or its ancestor directories.
Adventure UI, gameplay and learning contracts are unchanged and have no new
campaign/compute/ledger/LMS dependencies.

## Exact source changes beyond the inherited edits

- `.env.example`: document bounded retry semantics (additional retries after the
  initial attempt). `apps/api/src/env.ts`: maximum 10 retries, base delay at most
  60 seconds, and strict boolean environment parsing.
- `packages/core/src/index.ts`: shared strict environment boolean schema. Only
  booleans and exact `true`/`false` strings are accepted; ambiguous values fail
  startup instead of silently enabling features.
- `packages/core/src/contracts/compute.ts`: include nullable `nextAttemptAt` in
  parsed jobs; discriminate inference/scoring request payloads by job type.
- `apps/api/src/repositories/compute-repository.ts`: atomic due-job claim using
  `FOR UPDATE SKIP LOCKED`; increment attempt count with claim; only running jobs
  may transition; clear stale errors explicitly; preserve omitted results; write
  native JSONB; retrieve typed provider runs; allow null system audit actor.
- `apps/api/src/services/compute-worker-service.ts`: bounded exponential retries
  only around computation/validation, maximum one-hour delay; no retry on validator
  rejection; no requeue on persistence/reward/event/audit errors; system audit uses
  null, not a fabricated user UUID that violates the audit foreign key.
- `apps/api/src/services/compute-service.ts`: parse the complete detail response,
  including provider runs. Its existing admin/educator access policy is retained.
- `apps/api/src/services/campaign-service.ts`: validate list filters; admins read
  all campaigns, educators only their own. Apply the same visibility check to
  detail/history before ledger/contributor reads. Parent/expert/student access is
  denied because no campaign-specific guardian/expert visibility policy exists.
  Creation/allocation remain admin-only.
- `apps/api/src/repositories/{campaign,commons}-repository.ts`: correct JSONB
  serialization for ledger metadata, Commons tags and audit payloads. Real database
  tests exposed double-encoded JSON strings that unit fixtures did not catch.
- `packages/integrations/lti/src/index.ts`: discovery, login and callback fail
  closed even with provider mode enabled; no issuer-controlled network request,
  synthetic authenticated launch, or unbounded/reusable state cache remains.
  The contracts remain for a future verified implementation; the consumer remains
  an explicitly unsigned request scaffold, not authentication.
- `packages/integrations/google-classroom/src/index.ts`: both OAuth entrypoints
  reject disabled mode and placeholder credentials; validate bounded state/code
  inputs and HTTPS/loopback redirect configuration; token exchange rejects
  redirects, times out after five seconds and validates the token response.
- `packages/integrations/{rostering,open-badges}/src/index.ts` and
  `packages/lms-adapters/src/index.ts`: use the same strict boolean parser, avoiding
  inconsistent interpretation of explicit `false` by an adapter versus the API.
  No new network behavior was introduced in these scaffolds.
- `apps/web/app/campaigns/page.tsx`: label demo fixtures; failed authenticated
  listing yields an explicit unavailable state, never a success-looking demo list.
- `apps/web/components/operator-panel.tsx`: label legacy email/role forms as
  previews requiring a token-aware operator UI; add accessible input labels.
- Regression tests updated/added in `apps/api/src/services/{campaign-service,
  compute-service,compute-worker-service}.test.ts`,
  `packages/integrations/{lti,google-classroom,rostering}/src/index.test.ts`, and
  `apps/api/tests/platform.integration.test.ts`. Other touched inherited source
  files were only formatted where needed.

## Local acceptance

Validation uses synthetic data, mocked provider HTTP, and disposable loopback
PostgreSQL databases. No server is started on ports 3000/4000.

- `pnpm typecheck`: all 15 workspace packages pass.
- Root `pnpm test` with disabled integration flags explicitly set to `false`:
  67 tests pass (56 API, 5 LTI, 2 rostering, 3 Classroom, 1 badge).
- Direct ledger/LMS unit invocation with synthetic required environment: 7 pass.
- Direct API `tests/*.integration.test.ts` invocation with `fixture-env.ts` and
  explicit loopback `TEST_DATABASE_ADMIN_URL`: 17 pass, including 5 platform
  tests (parent test plus four subtests). All 14 existing migrations bootstrap;
  no migration file was changed. Disposable databases are cleaned afterward.
- Biome checks target tracked changed TypeScript/TSX plus the new integration
  test, not ignored operator credentials or user configuration. `git diff --check`
  passes. The coordinator's `biome.json` ignore-safety fix is preserved.
- Concurrency regression: eight database claims select one job exactly once;
  future retries are excluded, due retries are claimable and attempts increment.
- Reward regression: post-finalization failures (including committed reward with
  lost acknowledgement) cannot requeue/reward again; database unique references
  reject duplicate ledger transactions and successful entries balance to zero.

## Deliberate limitations / release blockers

- No compute leases/crash recovery, transactional finalization/outbox or automated
  reward reconciliation. A crash or persistence error can leave `running` jobs or
  terminal jobs missing events/rewards/audit. Errors propagate for review; do not
  manually reset jobs or replay financial writes without reconciliation.
- Rewards still use the existing provider-only policy; validator rewards and
  monetary policy are not implemented. Existing admin/educator compute reads are
  platform-wide, not requester/tenant-scoped. Only synthetic aggregate work is
  accepted for this local verification, not real child data.
- Campaign allocations still have the existing concurrent balance-check race;
  list pagination and ledger reconciliation remain P2 work. Duplicate ledger
  references reject replays, but this is not full transactional allocation safety.
- Commons asset/edge/audit writes are not one transaction; duplicate slugs reject
  duplicate publication rather than return an idempotent success. Moderation,
  source-link policy, publication approval and privacy-safe impact attribution
  remain release work. No learner activity is newly coupled to Commons impact.
- Legacy operator helpers still call the intentionally removed email/role login;
  they cannot perform live writes. No token is added to URLs or login re-enabled.
  Browser acceptance/full `verify:local`/production build were not run in this
  round; default browser ports belong to the adventure worktree.
- LTI requires registered trusted platforms, SSRF controls, verified JWT/JWKS,
  deployment/audience checks and expiring single-use nonce/state before enablement.
  Google helpers are not a complete OAuth callback/session flow: server-bound
  state/PKCE, secure token storage/refresh and sandbox acceptance remain necessary.
  No Google/LTI/roster/LMS/badge hosted flow was exercised or claimed live.
- Dependency advisories are owned by the separate dependency worktree. No package
  manifest/lockfile, hosted service, remote database, deployment, merge, commit,
  billing setting or real participant record was changed. `.agents/`,
  `opencode.json` and `skills-lock.json` are untouched user configuration.
  `apps/web/tsconfig.tsbuildinfo` was already modified and remains generated state,
  not intentional platform source. The coordinator reported possible credential
  disclosure by an earlier lint run; rotation requires separate authorization.
