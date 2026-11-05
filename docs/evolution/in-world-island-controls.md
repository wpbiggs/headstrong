# In-world island controls

Status: exact-source local acceptance passed; private rollout pending.

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
`test-results/awakening-mobile-webgl.png`. Hosted acceptance remains pending.

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
