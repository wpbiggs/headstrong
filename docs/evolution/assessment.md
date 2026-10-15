# Repository assessment — 2026-10-14

Historical audit baseline. See `local-hardening.md` for subsequent migration repairs,
removal of public email/role login and disabling of unverified LTI credential issuance.

Scope: tracked workspace inventory, all 11 SQL migrations, API routes/services/repositories,
shared contracts/packages, web routes/components, configuration, tests and CI. This is a
source review and local prototype validation, not a penetration test or a production audit.

## Baseline and reusable components

- Next.js 14 / React 18 web, Hono API, TypeScript, Zod and postgres.js. Keep this monolith.
- `core/quest.ts` has parent-approved lifecycle events, task persistence and audit contracts.
  `quest-service.ts` already creates tasks transactionally. Reuse existing approved quests.
- `ScenePlan v1` bounds entities/interactions and validates target references. The scene
  planner provides deterministic templates; the old `scene-runner.tsx` renders cards only.
  WebXR availability detection is not an XR implementation.
- Portfolio artifacts are a shared schema only; there is no persisted learner portfolio.
  `mastery_signals` and LMS completion exist, but are not evidence-reviewed portfolios.
- Moderation is a small keyword heuristic, not a comprehensive child-safety service.
- AI composition uses the existing gateway and sends the supplied profile wholesale.
  The default composer is deterministic. No runtime MCP permission system exists.
- Commons, campaigns, ledger, social governance and compute are reusable separate domains.
  Do not couple the experience engine to those implementation details.
- Moodle/ERPNext fabricate identifiers/statuses without network calls. Clever/ClassLink,
  badges and most Google Classroom operations are scaffolds. LTI is NOT a verified launch.
  Existing uncommitted code adds discovery/OAuth methods, not a secure complete integration.

## Security findings / release blockers

| Priority | Finding | Required remediation |
| --- | --- | --- |
| Critical | `/auth/login` trusts email and requested role, including admin, with no proof of identity | Verified identity provider, server-owned role grants, revocation; prototype must stay loopback-only |
| Critical | LTI callback trusts query identity and issues a real session; nonce/signature/audience/deployment are not verified | Disable callback until verified JWT/JWKS, allowlisted issuer, single-use state/nonce, expiry and deployment validation |
| High | `z.coerce.boolean()` treats environment string `false` as true | Strict boolean parsing throughout; new slice uses strict parsing, old flags remain a separate blocker |
| High | Caller-supplied quest composition includes moderation verdict | Recompute moderation server-side on persistence and validate educator/parent role assignments |
| High | AI composer forwards personal profile and accepts arbitrary text with no egress policy | Minimize/redact personal context, explicit operator approval, deadlines/budgets, no tools by default |
| High | Educator inbox/read rules admit unassigned or warned quests broadly | Scoped assignment and consent, deny unrelated educator access |
| High | LMS completion route accepts educator-supplied learner/skill IDs without quest assignment checks; replays still average the score | Enforce learner/quest ownership and make the complete mastery update transactional and idempotent |
| High | Social moderation permits all educators to read/remove/restore posts; restore sets `live` without restoring pending guardian consent | Scoped moderation privileges, explicit guardian state transitions and transactional audits |
| High | Permissive CORS, no rate limits, seven-day bearer sessions, no revocation | Explicit origins, verified auth, bounded requests, hardened session lifecycle |
| High | Campaign balance read and debit write are separate; compute claim/finalization are non-atomic | Row locks, idempotency, transactions, immutable results and ledger reconciliation |
| Medium | Private text is copied into quest audit metadata; demo fallbacks hide network errors | Minimized audit metadata and explicit demo/offline states |

The new slice does not fix all legacy security boundaries. Its local-only flag is a
containment measure, not production authentication or a child-safety certification.

## Migrations and breaking-change risks

- `0006_social_governance.sql` reads nonexistent `discovery_posts.status` on a fresh schema
  (0005 creates `state`). Fresh bootstrap is broken before this slice; do not silently
  rewrite an already-applied migration. A targeted bootstrap repair is required.
- `0004` does not add `educator_reviewed` to the original quest event constraint although
  application code emits it. Existing scene backfill may exceed the current 30-minute cap.
- `0011` replaces `validated` with `succeeded` without migrating existing rows first.
- Migration runner reapplies every file without version tracking or per-file transaction.
  Baseline must be reconciled before automated deployment. Never run it against production.
- Inherited uncommitted compute code references `next_attempt_at`, absent from migrations.
- Audit `entity_id` is UUID, but admin relationship operations supply colon-separated
  composite IDs (and denial paths sometimes supply role names). Those writes fail in SQL
  despite in-memory tests passing. Keep composite identity in payload or use a valid UUID.
- Real PostgreSQL testing found existing quest/scene/event JSON serialized twice by
  postgres.js (`JSON.stringify(...)` interpolated directly as JSONB). The quest persistence
  and audit paths reused by the slice are fixed with an explicit text-to-JSONB cast and
  exercised end-to-end. Equivalent patterns elsewhere remain a backlog item.
- New evolution migration is additive, isolated and transactional; no existing table,
  quest event or public contract is changed. Legacy consumers are unaffected when off.

## Coverage and runtime

- Existing tests mainly exercise service logic with in-memory repositories, not SQL/routes
  or browsers. Root test command omits ledger/LMS package tests. CI runs lint/types only.
- Initial local baseline: typecheck and root unit tests pass; lint fails on two inherited
  import-order issues. A passing unit suite does not establish working integrations.
- Env loading is import-time; `.env` resolution depends on working directory. Build-time
  public variables are baked into Next.js. Local verification uses explicit fixture env.
- Development PostgreSQL is available on loopback; use a uniquely named disposable test
  database, never the existing `headstrong` database. No external AI/integration calls
  or production resources are needed for this prototype.
