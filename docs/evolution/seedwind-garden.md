# Seedwind garden adventure

**Later hosted acceptance:** [OpenChamber Web receipt](hosted-browser-acceptance.md)
records visible hosted 3D and actual seed-only save/guardian/educator/learner flow.
It also records a deployed loopback-API defect found during that test and fixed
in `ea2fbb8`. Earlier limitations below describe the original garden rollout.

Status: pushed and deployed to the existing owner-only synthetic preview.
Not real-participant or production approval.

## Adventure, not another form

The island now has a second optional experiment alongside the glider. At the
workshop, choose a round or feathered seed and a gentle cove breeze or ridge
gust, then release it. The deterministic toy model produces four combinations:
round/gentle 2 m (cove), round/ridge 5 m (slope), feathered/gentle 6 m (slope),
feathered/ridge 14 m (high terrace). Change one variable to compare what happens.
Every landing grows something; farther is explicitly not a better score.

Three soil islets gain visible seedling clumps in PlayCanvas. Equivalent text
and marked garden patches show the same state when WebGL is unavailable. Native
buttons work with keyboard, mouse and touch. There is no account, prerequisite
flight, quiz, required prediction, required reflection or completion reward.

Garden changes do not restore the glider beacon, alter flight physics, assign a
role, approve content or award mastery. Pause blocks all seed actions and preserves
the garden. Flight retries and renderer remounts preserve it without generating
more seedlings. Reset/reload clears local garden facts; saved records are not
deleted. History is bounded to four releases; each bed displays at most three
clumps. No timer, random outcome or time-on-task collection is added.

## Optional sharing

The save panel has a separate, initially unchecked `Share seed experiments`
selection. Its exact preview includes only the selected last four releases.
Choosing seeds does not select flights or private notes. Token changes clear all
sharing selections. A maximal selection (six flights, four seed trials and a
500-character note) fits the existing bounded evidence contract.

This is a source-curated, local workshop mechanic within the existing Awakening
adapter, not a new persisted quest, portable physics language, third-party asset
or executable content payload. As with glider rules, the v1 scene envelope is not
a complete description of runtime behavior. Saving remains a learner-selected
workshop observation under the existing exact-scene/quest/current-approval checks;
the mechanic grants no new save authority or trusted-adult visibility. A claim
about seed play is still not proof of a learning outcome.

## Local verification receipt

- Final exact-source `WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` passed
  all 17 gates: 79 primary tests, 7 additional tests, 19 PostgreSQL tests and all
  26 browser runs across Next and vinext. Worker/access checks and both dependency
  audits pass. No test assertions were removed or timeouts increased.
- New unit coverage verifies independent variable effects, all three growing
  beds without flight completion, bounded state, pause/reset/retry behavior,
  opt-in sharing, unselected-content exclusion and evidence bounds.
- New browser coverage verifies keyboard release, contrasting growing patches
  on a 390px viewport with WebGL disabled, no gameplay learning-API requests,
  pause/resume, seed-only save through the authorized picker, private-note
  exclusion and reset. A WebGL run exercises garden rendering and repeated
  renderer disposal/remount without extra growth.
- Reviewed final local mobile and WebGL screenshots. The 3D view shows seedlings
  on the near and far beds while the untouched middle bed stays bare. These
  local captures do not resolve the separate hosted WebGL capture limitation.
- The first full run caught an implicit-`this` annotation missing in the browser
  WebGL-failure stub. Added `this: HTMLCanvasElement`, then reran the full suite.
  The failure log is retained; this was a test type error, not waived evidence.

No database migration, API behavior, account policy or Access change is needed.
Enrollment, full hosted-browser save/reply acceptance, hosted 3D visual fidelity,
deferred credential rotation and a polished longer adventure remain unfinished.

## Hosted rollout receipt

- Verified source `275b030` pushed on the integration branch; no default-branch
  merge. Deployed web from the verified generated output, version
  `84574caa-63d5-4e5c-98c5-68a5ebdcce32`. API remains
  `2c0049fe-8af1-439a-8de8-a560967487ca`; no schema/API/account changes were made.
- In the refreshed authenticated hosted browser, released round/gentle for 2 m,
  changed only shape for feathered/gentle at 6 m, then only breeze for
  feathered/ridge at 14 m. All three text garden patches grew one clump while
  flight remained unstarted and the beacon stayed asleep.
- Opened optional saving: `Share seed experiments (3)` was present, nothing was
  selected, the preview said nothing selected, and Share was disabled. Returned
  to the paused island. Hosted token-entry/save/reply was not exercised; local
  end-to-end saving and prior hosted API acceptance remain separate evidence.
- Signed-out HTML, the actual new adventure JS bundle and the share path still
  redirect to Access; direct API workers.dev returns 404. Access policy and
  synthetic-only flags were not broadened. No new test sessions were provisioned
  or private records written for this frontend-only rollout.

## Objective audit

- Adventure-first entry: retained and covered by local/hosted browser evidence.
- Meaningful choices: wing/route/steering plus independently variable seed shape
  and breeze now produce reproducible, contrasting consequences.
- Experiments change the world: beacon/star garden and new soil-bed seedlings
  render locally; matching hosted text-state changes verified. Hosted 3D visual
  fidelity is still unproven, not inferred from a ready label.
- No mandatory quizzes/reflections: garden and flight work before session setup
  or evidence submission, including keyboard/touch/WebGL-failure cases.
- Optional trusted feedback: selected observations use existing atomic saving
  and human feedback. No game action writes mastery. Full hosted-browser
  save/reply acceptance remains unfinished.
- Safe platform support: current prototype controls remain, but complete
  enrollment, real-child safeguarding and deferred credential rotation are not
  established by this release. A polished world/longer adventure is still a
  product gap, so the whole objective is not declared complete.
