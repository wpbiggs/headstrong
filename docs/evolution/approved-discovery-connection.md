# Approved discovery connection

Status: pushed and deployed to the existing owner-only synthetic preview.
Migration 0016 is applied. This is not participant-test or production approval.

## Experience boundary

The island remains the default experience. Play, experiments, consequences and
rest do not need a token, quiz, reflection or saved record. The optional save
panel makes no requests on opening or token entry. Only the explicit Find action
requests authorized choices. Nothing in those GET requests contains island notes
or flight history.

A provisioned learner can choose an approved adventure and explicitly share a
selected discovery without a pre-created learning goal or pasted record ID. The
Awakening UI only offers scenes exactly matching the played island. Existing
record IDs remain a manual fallback. The adult saved workspace has an authorized
record picker; Access admission still grants no application role.

## Server boundary

- `GET /learning/quests`: learner-only, at most ten current approved choices.
- `GET /learning/goals`: at most ten records scoped to the learner, currently
  linked guardian or assigned educator. No admin blanket read. Summaries contain
  record metadata and feedback availability, not evidence text or comments.
- `POST /learning/discoveries`: learner-only. Strict input includes a client
  submission UUID, quest UUID, played scene, selected reflection and observation
  IDs. Author, role, objective, assessment and mastery are server-owned or absent.
- Sharing claims the UUID, verifies the current approval and scene, creates the
  record, selects the quest, inserts evidence and writes content-free audits in
  one transaction. Failures roll back the whole submission.
- A matching retry returns the existing record; changed content, another owner
  or a legacy goal collision returns conflict. UUID case is normalized. No
  automatic mastery write is added.
- The client retains its submission UUID for an identical retry during the same
  mounted panel and session. Closing the panel loses this in-memory retry key;
  accepted saves remain discoverable through Find. It is not durable/offline sync.

## Release constraints

Keep migrations 0001–0015 and their checksums unchanged. Migration 0016 is additive:
one internal discovery-submission flag and an indexed learner/date ordering. It
does not grant browser access or change the existing runtime role. Verify the
new insert and catalog queries using the constrained preview runtime role before
release, not just a local database owner.

Full hosted-browser save/reply acceptance is pending. Enrollment,
hosted 3D visual confirmation and deferred credential
rotation remain separate unfinished work. This increment does not establish
real-child readiness or completion of the adventure-world objective.

## Verification notes

The direct integration command initially refused to run without an explicit
loopback `TEST_DATABASE_ADMIN_URL`; no remote fallback was attempted. The full
verification runner provides that local fixture configuration. Its first pass
confirmed the new PostgreSQL authorization, concurrency, collision, stale-scene
and rollback matrix. The existing browser save test still assumed selections
survived token entry; updating it must retain explicit re-selection rather than
relax the new token-change privacy reset.

Final exact-source `WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` passed all
17 gates: 76 primary tests, 7 additional tests, 19 PostgreSQL tests, 22 browser
runs across Next and vinext, Worker runtime/access/packaging checks and both clean
dependency audits. The new browser file is explicitly included in the Playwright
configuration; a prior green run with only nine tests did not exercise it and
was not accepted as this increment's release evidence.

New browser coverage verifies token-only approved adventure discovery, no network
requests on panel opening/token entry, no note content in catalog requests,
explicit selection, an accepted save whose response is dropped, an identical
retry returning the same record, guardian record discovery and encouragement,
and private-state clearing on session changes. Delayed catalog responses are
discarded. Preview runtime-role integration verifies the new insert/read paths
without granting UPDATE on the internal submission flag.

The expanded mobile test exposed long-select intrinsic sizing that widened the
grid. A bounded grid track and picker width fix the cause without hiding overflow.
The final 390px screenshot and overflow assertion pass. Earlier failed logs are
retained; neither the privacy nor mobile assertions were removed to get green.

## Hosted rollout receipt

- Verified source `efca09d` pushed on `feat/curiosityverse-local-integration`;
  no default-branch merge. Code was not changed after the final release run.
- Applied `headstrong_discovery_submissions` only to `headstrong-dev`. In one
  transaction, took the repository migration advisory lock, required the
  synthetic-only configuration, verified all 15 prior names/checksums, added the
  flag/index, and registered `0016_discovery_submissions.sql` in
  `headstrong_migrations` with checksum
  `55a673285aca1e2e1d989f9410b7309db34becfbdde0f0a361f16971ab8c2ef3`.
  All prior migrations/checksums are unchanged. No broad bootstrap was rerun.
- Post-apply metadata confirms the flag defaults false, the index exists,
  learning-goal RLS remains enabled, browser-role SELECT remains false, runtime
  INSERT on the flag is allowed and runtime UPDATE on the flag is forbidden.
  Existing column-scoped quest selection permissions are unchanged.
- API deployed first: `2c0049fe-8af1-439a-8de8-a560967487ca`.
  Web deployed from verified generated output:
  `afd93c61-0359-4f4e-b591-1de762ad6915`.
- Actual private API/Hyperdrive passed 25 checks: authorized adventure discovery,
  missing-session/adult-role denial, forged-field rejection, invalid observation
  and stale scene rollback, concurrent identical submissions (201/200), normalized
  UUID retry, conflicting retry/legacy collision denial, all three authorized
  record catalogs, guardian encouragement, and logout/immediate catalog denial
  for all three temporary test sessions.
- Synthetic record `903fd9d3-4060-41ad-8e7e-97b65799efc8` has exactly one
  submission, one evidence row and one guardian reply. The rejected submission
  left no goal. Mastery stayed zero before/after. All three probe sessions are
  revoked. Existing operator/demo sessions and protected files were untouched;
  no token or signing secret was printed. Sanitized scripts/reports remain in
  ignored `artifacts/local-verification/hosted-discovery-smoke*`.
- Signed-out HTML, the actual new adventure JS bundle and all three catalog/share
  paths still redirect to Access. Direct API workers.dev returns 404. Neither
  Access admission nor browsing the panel grants a learner/adult role.
- The refreshed authenticated hosted browser entered the island and opened the
  new optional picker panel with nothing selected and Share disabled. This is
  UI deployment evidence, not full hosted-browser token/save/reply acceptance or
  proof of hosted WebGL visual fidelity. Returned it to the paused island.
- Fresh advisors have no WARN/ERROR items. INFO remains:
  [18 deny-by-default RLS tables](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
  [22 existing unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys),
  [19 unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

The additive schema remains compatible with old code. A code rollback must
retain records and the migration; do not drop evidence or rewrite migration
history to roll back the interface. Full enrollment, a polished adult inbox,
adventure duration and real-child safeguarding remain outside this receipt.
