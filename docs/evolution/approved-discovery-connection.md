# Approved discovery connection

Status: local release verification passed; not deployed. Migration 0016 has not
been applied to the hosted synthetic preview.

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

Hosted migration/deployment and hosted acceptance are pending. Enrollment,
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
