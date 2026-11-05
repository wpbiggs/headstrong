# In-world island controls

Status: pushed and deployed to the owner-only synthetic preview; hosted
OpenChamber Web loop verified. Not participant or production approval.

## Play beside the world

Workshop, garden and observatory now have named landmark buttons anchored to
their projected positions in the PlayCanvas view. They are real HTML buttons,
not invisible canvas hit zones or precision ray-picking requirements. Current
location is marked; visible destinations accept pointer, touch and keyboard
activation. A small pure layout function keeps targets inside the canvas and
separates overlapping touch areas. Off-screen landmarks are omitted rather than
pretending to sit on an unrelated object. The permanent island trail remains
available, and focused stops offer a return-to-workshop action beside the world.

The nearby Play at this stop controls operate the existing local reducer:

- Workshop: change wings before launch, steer either route, take flight and
  prepare another glider after landing. The nearby distance/result text permits
  completing an experiment without scrolling to the detailed console.
- Garden: change seed shape and breeze, explicitly release a seed, choose the
  next water gate and explicitly pump one cup. Read the last seed landing and
  actual last-cup allocation. Selecting a gate alone still does not pour.
- Observatory: change the constellation and spread/gather the same five lights.

More experiment tools scrolls to the detailed controls for the current stop.
Existing rich text, histories and optional notes remain available. None becomes
a prerequisite. When WebGL is unavailable, landmark overlays stay empty but the
nearby text controls, permanent trail and detailed experiments still work.

## Boundaries and lifecycle

Only the renderer performs world-to-screen projection, using CSS-pixel camera
coordinates after render. It emits markers on view/size changes, not on each
flight tick. React owns the accessible buttons and all user actions. Layout
rejects invalid dimensions/non-finite coordinates and out-of-view targets.
No world content script, arbitrary URL or executable scene authority is added.

Pause removes the canvas/markers and disables experimental actions; resume
rebuilds the renderer and projects fresh landmarks. Callback cancellation prevents
an old renderer restoring markers after leaving, pausing or opening an optional
workspace. Resize disposal still cancels the coalesced animation frame. Native
select controls retain their keyboard behavior under the existing key filter.

All actions reuse existing reducer guards, held-flight behavior, bounded local
histories and reset semantics. No API, evidence schema, upload selection,
credential, grant, migration, role or dependency change. No note, discovery or
feedback is uploaded by activating a world control; optional save choices remain
unchecked. Access admission still does not imply an application role or mastery.

## Local acceptance

`WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` passed all 17 gates on
unchanged source: 82 primary tests (12 adventure/layout tests), seven additional
tests, 19 PostgreSQL tests, two compiled Worker tests, 38 browser runs across
Next/vinext, and both dependency audits.

New coverage includes projected touch-target bounds/separation at narrow and
desktop sizes, invalid/off-screen projections, keyboard landmark travel, a full
garden/sky/flight loop through nearby controls, view resizing, no learning API
requests, clean browser errors, pause/resume and no-WebGL seed/water play with
unchecked optional save selections. The existing mobile touch WebGL scenario
now taps a garden landmark, releases a seed, pumps a cup and returns before its
flight and repeated renderer-disposal checks. Existing optional sharing and
trusted-feedback regression suites pass unchanged.

Inspected ignored local captures: `test-results/world-controls-mobile.png` and
`test-results/awakening-mobile-webgl.png`. Hosted receipt follows below.

## Objective audit

This brings choices closer to the adventure view instead of requiring a long
control-panel detour. The existing experiments still create visible world
changes without mandatory quizzes, reflections, accounts or adult feedback.
Optional saving and human responses remain separate support, never automatic
mastery. This is projected landmark navigation plus DOM play controls, not a
walking avatar, arbitrary object manipulation or evidence of learning outcomes.

The overall objective is not complete: longer-world depth/polish, broad real
device/GPU coverage and real-user play evidence remain unestablished. Safe
participant enrollment/guardian consent and deferred credential rotation remain
open. This remains an owner-only synthetic preview, not a real-child release.

## Hosted receipt

- Source `a7f0c01` pushed after exact-source acceptance, then verified web output
  deployed as `efda40d9-5538-4f81-8d6b-53a369ef000a`. API remains
  `0254a354-35db-4696-aadf-86f55277010d`. No bindings, account roles, schema,
  migrations, privileges or credentials changed.
- In a fresh authenticated OpenChamber Web tab at mobile size, used the projected
  Garden button rather than the permanent trail. Nearby tools switched to
  feathered seeds/ridge breeze and explicitly released a seed: 14 m to terrace.
- Selected split water route; nearby readout still showed zero actual water
  until Pump water. The explicit pump produced 1/1/1 drops and three visible
  channels/pools, with the planted terrace responding. Inspected the hosted
  mobile world/landmark/control capture, not just the text status.
- Used the projected Observatory button; nearby Project a kite and Spread the
  lights changed the five world-space lights and the selected detailed controls.
  Inspected the mobile sky/control capture. Pause removed landmarks/renderer
  and disabled experimental actions; resume retained kite/close choices.
- Follow the trail to workshop returned without requiring a completion gate.
  Nearby Fit swept wings, Bank right and Take flight produced a 70 m flight,
  the awake beacon and star flowers. Inspected the desktop capture containing
  projected landmarks, nearby controls and the matching detailed flight result.
- No application token, quiz, reflection, note, save or human-feedback action
  was required in this loop. No sessions were provisioned or remote learning
  records written, and no fresh remote mastery-count query is claimed. Paused
  and closed the extra inspection tab; original island tab remains paused.
- Signed-out HTML, actual new adventure JS and record-catalog route still
  redirect to Access. Direct API workers.dev remains 404. Synthetic-only flag,
  owner access scope, Access issuer/audience and service bindings are unchanged.
  Deferred credential rotation is still unresolved.

Ignored inspected captures:

- `.openchamber/screenshots/hosted-world-garden-controls-2026-11-05T17-03-23-645.jpg`
- `.openchamber/screenshots/hosted-world-sky-controls-2026-11-05T17-03-54-585.jpg`
- `.openchamber/screenshots/hosted-world-flight-controls-desktop-2026-11-05T17-05-01-513.jpg`
