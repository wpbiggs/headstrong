# Cloudflare + Supabase private preview

**Status: private synthetic dev deployed after explicit approval; not production.**
See [dev-environment-state.md](dev-environment-state.md) for the actual resources and checks.
No VPS, CI runner, hosted AI, Supabase Auth, browser database SDK, storage bucket or queue
is required for this slice. Local verification itself does not create cloud resources.

## Architecture

```text
Invited operator → Cloudflare Access → web Worker (vinext / existing Next app)
                                      └─ /api/* same-origin gateway
                                           └─ private service binding → Hono API Worker
                                                └─ uncached Hyperdrive → Supabase PostgreSQL
```

- Browser PlayCanvas stays unchanged; assets run behind the same access gate.
- The existing Node/Next.js build remains supported. The parallel Cloudflare build uses
  vinext 1.2.0/Vite 8; compatibility scan reported no blocking issues (App Router strict-mode
  wrapping differs). Node **>=22.12** is now required for the build toolchain.
- Only `/learn`, bundled assets, goal/evidence/feedback/satisfaction routes and logout are
  exposed. No campaign, compute, admin, integration, fixture, login or seeding HTTP routes.
- The web Worker verifies Cloudflare Access RS256 signatures, issuer, audience and required
  claims; trusting an email header is insufficient. Access admits invited preview operators;
  it does **not** assign platform roles or replace the learner bearer credential.
- The prepared templates were default-off with public URLs disabled. The approved dev
  configurations now enable the synthetic flag and web workers.dev hostname protected by
  Access. API workers.dev and both version URLs remain off. Static assets use
  `run_worker_first=true` and are dispatched to ASSETS only after the application gate.
  The API is reachable only through a service binding.
- Only the bearer/content-type headers cross the gateway; Access JWTs/cookies do not.
  POSTs require same-origin `Origin`; only GET/POST API requests are forwarded. No CORS
  allow-all headers are used. Rate-limit bindings protect the API gateway (per Access subject)
  and API (per platform account). These are abuse controls, not financial/global quotas.
- Responses are `no-store`; database auth/permissions/read-after-write require **Hyperdrive
  query caching disabled**. No identities, credentials or learner data are globally cached.
- Worker database clients are request-owned. The API requires a preview marker and the
  `headstrong_preview_api` database role; passing an owner/admin database connection fails.
- Wrangler generates binding/runtime types for separate Worker type checks. Generated
  declarations are ignored; `typecheck:cloudflare` regenerates them from source configuration.
- Worker logs/traces are enabled with invocation logs off. Do not add credential/body logs;
  review account-level observability retention before admitting users.

## Local verification — no cloud credentials

```sh
pnpm install --frozen-lockfile
pnpm verify:cloudflare
```

This extends `verify:local`: both Worker type checks, Access/gateway adversarial tests,
Cloudflare frontend build, Wrangler **dry runs** (no upload), built-web denial tests in
workerd, actual API Worker/PostgreSQL integration, existing Next build/browser tests and
an additional vinext browser pass. Requires loopback PostgreSQL admin with create-db and
create-role permissions, plus Chrome/Playwright Chromium. Tests create/drop only their own
databases and roles. Browser vinext tests use a separate loopback-only Node fixture config;
they do not claim to validate a real Cloudflare Access login or hosted Hyperdrive/Supabase.

`artifacts/local-verification/report.json` records every check. The security audit continues
to fail the command if advisories are found. Warnings from upstream source-map generation
and the PlayCanvas bundle size are not proof of a runtime failure.

### Verification result — 2026-10-15 UTC

`pnpm verify:cloudflare` passes lint, Node and Worker type checks, 54 root tests, 7 additional
ledger/LMS tests, 12 PostgreSQL integration tests, 2 Access/gateway tests, 1 built-web workerd
test, both frontend builds/Worker dry runs, and 2 browser tests on **each** renderer (Next and
vinext). The API integration test also runs the actual API entry in workerd through its local
Hyperdrive binding, with server-role/RLS enforcement, token issuance/revocation and real SQL.
The synthetic seed CLI is tested for atomic creation and refusal to modify existing accounts.

Production dependency audit: **0 reported advisories**. Complete toolchain audit: **1 high**,
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), in
`vinext → vite-plugin-commonjs → vite-plugin-dynamic-import → fast-glob → micromatch → braces`.
No patched braces version was available at verification. The described attack requires
malicious nested glob patterns; the observed dependency path is build tooling, not a verified
learner-facing exploit. Do not run builds on untrusted repositories/patterns. This finding
is **not suppressed**: the complete audit leaves `verify:cloudflare` at exit code **1**, despite
all functional/runtime checks passing. The user explicitly accepted the reviewed risk
for this owner-only synthetic dev deployment, not production. A scoped compatible
fflate 0.7.3 → 0.7.5 override removes a separate transitive ZIP parsing advisory.

The token field now waits for client hydration before accepting input. Browser verification
exposed a pre-hydration input-loss race in the parallel renderer; both renderers now pass the
same workflow/fallback tests. Existing Node loopback containment remains unchanged.

## Inputs needed before an approved deployment

1. Cloudflare account ID and a preview hostname in a zone you control.
2. Cloudflare Access team URL, application audience, and explicit invited operator list.
3. A **new dedicated Supabase preview project**, its region and connection details. Do not
   reuse a production/shared project. Disable its Data API before creating application tables.
4. Confirmation of resource/plan costs and approval to create/configure/deploy resources.

Never paste passwords, signing secrets, API tokens or database connection strings into chat.
Enter them in Cloudflare/Supabase dashboards, Wrangler's interactive secret input or protected
local environment files. Application source and browser bundles contain no Supabase keys.

## Operator runbook — only after approval

The commands below change remote resources. They were **not** run as part of preparation.
Confirm the account/project before each step; keep owner credentials separate from runtime.

### 1. Database bootstrap and lockdown

- Disable the Supabase project's Data API and unused public integration features first.
- Use an owner connection in a protected local `DATABASE_URL` environment. Run
  `pnpm db:migrate` against the **new empty preview database**. For an existing schema, stop:
  use the separately reviewed baseline process, not a guessed baseline.
- With `psql` using that owner connection, apply `infra/supabase/preview-security.sql`
  (`ON_ERROR_STOP=1`). It creates the server-only role/preview marker, enables RLS on every
  current app table, revokes PUBLIC/anon/authenticated grants, and grants only the API's
  table/column operations. Apply this before seeding; never use this script on a shared project.
- Set the runtime role's password with interactive `\password headstrong_preview_api`.
  The script intentionally contains no password. The role must not own app tables, bypass RLS,
  be superuser or inherit other roles. Do not grant it the `postgres` role.
- With owner credentials and `PREVIEW_SYNTHETIC_DATA_ONLY=true`, run
  `pnpm --filter @headstrong/api db:seed:preview`. It requires an empty users table and a
  preview marker, forces the offline stub composer, and atomically creates three synthetic
  accounts plus one approved quest. It prints only synthetic account/quest IDs—not credentials.
- Keep migrations/seeding/token issuance as trusted operator operations. The runtime API
  role intentionally cannot create accounts, issue sessions, migrate or change guardian links.
- Disable direct Data API access even with RLS. Before every subsequent schema change,
  review table grants/RLS again; migrations do not automatically certify Supabase exposure.

### 2. Hyperdrive and secrets

- Connect Hyperdrive to Supabase using **headstrong_preview_api**, never the owner role.
  Follow the [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)
  and [Cloudflare database guidance](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/).
  Use a reachable direct Postgres endpoint or a supported **session** endpoint, not the
  Supabase transaction pooler. Require TLS. The actual endpoint/password/role arrangement
  must be checked against the selected project; it has not been remotely verified here.
- **Disable Hyperdrive query caching** when creating it (`--caching-disabled`) and verify
  it remains disabled. Default cached reads break immediate token/guardian revocation.
  Prefer the dashboard for password entry; do not put credential-bearing CLI arguments
  in shell history. See [query caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/).
- Replace the all-zero Hyperdrive ID in `apps/api/wrangler.jsonc` with the approved ID.
- Generate a random strong JWT signing secret locally; install it with interactive
  `pnpm --filter @headstrong/api exec wrangler secret put JWT_SECRET` **only when approved**.
  Secret changes are deployments; for staged versions use Wrangler's versions-secret workflow.
  Keep the same value in the protected operator CLI environment for token issuance.

### 3. Private web hostname and Access

- Create an Access self-hosted application for the **entire preview hostname**, including
  `/api/*` and static assets. Allow only named operators; no broad domain/public bypass policy.
- Set `ACCESS_ISSUER` to `https://YOUR_TEAM.cloudflareaccess.com` and `ACCESS_AUDIENCE` to
  that application's audience in `apps/web/wrangler.jsonc`.
- Add only the approved web custom domain route. Keep public workers.dev/version URLs off
  on both Workers; do not add any public API route.
- After checking the synthetic-only database, set `PREVIEW_SYNTHETIC_DATA_ONLY="true"`
  in both source configurations. This assertion is not a detector of real personal data.
- Verify the rate-limit namespace IDs (`1001`/`1002` are local template values) do not collide
  with unrelated applications in the selected account before deployment.

### 4. Build, review, deploy

```sh
pnpm verify:cloudflare
pnpm --filter @headstrong/web build:cloudflare
pnpm --filter @headstrong/api check:cloudflare
pnpm --filter @headstrong/web check:cloudflare
# Separate explicit approval required for the two uploads/deployments below:
pnpm --filter @headstrong/api exec wrangler deploy
pnpm --filter @headstrong/web exec wrangler deploy --config dist/server/wrangler.json
```

Deploy API first (service binding target), then web. Build after changing web source config:
the Cloudflare plugin flattens configuration into `dist/server/wrangler.json`. Do not deploy
stale output or the loopback `vite.fixture.config.ts`; it has no deployment configuration.

Use `auth:token issue learner@headstrong.example.test student` (or the seeded guardian /
educator email and role) with owner DATABASE_URL and the matching JWT_SECRET. These one-hour
credentials are deliberately printed to the operator's terminal. Transfer securely and paste
into `/learn` only after Access sign-in. Never put credentials in URLs, PR comments or logs.

### 5. Hosted acceptance and rollback

- Signed-out and forged-Access requests must fail for HTML, assets and API; API workers.dev
  and preview/version URLs must not work. Confirm no anon/authenticated Supabase table access.
- Complete the synthetic learner/educator loop, verify isolation, revoke credentials/guardian
  consent, and verify new reads/writes are denied immediately. Recheck Hyperdrive caching.
- Verify the selected Supabase endpoint supports the exact transactions/row locks used here.
- Review logs for credential/body leakage and stop if any unexpected external integration runs.
- To close the preview: deny Access, set the preview flags false/redeploy, and revoke sessions.
  Roll back Worker versions only after checking binding/config compatibility. Worker rollback
  does **not** undo database changes; never replay migrations backwards or delete data blindly.

This remains a private operator preview, not child-facing production readiness. Enrollment,
recovery, safeguarding, formal mentor consent, retention/export/deletion and operational
backup/restore remain release gates. No paid plan is assumed or automatically selected.
