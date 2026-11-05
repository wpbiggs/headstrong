# Garden waterworks

Status: pushed and deployed to the owner-only synthetic preview; hosted
OpenChamber Web interaction checked. Not participant or production approval.

## A deeper garden experiment

The seed garden has two optional tool views, Seed breeze and Water channels,
instead of stacking both sets of controls. The initial visit opens Seed breeze;
returning from another location resets the tool view, not the world state. The
shared bed cards describe both seed clumps and their current water response.

A hand pump sends one fresh cup (three toy drops) down a chosen channel. Cove,
slope or terrace routes all three drops to that bed; Split three ways sends one
to each. Changing the gate previews the next distribution but does not pour.
Pouring replaces the previous cup instead of accumulating a higher score.
Concentrated streams make existing seedlings taller with golden blossoms; a
shared trickle opens low, wide leaves. Unwatered seedlings rest safely. Empty
beds still show pools/ripples and routes, so planting is not a prerequisite.

The PlayCanvas adapter renders a pump, active channels, differently sized pools
and plant geometry from the same reducer state used by text/SVG. Text names
every route and count; line thickness/dashes and bed outlines avoid color-only
feedback. The Look at the island control returns narrow-screen players to the
world view. No new animation, care timer, death/depletion, daily obligation,
score, correct route, flight prerequisite or learning form is introduced.

Water is a deliberately bounded routing toy, not hydrology/botany instruction
or an assessment. Each pour conserves three units; changing a route lets the
learner compare allocation and visible plant responses. This does not claim
real-world plant growth behaves this way or that using it establishes mastery.

## State, privacy and compatibility

- Waterworks is separate from seed-release history. Only the last four gate
  choices are retained, with no timestamps, elapsed-time or account collection.
- Reducer guards restrict experiments to the active, unpaused garden. Data
  persists across location visits, flights/retries and renderer restarts. Reset
  or reload clears it with the rest of local island state.
- Nothing is transmitted on gate selection, pouring, tool switching or return
  navigation. Water routes are explicitly excluded from existing optional seed
  discovery previews/uploads. No new upload selection, API endpoint or record
  schema is added; existing flight/seed/note sharing remains explicit.
- The curated v1 scene envelope, reviewed-content/exact-scene authorization,
  guardian encouragement and educator feedback paths remain unchanged. Local
  water geometry does not imply portable content script authority.
- No migration, privilege, role, Access, credential or dependency change.

## Local acceptance

`WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` passed all 17 gates on
unchanged source: 81 primary tests (including 11 adventure reducer tests), seven
additional tests, 19 PostgreSQL tests, two compiled Worker tests, 34 browser runs
across Next/vinext and both dependency audits.

The new reducer test checks all distributions and conservation, explicit pour
versus gate-only preview, water-before-seed use, plant-response descriptions,
bounded history/no accumulation, pause, location guards, flight retry and reset.
The new mobile non-WebGL browser test exercises the keyboard pump, seeded and
empty-bed responses, tool/location switching, pause/resume, last-four history,
mobile width, explicit save preview exclusion, no learning API traffic and reset.
The existing 3D test now waters a seeded terrace and verifies the response and
history survive repeated renderer disposal without extra pours or growth.

Inspected local captures (ignored): `test-results/waterworks-mobile.png` and
`test-results/seedwind-island-webgl.png`. Existing optional sharing, immutable
human feedback and compiled same-origin/Access regression suites still pass.

## Objective audit

This increment connects two experiments: where a seed lands determines which
plant responds to a water route. Meaningful choices and visible consequences
remain in the adventure; no quiz, reflection, account or adult response gates
play. Trusted feedback is still separate optional support, not automatic mastery.

This does not complete the objective. Remaining gaps include satisfying
longer-world play, broader device/GPU testing and real-user evidence, safe
participant enrollment/guardian consent and the explicitly deferred credential
rotation. The preview remains synthetic and owner-only; no real-child release
or learning effectiveness claim follows from automated acceptance.

## Hosted receipt

- Source `ea5eaf4` pushed after the full exact-source gate, then the verified
  web output deployed as `31c1ce97-331e-44ff-a530-29f16a18d4d6`. API remains
  `0254a354-35db-4696-aadf-86f55277010d`; no remote schema/data/role change.
- In a fresh authenticated OpenChamber Web tab, entered the garden without
  launching a flight, selected Water channels and poured a cove cup before any
  seed. The empty cove showed ripples; the other beds stayed quiet.
- Switched to Seed breeze, planted one round seed, then returned to water tools.
  The already-watered cove had a tall golden blossom in both geometry and text.
- Selected Split three ways: preview changed to 1/1/1 while the actual last-cup
  map and planted cove remained 3/0/0. Only the explicit Pour changed the world
  to three channels/pools and the same planted cove to low, wide leaves. Inspected
  focused/split desktop captures, including the sleeping beacon and untouched
  glider, rather than accepting the presence of a canvas as visual evidence.
- Stop & rest removed the renderer and disabled pouring; resume retained the
  split flow, planted bed and two-entry history. Reviewed the mobile controls,
  equivalent route diagram and care-timer/privacy explanation. Reset returned
  to the workshop; revisiting Water channels showed all flows at zero, empty
  beds, the waiting-pump message and no route history.
- No application credential, save or feedback action was needed. Provisioned
  no new sessions and performed no remote learning-data write or new mastery
  query. Closed the extra inspection tab; original island tab remains paused.
- Signed-out `/learn`, actual new adventure JS and record-catalog route still
  redirect to Access. Direct API workers.dev remains 404. Synthetic-only flag,
  Access issuer/audience, owner scope and bindings unchanged. Deferred credential
  rotation remains untouched and unresolved.

Ignored inspected captures:

- `.openchamber/screenshots/hosted-waterworks-focused-stream-2026-11-05T16-44-04-240.jpg`
- `.openchamber/screenshots/hosted-waterworks-split-stream-2026-11-05T16-44-38-619.jpg`
- `.openchamber/screenshots/hosted-waterworks-mobile-2026-11-05T16-45-23-037.jpg`
