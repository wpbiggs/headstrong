# Optional Awakening discovery saving

Status: locally accepted private synthetic-preview increment; deployment is
recorded below. Not participant-ready or complete account onboarding.

## Experience contract

- Entry, wing/route choices, flight, world restoration, retry and rest remain
  independent of accounts, quizzes, evidence submission and human assessment.
- `Save an island discovery (optional)` pauses play and opens a separate page.
  Opening it performs no network request. Both share selections start unchecked.
- Learners may select completed flights, their optional note, or both. A flight
  summary alone is sufficient; no reflection form or rating is required to save.
- The exact text is previewed before submission. Unselected notes and flights are
  excluded. No browser storage, analytics upload or inferred mastery is added.
- Returning to the island preserves the experiment state. Returning/reopening
  clears the connection token and share selections; resetting/reloading still
  clears the in-memory island.

## Authorization and reviewed content

The private-preview connection requires an operator-provisioned learner token
and an existing approved Awakening learning-record ID. This is not child-friendly
account onboarding or automatic quest provisioning. No new authentication route,
database schema, gateway allowance or authorization policy is introduced.

The panel reads the authorized record only after an explicit Check action. It
requires a currently approved experience with the exact curated Awakening scene
and matching quest binding. A fraction quest, revised scene or unavailable
approval cannot receive an adventure discovery through this UI. This compatibility
check is not a replacement for API authorization: the server still enforces
learner ownership, assigned educator, current guardian link, parent approval,
content safety, immutable evidence and private record access on every operation.

The Share action rechecks the record immediately before submitting only the
previewed text and the disclosed workshop observation. Double-clicks are locked;
changing token/record or leaving aborts requests and discards stale responses.
Aborting cannot undo a request already accepted by the server. The error message
directs users to refresh before retrying; immutable evidence prevents overwrite.

Existing educator comments can be refreshed on this page. Linked guardians can
read the saved record through the existing authorized workflow. Guardian-authored
supportive comments, easy account enrollment, approved quest discovery and a
polished adult inbox remain separate work; no guardian assessment is fabricated.

## Verification scope

- Pure tests cover opt-in serialization, exclusion of private notes, a maximal
  six-flight/500-character-note payload, no mastery claim and exact scene binding.
- Browser coverage exercises a real disposable PostgreSQL/API fixture: empty
  selection, flights-only sharing, unrelated-quest refusal, one immutable evidence
  write, linked-guardian read, human educator feedback, return to play and cleared
  credentials/selections on reopening.
- A delayed-response browser test changes credentials while checking a record;
  no previous account record appears and no note is uploaded.
- The browser fixture provisions an approved Awakening record only inside the
  disposable loopback server through the existing quest approval and learning
  services. Hosted synthetic provisioning is a separate operator action below,
  never something opening the save panel does. Neither is real-child approval.

## Acceptance and synthetic preview setup

- Full `WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` passed all 17 gates:
  76 primary tests (including six adventure/discovery tests), 7 additional tests,
  17 PostgreSQL tests, 18 browser tests across production Next and vinext,
  Worker access/runtime/build checks, and both zero-finding dependency audits.
- The first run failed one Next browser assertion because its global alert
  selector also matched Next's route announcer. Scoped it to the save panel; the
  expected error, refusal and privacy assertions remain unchanged. The corrected
  exact-tree run passed. Raw failed and successful shell output was retained.
- Reviewed the actual desktop save/feedback screenshot. The initial mobile
  full-page capture repeated portions of the page despite a unique DOM and
  passing width checks; capture coverage now uses separate mobile viewports
  rather than treating that image as visual proof. Reviewed both mobile viewport
  captures: selection preview, connection controls and feedback fit the screen.
  The capture-adjusted full run passed too. The final release repeat also covers
  truthful game-header copy after a learner has intentionally shared a discovery.
- Using a disposable local database and the existing quest/learning services,
  prepared one labelled synthetic Awakening quest, its exact curated task,
  three lifecycle events, one selected learning goal and six audit events. These
  rows were inserted atomically into the private synthetic database only after
  checking the three existing `.example.test` accounts and synthetic-only flag.
  No real consent, new account, schema change or permission grant was created.
- Synthetic quest: `aad14497-9a22-47a0-8ad8-47bd0e7a5a42`.
  Hosted acceptance record: `f69e5cdc-1219-46fe-b410-d475bc5c774a`.
  A separate empty record for the operator's own save demo is
  `b84bb1be-4083-47ae-bacb-2f15e81fa63d`.
- The actual deployed private API/Hyperdrive passed 12 further checks using the
  same discovery serializer and exact-scene validator: approved adventure read,
  selected flights saved with an unselected private note excluded, duplicate
  evidence refusal, human educator feedback, linked-guardian read, missing-token
  denial and logout/immediate refusal for all three roles. All three probe
  sessions are revoked. Mastery-signal count was zero before and after.
- New short-lived, non-elevated sessions for the existing synthetic accounts were
  separately provisioned for the user's demonstration. Tokens and record IDs are
  in `/Users/will/projects/headstrong/.dev.vars.awakening-demo.json`, mode 0600,
  confirmed Git-ignored. Tokens expire at `2026-11-04T23:38:09Z`; no token values
  were printed. Existing operator/demo files and signing credentials are unchanged.

The previously deferred credential-exposure risk remains open. This feature does
not rotate exposed credentials or revoke existing affected sessions. Guardian
replies, simple enrollment, richer adventure duration and hosted 3D visual review
remain product/release work; do not equate these tests with the full goal.
