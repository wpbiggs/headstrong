# Optional water and sky discovery sharing

Status: exact-source local acceptance passed; private rollout pending.

## Close the sharing gap without changing play

The existing optional save page now has two additional, initially unchecked
selections: Share water routes and Share my current sky setup. Default play,
landmark travel and nearby tools still make no learning API requests. No account,
quiz, reflection or saved record is needed to try any experiment or continue.

Water selection includes only the last four cups actually poured: chosen route
and deterministic drop allocation. An unpoured next-gate preview is not evidence.
The summary explicitly says each cup replaces the previous one. It does not
infer historical plant states, understanding, care performance or mastery.

Sky selection is the current constellation/lens/five-light setup, labelled as a
snapshot rather than a history. Its spread is described as a toy projection
rule. No new play tracking is added. Opening the save page or leaving either
selection unchecked sends neither. Changing the learner token and leaving/
reopening clears both selections along with the existing selections and token.

The exact text preview includes only chosen categories. Scene observation
anchors are also displayed: workshop for flight/seed/water/note observations,
beacon for a chosen sky snapshot. These are existing curated scene locations,
not a claim that every local mechanic is a v1 scene entity. Sky-only evidence
uses only beacon; mixed selections use their corresponding anchor union.

Both atomic new-discovery and existing-record paths validate the same selected
evidence and send the same listed anchors. Retry identity includes the evidence
and anchors. Existing exact-scene/current-approval authorization remains decisive;
no schema, migration, grant, role, moderation rule or backend endpoint changes.
Selected text remains in the existing 2,000-character evidence bound even with
all six flights, four seed releases, four water cups, sky setup and a 500-character
note. No silent truncation or preselection is introduced.

Earlier waterworks/trail receipts accurately describe those releases as excluding
water/sky from upload. This increment adds separate explicit choices; selecting
seed experiments alone still never includes water routes or sky choices. In-game
privacy copy now explains this boundary rather than promising they cannot be
chosen for sharing at all.

## Local acceptance

`WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` passed all 17 gates on
unchanged source: 83 primary tests (13 adventure tests), seven additional tests,
19 PostgreSQL tests, two compiled Worker tests, 42 browser runs across Next/
vinext and both dependency audits.

The new summary test proves unchecked exclusion, water/sky separation, no plant
inferences and maximal combined evidence validity. New real-API browser cases:

- Water-only atomic save after seed, sky and private-note play: only poured
  cove/split cups appear, not an unpoured slope gate or unselected content.
  Token change clears new selections before any request. The request and saved
  evidence exactly match the preview; existing guardian and educator endpoints
  provide independent human replies visible after learner refresh.
- Sky-only existing-record save: current kite/close setup is previewed, only
  beacon is observed, and no seed/water/flight content or ratings appear. Mobile
  width/capture and empty-water disabled selection are checked.

Existing atomic lost-response retries, scene rejection, privacy/role/revocation,
immutable human feedback, WebGL fallback and default-play tests still pass.
Inspected ignored `test-results/sky-discovery-preview-mobile.png`.

## Objective audit and remaining gaps

Water/sky players now have optional feedback paths for their actual chosen
experiments rather than needing to write a note or share an unrelated flight.
Evidence remains learner-selected observations, not inferred mastery. The
adventure stays the entry point and is fully playable without sharing.

This does not prove the overall objective complete: satisfying longer-world play,
broad real-device/GPU evidence and real-user play/learning evidence are still
unestablished. Safe enrollment, verified guardian consent and the expressly
deferred credential rotation remain open. Private synthetic preview acceptance
is not participant or production approval.
