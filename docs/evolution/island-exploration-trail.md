# Island exploration trail

Status: pushed and deployed to the owner-only synthetic preview; hosted
OpenChamber Web acceptance completed. Not participant or production approval.

## Adventure increment

The island now has an always-open trail between workshop, seed garden and
observatory. The workshop is the initial stop; each stop presents its own
controls rather than stacking every activity. PlayCanvas changes camera position
and scale with the chosen stop, and brass stepping stones mark a causeway. This
is instant stop navigation, not a controllable walking avatar or a larger world.

An unfinished flight is held while visiting another stop. Both the timer and
reducer prevent ticks away from the workshop, and hidden flight controls cannot
steer it. Returning continues the same flight. Garden and sky choices persist
across visits and pauses; reset/reload clears them along with other local play.
Pause freezes navigation and experiments. The header Build & fly control returns
to the workshop and scrolls to its flight controls.

The hand-powered observatory works before any flight or beacon restoration.
Choose a moth or kite pattern and a wide or close lens: the same five lights
change shape and spread (close scales positions by 1.6). World-space stars,
an SVG constellation and live text provide visible and non-WebGL consequences.
This is a bounded projection toy, not a scientific optics simulation or an
assessment. No correct answer, score, unlock checklist, reflection or login is
required. Sky choices are session-only and not offered as upload selections.

Existing optional flight/seed/note sharing and the separate trusted-adult inbox
remain unchanged. The curated v1 scene envelope and exact-scene authorization
are unchanged; local projection rules do not pretend to be portable scene code.
No API, migration, grant, account-role, Access or credential changes are required.

## Verification

Final `WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` passed all 17 gates
on unchanged source, including 80 primary tests (10 adventure reducer tests),
seven additional tests, 19 PostgreSQL tests, two compiled Worker tests, 32
browser runs across Next/vinext, and both dependency audits.

The trail reducer test covers first-visit observatory access without beacon
restoration, location-scoped actions, frozen unfinished flight, persistent seed
and sky state, pause and full reset. Browser acceptance covers keyboard entry,
location-specific controls, a flight interrupted by garden and sky visits,
preserved steering/sky selection, resumed flight completion, mobile width,
reset and no learning API requests during play. Existing Seedwind tests now
explicitly visit the garden, including after reset; sharing remains opt-in.

Initial browser runs exposed obsolete link selectors after Build & fly became
a button and a keyboard test focusing before hydration enabled the control.
Those tests now target the actual button and wait for readiness. Screenshot
review then caught a real ResizeObserver delivery-loop overlay during mobile
resize despite passing assertions. Canvas resize writes now run in a coalesced
animation frame, cancelled on disposal; the trail test rejects resize errors.
Re-ran the full release gate after the fix, and inspected the clean mobile SVG
capture at `test-results/observatory-mobile.png` (ignored).

## Objective audit and remaining work

- Adventure-first entry and meaningful choice: demonstrated by the workshop,
  independent seed garden and open observatory; no dashboard or account needed.
- Visible consequences: deterministic flight restoration, growing seed patches
  and changing sky projections have local automated coverage and the bounded
  hosted checks below; broad device/GPU and real-user evidence remain absent.
- No mandatory quiz/reflection: local browser tests finish experiments without
  submitting either. Optional note/save/inbox remains outside default play.
- Optional trusted feedback: existing atomic sharing and scoped human-feedback
  regression suites pass; no new claim of mastery or participant enrollment.
- Safe access/review: existing owner-only synthetic preview boundaries retain
  their compiled security tests. This is not consent/onboarding approval.
- Still unfinished: participant enrollment and guardian consent, larger-world
  interaction and polish, broad device/GPU evidence, real-user play evidence,
  and the explicitly deferred credential rotation. The overall objective is
  not complete.

## Hosted receipt

Initial source `ba2876b` deployed as web version
`c3a7362a-4c5e-4cf0-8955-b8cf7aa322e4`. In the existing authenticated
OpenChamber Web tab at mobile size, visited the observatory before any flight,
inspected the five world-space lights, changed moth/wide to kite/close and
inspected the resulting changed positions. Launched a glider, visited the seed
garden during flight and confirmed the held-flight message. Released round/cove
and feathered/ridge seeds, visited the observatory (kite/close still selected),
then returned to the workshop; the held flight resumed and reached 70 m, waking
the beacon. No application token, API call or saved discovery was needed for
these interactions, and no hosted feedback/data mutation was performed.

Desktop visual review exposed a real grid-row collision: the new navigation
occupied the row previously assigned to the world/flight console. Follow-up
`2c0cf17` gives the trail a full-width row above the world and places the garden
or observatory controls beside the world on desktop. Added an explicit browser
geometry assertion for this placement, re-ran all 17 gates/32 browser runs on
unchanged source, and deployed that verified output as web version
`a94db807-1015-4286-936e-017919d564d6`. API remains unchanged at
`0254a354-35db-4696-aadf-86f55277010d`.

A fresh authenticated OpenChamber Web tab confirmed the final stylesheet's
grid layout and the corrected desktop capture. Also reviewed the final mobile
kite/close SVG, explanation and privacy copy. Closed the additional inspection
tab and left the original island paused. The initial immediate post-deploy
navigation briefly displayed the previous release; a fresh request and later
canonical `/learn` navigation showed the new trail. No cookie export or extra
login was requested.

Signed-out final HTML, the actual new adventure bundle and record-catalog route
still redirect to Access; direct API workers.dev returns 404. Existing bindings,
synthetic-only flag, Access issuer/audience and owner scope are unchanged. No
new application sessions were provisioned, and deferred credentials were not
rotated. This web-only increment does not claim a new remote mastery-count check.

Ignored inspected captures:

- `.openchamber/screenshots/hosted-trail-observatory-wide-2026-11-05T16-19-44-288.jpg`
- `.openchamber/screenshots/hosted-trail-kite-close-2026-11-05T16-20-10-601.jpg`
- `.openchamber/screenshots/trail-final-desktop-2026-11-05T16-28-04-401.jpg`
- `.openchamber/screenshots/trail-final-mobile-sky-2026-11-05T16-28-39-097.jpg`
