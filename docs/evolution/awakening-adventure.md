# Awakening: bounded glider adventure

Status: local adult engineering prototype; no merge, deployment or child-test approval.
This is a short repeatable experiment, **not** the proposed polished 15–20 minute island.

## Reviewed inputs and instructions

Read `README.md`, `pr-reconciliation.md`, `dev-environment-state.md`, `prototype.md`
and `decisions.md` before implementation. Read the proposal from
`origin/docs/curiosityverse-end-goal-2026:docs/curiosityverse/END_GOAL_AND_IMPLEMENTATION.md`
without merging that branch. No `AGENTS.md` was found in the checkout or its ancestor
directories. The user's narrower authorization governs this increment; the proposal
does not authorize later gates.

## First-runtime decision: PlayCanvas web, not two engines

The concrete interaction compared is: choose wide/swept wings, choose sheltered/ridge
wind, steer mid-flight, land, change one variable and repeat. This is a capability
comparison, **not a Roblox playtest or a claim of Roblox tooling/support**.

| Capability for this experiment | Existing PlayCanvas web | Proposed Roblox |
| --- | --- | --- |
| Keyboard/touch | Native buttons plus arrow-key steering; testable in existing browser harness | Platform input facilities are relevant, but no place/input implementation is present or tested here |
| Authority | Deterministic browser state only; adequate for synthetic, noncompetitive play, not trusted evidence | A server-validated shared simulation would be useful for future multiplayer; no implementation verified |
| Privacy | No account, records, storage or network calls needed for play | Platform/account/hosting boundary would require separate privacy review; do not send learner records there |
| Authoring | Existing local npm engine; original primitive scene, no editor subscription/assets | Studio/place authoring and sync would be additional tooling; not verified in this environment |
| Operations | Existing local web build and loopback browser checks, with existing flags/Access untouched | Publishing/platform operations are outside this authorization |
| Portability | Existing v1 content contracts and a pure TS game model; no renderer types in either | Would need a reviewed adapter/model port; none scaffolded |

Choose PlayCanvas because this specific loop can be exercised with both control modes
and zero extra platform exposure or services. Existing investment alone is not the
reason. Roblox server authority is a genuine future advantage, but provides no needed
benefit for this anonymous solo experiment. Revisit selection only if shared-world
requirements and separate approval justify it. Roblox Studio capability/connectivity
was not tested in this workstream; no support is claimed. No Roblox runtime was built.

## Play and acceptance walkthrough

With `NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS=true`, `/` and `/learn` enter the adventure
directly in local web servers. When not exactly `true`, both show the existing disabled
message. No operator tools appear in learner navigation. Existing gateway Access
protection is unchanged; its root redirects to `/learn` after Access verification.

1. Immediately choose wide/swept wings and sheltered/ridge route. No credentials,
   question form, quiz or reflection gate. Launch with a native button (Enter/Space or tap).
2. In flight use left/right arrows or route buttons. Wider wings suit shelter; swept
   wings suit crosswind. This is an intentionally toy model, not aerodynamic teaching
   accuracy or a flight simulator. No failure penalty or lost lives.
3. Compare swept + shelter (35 m, safe cove landing) with swept + ridge (70 m, beacon).
   Wide + shelter also reaches 70 m; wide + ridge lands in the cove. Same choices give
   the same result; steering changes which wind applies to subsequent simulation steps.
4. Reaching the observatory illuminates its crystal and raises/lights eight star flowers.
   The world remains changed through further experiments, until reset/reload.
5. Offer a spark to the Lumiling: it follows the glider. Turn the wind ribbon: its
   observation opens a same-wing/different-route experiment cue. These are lightweight
   interactive hooks, not two additional completed adventures.
6. Stop/rest or Escape freezes the experiment and destroys the canvas application.
   Resume recreates it from state. Hiding the tab also pauses. Closing the tab is a
   valid end; no streaks, countdown pressure or rewards. Reset erases all local play,
   hints, companion, history and optional reflection, even while paused.

Native controls and the text instruments/outcome use the same reducer as the 3D view.
WebGL failure is explicitly labeled; complete play remains possible without 3D.
Buttons are at least 46px tall. The camera is fixed with no shake, flashing or forced
motion; the glider changes position at deterministic 100ms steps. Only the last six
flight summaries live in React memory. Finishing route is labeled as such, not claimed
to be a complete trace of mid-flight steering.

## Contracts, privacy and connected records

- `awakeningExperience` parses through the unchanged `ExperienceSpec v1` and `ScenePlan`.
  Content/title/prompts/entity labels/locations use the shared envelope. Fixed-template
  flight mechanics remain local, explicitly **not** a new portable gameplay schema.
  No v2, schema migrations or engine-specific fields added to core.
- Content has reserved synthetic UUIDs and no assets. The adapter creates primitives;
  it never follows `assetRef` URLs, executes content scripts or contacts any service.
- Session state is not evidence, authorization or mastery. No personal identifiers,
  analytics, uploads, browser storage, hosted AI, new auth or APIs are introduced.
- Optional reflection is a bounded unsent textarea, not a save/assessment workflow.
  Do not enter personal information. Reset/reload clears it.
- Explicit **Connect saved workspace** pauses/unmounts play and opens the existing
  `LearningJourneyPanel`. It receives no island state, reflection, history or tokens.
  Returning unmounts the record panel (clearing its in-memory private state) and leaves
  the island paused. Existing registered-session, quest approval, assigned adult,
  evidence/feedback and role-switch rules are unchanged. No automatic evidence bridge.
- The inherited fraction workbench remains **local-only** at `/learn/studio`, under the same flag.
  Its existing sample tests stay there; the connected journey regression starts at
  `/learn` and follows the separate opt-in entry.
  **Integration limitation:** the current protected gateway admits exactly `/learn`
  and `/learn.rsc` plus bundled assets. It rejects `/learn/studio` (404), so that footer
  link is not a hosted-preview compatibility claim. The inline connected-record panel
  remains inside `/learn` and needs no new route. This work does not broaden the
  gateway. A future integration should omit the local workbench link in hosted mode
  or separately review an exact route/RSC allowlist with Access and regression tests;
  never allow `/learn/*` generically or expose operator routes to fix it.
- No dependencies/manifests/lockfile changed. Existing `tsx` from the API workspace
  runs pure runtime tests. Dependency remediation belongs to the separate security
  agent; the documented October advisories remain unwaived by this work.

## Reproduce local checks

Use the existing frozen lockfile. Check that 3000/4000 are free first; never kill another
session's listeners. No CI, remote account, deployment, paid operation or personal data
is needed. The connected regression fixture creates/migrates/drops its own disposable
loopback database; it does not migrate an application database.

```sh
pnpm install --frozen-lockfile
pnpm --filter @headstrong/api exec node --import tsx --test ../web/lib/awakening.test.ts
# Include the inherited invalid-scene/persistence contract checks:
pnpm --filter @headstrong/api exec node --import tsx --test src/services/scene-plan-contract.test.ts ../web/lib/awakening.test.ts
pnpm --filter @headstrong/web exec tsc --noEmit --incremental false
NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS=true NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 pnpm --filter @headstrong/web build
# Separate terminals, after checking free ports:
TEST_DATABASE_ADMIN_URL="postgres://$USER@127.0.0.1:5432/postgres" pnpm --filter @headstrong/api test:learning:serve
pnpm --filter @headstrong/web exec next start --hostname 127.0.0.1 --port 3000
PLAYWRIGHT_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm test:learning:browser
# Optional second web renderer, instead of the Next server (same PlayCanvas engine):
pnpm --filter @headstrong/web dev:vinext:fixture
# After a separate Next build with NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS=false:
LEARNING_DISABLED_CHECK=true PLAYWRIGHT_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm test:learning:browser
```

Browser acceptance covers game-first entry, early choice, two different flight outcomes,
world consequence, keyboard steering, touch input, WebGL failure, pause/reset, optional
reflection, network/storage isolation, mobile overflow, and connected-record regression.
Tests save local captures under ignored `test-results/awakening-*.png`.
Copy captures to ignored `artifacts/local-verification/` before starting another
Playwright run; its normal test-output cleanup removes previous run captures.

## Verification record — 2026-11-04

- Frozen-lockfile install passed, reused cached packages; manifests and lockfile unchanged.
- Targeted runtime/contract units: **6 passed** (four new model/v1 tests plus two inherited
  invalid-scene/persistence checks).
- Web TypeScript check and targeted Biome checks: passed; `git diff --check` passed.
  The Next-generated `next-env.d.ts` change was restored; no generated source committed.
- Production Next build with feature flag enabled: passed. Separate disabled build:
  passed; disabled browser test passed for `/`, `/learn`, `/learn/studio`.
- Production Next browser suite: **7 passed**, final run 43.6s. Vinext loopback fixture
  browser suite: **7 passed**, final run 50.7s. Both use the **same PlayCanvas engine**.
  Both include the inherited connected learner → evidence → educator → satisfaction
  flow and fraction sample tests. No tests skipped or failure expectations weakened.
- Actual Chrome tool-driven adult engineering pass: selected swept wings, flew shelter
  to 35m/cove, returned, changed to ridge and reached 70m/beacon. Inspected actual
  rendered world and the illuminated crystal/raised garden in screenshots. Also reviewed
  390px WebGL/mobile captures. Touch is browser emulation, not a physical device test.
- The first browser runs caught a material/device teardown-order crash and a vinext
  pre-hydration click race. Fixed by disposing materials before the application/device
  and keeping JavaScript action controls disabled until hydration. Full suites then
  passed, including repeated mobile pause/resume. No known failure suppressed.
- Captures retained locally under ignored `artifacts/local-verification/awakening-next/`
  and `artifacts/local-verification/awakening-vinext/` (entry, cove, restored,
  mobile WebGL/restored and touch-fallback views). Embedded WebKit panel capture showed
  a black WebGL readback; actual Chrome and Playwright captures displayed the scene.
  Do not treat that embedded capture as visual rendering evidence.
- No full repository, dependency audit, Worker deployment or production safeguarding
  sign-off claimed by this workstream. Security/platform validation belongs to the
  coordinating agents. No existing advisory acceptance is widened here.

## Remaining limits and rollback

Not implemented: free-roaming avatar, real aerodynamics, authored story arc, server
authority/multiplayer, persistent discoveries, production onboarding, adult-message
delivery, game-generated evidence export, full observatory/creature paths or XR.
No actual child playtest or proof of intrinsic fun, learning transfer or accessibility
certification. Touch emulation is not physical-device testing. WebGL behavior remains
device-dependent. Engineering acceptance is not a release/security sign-off.

Rollback only this increment's listed UI/runtime/test/doc changes; no database rollback
is needed. Setting the existing feature flag off and rebuilding disables both entrances
but does not itself change hosted deployments. No remote action is authorized here.
