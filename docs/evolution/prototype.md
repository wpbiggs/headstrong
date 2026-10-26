# Local prototype specification and operator guide

## Contract and state

`POST /learning/goals` creates a learner-owned objective. Then POST to
`/learning/goals/:id/quest` with an existing quest ID. Quest creation/composition and
parent approval remain in the existing `/quests` flow. The first supported task supplies
its existing ScenePlan. This slice selects a quest; it does not generate one from the goal.

Next: `/evidence` → `/feedback` → optional `/satisfaction`, all POST on that goal.
GET `/learning/goals/:id` returns `{journey, experience}` to its learner, assigned
educator or linked assigned guardian. No global listing/export endpoint. Admin is not
a blanket private-record reader. Inputs/outputs are Zod contracts in `packages/core`.

- Goal → quest association is immutable. Start another goal to choose differently.
- One evidence artifact, one teacher assessment, one satisfaction response per goal.
- A duplicate write returns 409 without adding records or changing the original.
- Writes serialize on the goal; linked quest/guardian relationship is locked and checked.
- All writes and minimized audit records commit together; failures roll back.
- Learner observations are claims, not remotely attested engine telemetry or mastery.
- No AI, remote asset, LMS, MCP or paid hosted-engine call occurs.

## Local setup (fixture data only)

Use a disposable loopback PostgreSQL database. **Do not run the legacy migration runner
on a real database**; see migration audit. The integration script below creates a unique
database and now applies the entire tracked migration history.

API environment: normal fixture values plus `API_HOST=127.0.0.1`,
`ENABLE_LEARNING_JOURNEYS=true`, `NODE_ENV=development`.
Web: `NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS=true`,
`NEXT_PUBLIC_API_URL=http://127.0.0.1:4000`,
`NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000`.
Both flags default off; API rejects malformed booleans, production mode and non-loopback
binding. Next public flags must be supplied at build/start time as appropriate.

Start API and web with explicit env, then visit `/learn`. Paste a fixture learner bearer
token, create a goal, choose an approved quest ID, inspect blocks (or keyboard buttons)
and submit a reflection. Clear/switch session to the fixture assigned educator and load
the goal ID to assess. Switch back to learner, load the same ID, read feedback and
optionally rate the experience. Switching sessions clears displayed private data.

PlayCanvas 2.23.2 is the free MIT engine installed locally, not the hosted editor. It
renders primitives; ScenePlan asset references are not downloaded. The legacy scene-card
runner is untouched. New canvas is lazy loaded, disposed on stop/unmount and has native
keyboard inspection controls. A WebGL failure is visibly reported, not described as 3D.

See `verification.md` for actual command outcomes and remaining blockers. Do not use
real children’s data or deploy this prototype without the P0 security backlog and approval.
