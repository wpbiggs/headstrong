# Island exploration trail

Status: exact-source local release acceptance passed; private preview rollout pending.

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
  and changing sky projections have local automated coverage. Hosted trail
  visual acceptance is pending, not implied by local tests.
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
