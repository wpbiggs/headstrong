# Dependency security remediation — 2026-11-04

Local only, based on `9845fad`, branch `fix/dependency-security-advisories`.
No deployment, merge, hosted-resource changes, paid services, CI, or risk exception.
No AGENTS.md was present in the worktree or its ancestor directories.

## Current evidence, not historical assumptions

Node `24.15.0`, pnpm `9.12.3`, registry `https://registry.npmjs.org/`.
Fresh `pnpm audit --prod --json` exited 1: **two high** findings, Zod
`3.25.76` and follow-redirects `1.16.1`. Fresh `pnpm audit --json` exited 1:
**14 findings** (six high, six moderate, two low), across those packages,
undici `7.29.1` and fast-uri `3.1.8`. This supersedes October's eight-finding
snapshot; no old exception was applied.

Registry queries used `pnpm view zod version`, `pnpm view undici version`,
`pnpm view fast-uri version`, and `pnpm view wrangler version`. They returned
`4.6.7`, `8.12.3`, `4.2.3`, and `4.157.0`, respectively. Additional queries:

```sh
pnpm view zod@4.6.7 version dist.integrity
pnpm view undici@7.30.1 version engines
pnpm view wrangler@4.157.0 dependencies --json
pnpm view @hono/zod-validator@0.3.0 peerDependencies --json
pnpm view @hono/zod-validator version peerDependencies --json
```

The audit explicitly identifies Zod `<4.6.6` as affected by
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
Use actual Zod 4 validation, **not** its bundled legacy `zod/v3` entry point.

## Changes and compatibility

- All 12 direct Zod consumers now require `^4.6.7`; the lock resolves `4.6.7`.
- Upgrade `@hono/zod-validator` `0.3.0` → `0.9.1` for supported Zod 4 peers;
  existing Hono `4.13.13` satisfies its `>=4.11.2` peer requirement.
- Narrow root overrides patch only affected locked versions: undici
  `7.29.1` → `7.30.1`, fast-uri `3.1.8` → `3.1.9`, follow-redirects
  `1.16.1` → `1.16.2`. These are same-major security patches, not suppressions.
  The existing fflate override is unchanged. No unrelated lockfile upgrades.
- Keep Wrangler `4.151.0`, Miniflare and workerd unchanged rather than introducing
  the latest Wrangler's Miniflare 5 beta. undici `7.30.1` requires Node `>=20.18.1`,
  within this project's Node `>=22.12.0` constraint; local workerd checks pass.
- Zod 4 `.uuid()` enforces RFC version/variant bits, unlike Zod 3. Replace it
  with `.guid()` at production validation sites to preserve the existing
  8-4-4-4-12 hex-ID acceptance contract. No contract version or fields changed.
- Preserve defaults, trimming, unknown-key stripping, bounded input rejection,
  authorization and session behavior. New tests include non-RFC legacy IDs,
  malformed IDs, defaults/coercion, invalid roles/input, and oversized arrays
  whose first element throws if traversed. The latter verifies the actual
  collection short-circuit fix, not merely a clean package-version audit.
- Malformed JSON exposed a pre-existing error-handler bug: learning routes
  converted Hono's HTTP 400 exception to 500. Return a sanitized 400 instead;
  other unexpected failures remain sanitized 500s. Added malformed/null/array/
  wrong-type JSON and authentication-before-validation regression assertions.
  Library-generated validation issue diagnostics follow Zod 4; no caller should
  treat library-specific error wording as an application contract.

## Verification commands and results

All final commands below exited **0**. Logs are retained under
`artifacts/local-verification/dependency-security/` in this security worktree.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
MOODLE_BASE_URL=https://moodle.example.test MOODLE_TOKEN=unused-fixture ERPNEXT_BASE_URL=https://erpnext.example.test ERPNEXT_API_KEY=unused-fixture ERPNEXT_API_SECRET=unused-fixture pnpm --filter @headstrong/api exec node --import tsx --test ../../packages/ledger/src/index.test.ts ../../packages/lms-adapters/src/index.test.ts
TEST_DATABASE_ADMIN_URL="postgres://${USER}@127.0.0.1:5432/postgres" pnpm --filter @headstrong/api test:integration
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3300 NEXT_PUBLIC_API_URL=http://127.0.0.1:4400 NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS=true NODE_ENV=production pnpm build
WRANGLER_SEND_METRICS=false pnpm --filter @headstrong/api typecheck:cloudflare
WRANGLER_SEND_METRICS=false pnpm --filter @headstrong/web typecheck:cloudflare
pnpm --filter @headstrong/api test:cloudflare
WRANGLER_SEND_METRICS=false pnpm --filter @headstrong/api check:cloudflare
WRANGLER_SEND_METRICS=false pnpm --filter @headstrong/web build:cloudflare
WRANGLER_SEND_METRICS=false pnpm --filter @headstrong/web check:cloudflare
WRANGLER_SEND_METRICS=false pnpm --filter @headstrong/api test:cloudflare:runtime
pnpm list -r zod @hono/zod-validator undici fast-uri follow-redirects --depth Infinity
pnpm audit --prod --json
pnpm audit --json
git diff --check
```

- Types: 15 workspace tasks pass; both Worker binding/type checks pass.
- Tests: 50 API tests plus seven integration-scaffold tests, seven additional
  ledger/LMS tests, 12 disposable-PostgreSQL tests, three gateway tests, and one
  built web Worker/workerd Access-denial test pass. No shared app DB migration.
- Production build: 15 workspace tasks pass; vinext build and both Wrangler
  **dry runs only** pass. No upload. Existing Turbo output-declaration warnings,
  RSC plugin sourcemap warnings and frontend chunk-size warning remain nonfatal.
- Initial regression iteration failed on malformed JSON (fixed above); the
  initial additional-test invocation lacked LMS fixture env (rerun above).
  Initial lint included raw audit files outside its existing ignored artifact
  directory; moved those files into the existing ignored directory without
  altering audit JSON or weakening lint configuration. Final reruns pass.
- Browser acceptance/full `verify:local` were intentionally **not run**: another
  agent owns ports 3000/4000 this round. No other process was stopped. The build
  uses alternate URL values only; it does not start browser servers. Coordinator
  should rerun browser acceptance on the reconciled tree before publishing.
- Tracked generated Next type/cache changes produced by checks were removed;
  Worker generated binding declarations did not change.

Both final audits report **zero findings**, empty `muted` lists, and exit 0:
[production JSON](security-audits/2026-11-04-production.json) and
[full JSON](security-audits/2026-11-04-full.json). These are unmodified audit
stdout, also retained as `after-production.json` and `after-full.json` alongside
the raw `before-production.json` and `before-full.json` reports. Dependency
counts are pnpm's audit metadata (136 production, 385 full), not unique package
counts. An audit is point-in-time evidence, not a guarantee against future risk.

## Coordination / changed paths

Manifest changes: root `package.json`; `apps/{api,web}/package.json`;
`packages/{ai-gateway,core,lms-adapters,messaging,moderation,quest-composer}/package.json`;
`packages/integrations/{google-classroom,lti,open-badges,rostering}/package.json`;
and `pnpm-lock.yaml`.

Unavoidable compatibility source overlaps (only `.uuid()` → `.guid()`):

- `packages/core/src/{index,admin,profile,quest}.ts`
- `packages/core/src/integrations/lti.ts`
- `packages/core/src/contracts/{commons,compute,experience,learning,ledger,lms,portfolio,quest,social}.ts`
- `apps/api/scripts/access-token.ts`
- `apps/api/src/routes/learning.ts` (also sanitized malformed-JSON handling)

Tests: `apps/api/src/routes/learning.test.ts`, new
`apps/api/src/services/dependency-security.test.ts`. Security docs: this file,
the two audit JSON files, `README.md`, `dev-environment-state.md` and
`pr-reconciliation.md`. No adventure runtime/UI implementation or campaign,
compute, integration service logic was changed. Reconcile the shared contract
paths with the other workstreams; rerun checks/audits after combining changes.

## Remaining gate

No dependency advisories remain on this local lockfile. Browser acceptance of
the combined agents' tree and separate merge/deployment approval are still
required. The hosted preview remains unchanged; its historical deployed
dependencies have **not** been remediated by these local edits.

Wrangler commands were checked against project-local `wrangler deploy --help`
and the current [Workers command documentation](https://developers.cloudflare.com/workers/wrangler/commands/workers/#deploy).
