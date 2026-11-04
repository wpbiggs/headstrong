# Curiosityverse local integration — 2026-11-04

This records combined integration and the private synthetic-data release. It is
not production or participant-test approval. Original source worktrees remain
intact; the integration branch collects their reviewed changes without discarding
local operator/tool configuration or generated build state.

**Final local acceptance: all 17 gates pass on the exact combined source tree.**
The requested bounded workstreams are implemented and locally verified; this is
not completion of the Curiosityverse product or approval for production use.

## Source provenance

- Base: `9845fad`.
- Security: uncommitted work from `fix/dependency-security-advisories`; see
  `dependency-security.md` and its raw audit reports.
- Platform: inherited edits plus bounded safety completion in the original
  `feat/learner-experience-vertical-slice` checkout; see `platform-completion.md`.
- Adventure: `5cc2c716555c8972fd7a27510493754cc9e05797` from
  `feat/awakening-adventure`; see `awakening-adventure.md`. All 14 final paths match
  the integrated snapshot, except README intentionally retains the security fix's
   updated audit status and the coordinator's integration-report link as well as
   the adventure introduction.
- Integration branch: `feat/curiosityverse-local-integration`, in a separate local
  checkout. Source worktrees and their Git indexes were not altered by transfer.
  Shared source files were three-way reconciled against base HEAD, not overwritten
  wholesale. No source conflicts were reported.
- The session now points at this integration checkout. Original source worktrees
  remain intact. A portable uncommitted source patch is retained in the original
  checkout at `artifacts/local-verification/curiosityverse-integration.patch`,
  validated against base `9845fad` using a disposable Git index. It excludes
  generated caches, private local configuration and credentials.

## Coordinator verification after security + platform transfer

- Offline frozen-lockfile install passed before the platform transfer; the platform
  workstream did not change manifests or lockfiles.
- `pnpm test`: **70 tests passed** (59 API, 5 LTI, 2 rostering, 3 Classroom, 1 badge).
- API `test:integration` with an explicit loopback PostgreSQL admin URL: **17 tests
  passed**, including atomic concurrent queue claims, terminal-job immutability,
  typed persisted results/provider runs, balanced rewards and campaign ownership.
- `pnpm exec turbo typecheck --force`: **all 15 tasks passed**, zero cache hits.
- `pnpm lint`: passed on the integration checkout.
- Production `pnpm build` with synthetic fixture environment: **all 15 tasks passed**.
  Existing Turbo output-declaration warnings remain nonfatal.
- Both production and full security audits were independently rerun in the security
  source worktree and returned zero findings and empty muted lists. The complete
  combined-tree verification below also reran both audits successfully.
- Corrected an inherited misleading LTI test title: it proves rejection of an
  unverified callback, not successful live authentication. No behavior changed.
- Both Worker binding/type checks, API packaging dry run, vinext production build,
  web packaging dry run, and built workerd Access-denial test passed after the
  security/platform transfer. No upload or remote resource access was requested.
  Existing vinext sourcemap, ineffective-import and chunk-size warnings remain.
- Expanded the workerd acceptance test to authenticate with a locally signed
  synthetic RS256 token and intercepted public JWKS, exercising the real verifier
  without external egress. It passes root-to-learner redirect, rendered learner
  HTML, byte-matching built assets, invalid/expired/wrong-audience rejection, and
  denial of operator, login, LTI and fixture routes. No production auth code was
  changed. This checks server rendering/assets, not browser hydration/gameplay.
- Full dependency audit on the combined security/platform tree returned zero
  findings and an empty muted list; both final combined audits also passed.

## Product boundaries verified

Browser tests exercise early wing/route choice, contrasting repeatable experiments,
visible restoration, keyboard/touch controls, rest/reset and optional reflection.
Session-only notes never implicitly upload or become mastery/assessed evidence.
The separate authorized saved workflow and its privacy regressions pass on both
supported renderers. There is no automatic adventure-to-evidence bridge; saving
game discoveries directly remains future product work, not a hidden implementation.

## Adventure review / final combined checks

- PlayCanvas selected for this bounded anonymous solo experiment. No Roblox
  capability/connectivity claim; no second runtime scaffolded.
- The four new pure adventure/v1 unit tests pass against the integrated Zod 4
  contracts. An enabled production web build passes after adventure transfer.
- Reviewed actual Chrome desktop entry/restored and mobile-WebGL captures from
  the adventure workstream: visible glider/islands, changed crystal/garden,
  contrasting 35m/70m outcomes and mobile layout. This is engineering evidence,
  not validation of fun, learning transfer or physical-device accessibility.
- A preliminary alternate-port browser wrapper failed to load because the local
  wrapper used ESM metadata in a CommonJS configuration context; no product test
  ran in that attempt, and the temporary wrapper was removed. Its owned server
   was stopped. The subsequent standard verification passed as recorded below.
- The inherited `/learn/studio` fraction workbench remains a local-only route:
  current protected gateway returns 404 there. Its route allowlist was not
  broadened. Connected records remain available through explicit opt-in within
  `/learn`; sample notes/history are never passed to the record form.

## Full combined verification

`WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` completed with exit 0 and
**all 17 gates passing** on the final combined tree (2026-11-04, 13:52–13:54 UTC).
The machine-readable report is `artifacts/local-verification/report.json`.

- 74 API/integration/adventure-model tests, 7 additional ledger/LMS tests, 17 disposable
  PostgreSQL tests, 3 gateway tests and the authenticated workerd test passed.
- Browser acceptance: **7/7 on production Next.js**, **7/7 on the vinext fixture**;
  both use PlayCanvas, not two different game engines.
- Workspace/Worker types, both production builds and both packaging dry runs pass.
- Production/full audits both pass with zero findings and no suppressions.
- A separate combined-tree disabled-flag production build and browser check
  passed for `/`, `/learn` and `/learn/studio`; the subsequent cache-isolation
  issue and repair are recorded below.
- Added `pnpm test:awakening` to the root `pnpm test` command so the four pure
  game-model tests are not left as manual-only coverage: the root suite now runs
  **74 tests**. Its direct command and the root invocation both pass.
- Standard verification shuts down only its owned loopback servers; exit-143 lines
  during intentional renderer switching are shutdown logs, not failed test gates.

### Cache-isolation regression found during the repeat

After the separate flag-off Next build, a repeated verification reused Turbo's
enabled-build task cache. Production Next nevertheless returned the disabled
page with an enabled runtime environment: all seven production browser tests
failed, while the seven vinext browser tests and all other gates passed. The
failed run returned exit 1; no assertions were skipped or weakened. A direct
loopback request reproduced the disabled response.

`turbo.json` now explicitly hashes `NODE_ENV` and the three public web variables
and excludes Next's internal `.next/cache` from task outputs. A dry-run comparison
verifies different cache keys for enabled/disabled builds. `verify-local.mjs` now
uses `pnpm build --force` so a verification run rebuilds actual output after any
direct framework build instead of accepting an old task result. Scoped lint and
diff checks pass. The full repeat with this fix passed all 17 gates, including
7/7 production Next and 7/7 vinext browser tests; no cache hits were accepted for
the production build.

### Semantic compatibility reconciliation

The final overlap review found three new platform fields still using Zod 4's
stricter RFC UUID parser: provider-run `id`/`jobId` and campaign-list
`educatorUserId`. They now use the same GUID-shaped acceptance as the existing
Zod 3-era records, consistent with the security workstream's compatibility rule.
The security regression matrix now covers those fields too. The final exact-tree
repeat after this reconciliation passed all 17 gates, including all 14 browser
tests and both zero-finding audits. No source changes followed that verification;
only this evidence record and the portable handoff artifact were finalized.

## Coordinator-only source adjustments

- `biome.json`: respect Git ignore rules; do not scan protected local credentials.
- `apps/web/cloudflare/runtime.test.ts`: authenticated built-Worker acceptance.
- `packages/integrations/lti/src/index.test.ts`: honest rejection-test title.
- `package.json`: include the four adventure-model tests in normal root testing.
- `turbo.json`, `scripts/verify-local.mjs`: isolate public build configuration and
  force authoritative verification builds after direct flag-off builds.
- `packages/core/src/contracts/{compute,ledger}.ts` and
  `apps/api/src/services/dependency-security.test.ts`: reconcile/test the three
  newly added platform ID fields against the shared legacy-ID contract.
- README and integration/dev-state documentation: evidence, provenance and
  credential-rotation gate. No production auth or game mechanics changed here.

Combined browser captures are retained under ignored
`artifacts/local-verification/combined-browser/`. Generated tracked
`apps/web/tsconfig.tsbuildinfo` is check output, not intentional product source.

## Safety / release boundaries

Root Biome now respects Git ignore rules. An earlier lint invocation in the
original checkout printed ignored operator credential values. No values are
recorded here. Rotate the preview JWT signing secret and database password and
revoke affected sessions with explicit approval **before further hosted-preview
use**. No remote credential changes were made.

### Release reconciliation — November 4

- User explicitly requested reconciliation, push and deployment. The target is
  the existing owner-only, synthetic-data preview, not default-branch merge or
  public/child use.
- Compared every changed/untracked source path in the platform and security
  worktrees with this integration. Differences are the documented combined
  contracts, regression coverage, adventure entry and evidence records. Personal
  `opencode.json`, agent skills/lock metadata and generated TypeScript state stay
  local; no original files were removed or overwritten.
- Fresh `WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` passed all 17 gates:
  74 primary tests, 7 additional tests, 17 PostgreSQL tests, 14 browser runs,
  Worker runtime/access tests and both zero-finding dependency audits.
- Removed the adventure footer link to the local-only fraction workbench rather
  than expanding the hosted gateway allowlist. A final verification follows this
  UI adjustment.
- Asked explicitly about rotating the exposed preview credentials and revoking
  sessions. User chose to defer: “it's ok, please continue. i will address this
  later”. This accepts the unresolved risk only for the requested private preview;
  it does not remediate exposure. No secrets or sessions are changed by this release.
- Adventure discovery notes remain session-only and are not transferred to the
  separate authorized evidence workspace. Direct optional discovery saving and
  polished adventure duration remain product gaps, not release claims.

Platform crash recovery, transactional finalization/allocations, token-aware
operator interfaces, complete verified OAuth/LTI flows and real-child safeguards
remain outside this bounded milestone. Keep their documented release blockers;
passing local tests is not permission to enable those features for real users.
