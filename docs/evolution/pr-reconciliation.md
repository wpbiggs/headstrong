# PR reconciliation and next decision

Reviewed 2026-10-26. This reconciles scope and claims; it is not merge, deployment,
engine-selection, paid-service or child-playtest approval.

## Two contributions, not two competing implementations

| Change | What it contributes | What it does not establish |
| --- | --- | --- |
| [PR #1](https://github.com/wpbiggs/headstrong/pull/1) | Candidate platform foundation: bounded engine-neutral contracts, authorized learning/evidence workflow, database/auth hardening, private dev infrastructure, PlayCanvas adapter, and local sample studio | A compelling adventure game, finished account onboarding, production safeguarding, Roblox support, verified external integrations, or automatic mastery |
| [PR #2](https://github.com/wpbiggs/headstrong/pull/2) | Proposed Curiosityverse destination, The Awakening first-adventure concept, safety boundaries and gated delivery plan | Implemented gameplay, an approved engine decision, authorization to execute every gate, or a replacement for #1's services |

Both target `main` at `03db05f`. A non-mutating `git merge-tree --write-tree` comparison
of #1 at `21302c9` and #2 at `963d207` found no text conflicts. Their changed paths do
not overlap. That is integration compatibility, **not** a security or product sign-off.
Subsequent reconciliation edits in both PRs are documentation only.

## Resolve the product mismatch explicitly

PR #1's goal → approved quest → evidence → feedback sequence is a **connected
learning-record workflow**, not a universal rule that a child must fill out a goal
form before playing. The studio is an interaction/sample workbench, not the flagship.

PR #2 proposes a **game-first destination**: curiosity, exploration, experimentation
and a visible consequence in a world. A dashboard, token field, quiz or required
reflection cannot be the entrance price for that fantasy. Agreeing to this direction
does not remove guardian consent, age-appropriate design or human publishing review.

These can coexist as two bounded paths:

1. **Curated play:** a reviewed, synthetic, session-only adventure prototype with
   useful controls, a meaningful choice, a complete experiment and a stopping point.
   No personal account records, adult messages or unapproved content in the runtime.
2. **Optional connected record:** authorized learners and trusted adults use the
   existing services to save evidence and review it. No automatic conversion of game
   events into mastery, no silent journal upload, no role inferred from Access login.

The local sample currently implements neither an Awakening adventure nor the full
connected product experience. It only demonstrates a small fraction exploration.

## Foundation and runtime boundaries

- Reuse `ExperienceSpec v1`, `ScenePlan`, quest authorization and evidence services.
  Do not create a second auth system or a Roblox-specific copy of learner records.
- Keep current v1 contracts unchanged during reconciliation. Check actual gameplay
  needs before adding versioned metadata; preserve invalid-input and compatibility tests.
- PlayCanvas is implemented; Roblox is a proposed additional runtime. No Roblox
  Studio/MCP capability was verified during this reconciliation. Do not claim it exists
  or scaffold a whole second runtime just because the plan names it.
- Decide the first flagship runtime after a small capability/interaction comparison.
  Consider keyboard/touch usability, server authority, privacy, authoring, operations
  and exportability. Existing web investment is not by itself a product argument;
  Roblox being named in a proposal is not by itself implementation approval.
- Do not couple the first adventure to campaign, compute, ledger, LMS or social systems.
  The inherited uncommitted work in those domains is outside both PRs.

## Verification and unresolved risks

For #1 code at `e912cf7`, an independent clean checkout installed from the frozen
lockfile passed all 15 functional checks: lint/types, Worker types and packaging,
Access/gateway/workerd tests, unit tests, 12 PostgreSQL integration tests, both builds,
and four browser tests on each renderer. Actual local WebGL pointer selection and
desktop/mobile screenshots were reviewed. These checks do not test Roblox or prove fun.

Both dependency audits failed on October 26. Production has a high Zod advisory
(`GHSA-mrhx-c7xc-m3w5`); full toolchain has eight findings across Zod, undici and
fast-uri. This is a refreshed finding against existing dependencies, not a claim
that the studio introduced the vulnerability. See `dev-environment-state.md`.
Do not reuse the historical build-only advisory exception for these findings.

PR #2's GitHub job never started: its check annotation reports an account billing
lock, with zero executed steps. That is neither a source test failure nor a pass.
CI is optional; no billing changes or retries are required for reconciliation.
Documentation-only edits were checked for diff errors; no gameplay testing is claimed.

The private hosted preview still runs the older deployment. The redesigned studio
is in source/local review only. Neither PR has been merged by this reconciliation.

## Recommended disposition

1. Keep the PRs separate: #2 is product intent; #1 is candidate implementation.
   They have no code-level dependency requiring a rebase or a combined mega-PR.
2. Review/approve #2's game-first direction and boundaries first. A docs merge would
   record direction, **not** authorize its engine work, child testing or publishing.
3. Before approving #1, resolve or explicitly review the current runtime/toolchain
   dependency findings and review its auth/migration compatibility changes. Existing
   local green functional results do not override those risks. Merge and deployment
   remain separate approvals; keep both draft until explicitly decided.
4. Reevaluate against a **playable-adventure milestone**, not another dashboard pass:
   one Awakening path (glider or creature), meaningful early control and choice,
   a repeatable experiment with visible consequence, optional reflection and a
   satisfying stop/reset. Keyboard/touch and adult engineering QA first; no real
   child data, hosted AI, new public exposure or child playtest without approval.
5. Select engine/workstream and revise estimates only after that direction is agreed.
   Account onboarding and the optional evidence bridge remain explicit platform work,
   not prerequisites for learning whether the game is worth playing.

**Reevaluation question:** does one small adventure make someone want to explore and
experiment without being told to complete an educational workflow? If not, improve
the play loop before expanding infrastructure, dashboards or world regions.
