# Headstrong / Curiosityverse — End Goal and Agent Implementation Plan
Status: proposed, review required | Draft: 2026-10-15 | Reconciled: 2026-10-26 | Owner: Headstrong
Canonical repository: wpbiggs/headstrong. This document is a product destination and staged delivery contract, not an assertion that Roblox gameplay is implemented.

## Reconciliation with PR #1 — review before execution

[PR #1](https://github.com/wpbiggs/headstrong/pull/1) is a candidate implementation
foundation; this PR is proposed product direction. Neither has been merged. Their
original heads (`21302c9` and `963d207`) combine without text conflicts in a non-mutating
merge-tree check, but that does not constitute product or security approval.

- The goal → quest → evidence workflow in #1 is an optional **connected record** path,
  not a requirement to make a child fill out a dashboard before playing The Awakening.
  The new studio is a local sample/workbench, not the flagship adventure.
- #1 implements PlayCanvas, not Roblox. Roblox remains a proposed runtime: verify
  tool availability and compare the smallest interaction prototypes before making a
  flagship engine decision. Do not recreate core auth, evidence services or contracts.
- October 26 clean-checkout verification of #1 code at `e912cf7` passed all 15
  functional checks, including four browser tests on each renderer. Both dependency
  audits failed: high runtime Zod advisory `GHSA-mrhx-c7xc-m3w5`, plus toolchain findings
  in undici and fast-uri (eight total). These are not waived by the earlier build-tool
  risk acceptance. No blanket source/security sign-off is claimed.
- The older private synthetic preview is deployed; the redesigned studio is source/local
  only. No real child playtest, Roblox Studio verification or game-fun evidence exists.
- This PR's CI job executed no steps because the GitHub account is billing-locked,
  per its check annotation. It is not a documentation test failure or a passed run.
  CI remains optional. No billing changes or automatic retry is required.

Keep these PRs separate. Review the direction here first, review/remediate #1's
dependency and compatibility risks, and obtain explicit approval before merging either.
A docs merge would record direction only, not authorize engine work, publishing or
child testing. Then reevaluate the smallest **playable adventure**, not another
dashboard increment. The complementary review record is
[`docs/evolution/pr-reconciliation.md` on the #1 branch](https://github.com/wpbiggs/headstrong/blob/feat/learner-experience-vertical-slice/docs/evolution/pr-reconciliation.md);
it is not present on this docs-only branch until both contributions are integrated.

## North Star
Build a beautiful, safe, child-directed universe in which curiosity launches adventures, discoveries provide useful knowledge, experimentation builds capabilities, creativity changes the world, and contributions visibly help others. Children should want to play *before* they recognize they are learning. A player can eventually progress from adventurer to creator of curated experiences for other children.

**Player promise:** Explore extraordinary worlds. Discover what fascinates you. Invent solutions. Make a difference together.

### Non-negotiables
- Agency: choose adventure, playstyle and stopping point; no compulsory quizzes.
- Intrinsic motivation: avoid streak pressure, gambling/loot boxes, pay-to-win, artificial urgency, addictive economy and educational leaderboards.
- Child dignity: no inferred mental health or psychological vulnerability profiling; no obligation to respond to adult messages.
- Safety by design: limited, supervised child collaboration; no unreviewed public UGC or open AI chats; least-privilege roles and consent.
- Educator/parent approval for published quests and messages. Private learner evidence by default.
- No public deployment, real child data, production DB changes, paid services or publishing without separate approval.
- Riker's VR learning game is inspiration and a possible voluntary collaboration, not a licensed asset or automatic code dependency; respect his authorship.

## Long-term game pillars
1. **Living adventure:** an unfolding mystery, discoverable biomes, creatures, secrets, movement, exploration, changing environments.
2. **Useful invention:** build and modify tools, gliders, machines, habitats and eventually whole spaces; domain principles affect outcomes.
3. **Visible consequence:** player actions restore habitats, open routes, help villagers and change the local world.
4. **Interconnected knowledge:** skills earned in one region create possibilities in another; no artificial subject boundaries.
5. **Creation and contribution:** players gradually design moderated challenges, exhibits and experiences, without acquiring authority over other children.
6. **Safe belonging:** optional, age-appropriate cooperation with limited communication and safeguarding controls.

World regions: Maker's Valley (engineering); Living Wilds (ecosystems); Discovery Peak (science/mysteries); Story Harbor (art/story); Commons Village (community). Progression is *per domain*: Explorer → Tinkerer → Maker → Guide → Contributor. These are capability descriptions, not global levels or rankings. A solo path must remain viable.

## First flagship experience: The Awakening
**Do not lead with a bridge simulator.** The player lands on Explorer's Island during an unexplained pulse that activates ancient devices and disturbs the natural world. Within 90 seconds, the player sees a gliding creature, a mysterious observatory, and a usable invention station. Present meaningful choices:
- **Lost Lumiling:** trail a glowing creature, observe habitat cues and help restore a resource.
- **Flight of the Inventor:** customize a glider, test lift/balance, and reach an island overlook.
- **Observatory Mystery:** align a mechanism to expose a clue and a new destination.

For the first playable slice (target 15–20 min, not a forced timer): build one rich island, a fast movement/exploration mechanic, one complete glider-or-creature adventure, two lightweight mysteries/hooks, a consequential world change, an optional curiosity prompt and a satisfying stopping point. A broken bridge can be a *later incidental challenge*. The hooks must be interactive, not just static locked doors.

Quality bar: visually identifiable world, expressive feedback, immediate moment of wonder, first meaningful control in <60 seconds, usable on keyboard and touch, forgiving experimentation, no required reading walls.

## Existing repository inventory (reviewed 2026-10-15)
Main contains Next.js web, Hono API, PostgreSQL migrations, Zod core contracts, quest/scene contracts, deterministic template scene planner, approval/moderation, LMS, social/commons, compute and other adjacent scaffolds. `packages/core/src/contracts/scene.ts` defines bounded ScenePlan v1; `packages/scene-planner/src/index.ts` is a stub template selector; `README.md` is dated (Phase 0 scaffold).

An **OPEN DRAFT, UNMERGED PR #1**, `feat/learner-experience-vertical-slice`, adds engine-neutral `packages/core/src/contracts/experience.ts` (ExperienceSpec v1 wraps ScenePlan + quest/task/objective), PlayCanvas rendering, learner goal → approved quest → private evidence → educator feedback → optional satisfaction, and important database/auth hardening. It now also contains private Cloudflare/Supabase dev setup and a redesigned local-only fraction sample studio. See the dated reconciliation above for freshly rerun functional results and the non-green dependency audits; older all-green audit claims are historical. Review security changes and PR diff before merge. The PR is not Roblox, not production safeguarding, not verified LMS or full XR.

**Reconciliation rule:** do not reinvent ExperienceSpec, learning services or auth. Use PR #1 as the candidate foundation after human code/security review; preserve its engine-neutral contract, add versioned backward-compatible gameplay metadata only after reviewing test impacts. Keep Roblox as an adapter and PlayCanvas as another runtime. Avoid coupling world logic to legacy ledger, social or compute services.

## Target technical architecture
- **Core:** `packages/core` = versioned ExperienceSpec/ScenePlan, safety/accessibility, interactions, objectives and event schemas. Make a v2 only if v1 cannot express portable gameplay, with explicit migration and fixture tests.
- **Content authoring:** educator-approved deterministic or AI-assisted *offline* design proposals; human publishing gate; no child-facing generative chat.
- **Runtimes (proposed):** if Roblox is selected, `apps/roblox` or `packages/runtime-roblox` with Luau code in source control (Rojo project tooling only if verified and justified), automated source-to-place sync or Studio MCP-assisted generation. `apps/web` PlayCanvas adapter remains separate. No Roblox tooling is claimed installed or verified; selecting a runtime remains a Gate 0 decision.
- **Roblox client/server:** client handles controls/camera/VFX/UI; server validates all gameplay actions and computes outcomes. Avoid transmitting personal learner records to Roblox and do not include API secrets in client scripts.
- **Evidence adapter:** local anonymous/session game events first (`discovered`, `hypothesis_tested`, `design_revised`, `world_restored`, `optional_reflection`); later a signed, privacy-reviewed, server-mediated bridge to Headstrong if justified. Gameplay telemetry is not by itself proof of mastery.
- **Trusted adult content:** opt-in approved catalog messages, topic-based in initial release; verified relationship/guardian authorization and privacy review required before personal targeting.
- **Verification:** pure Luau unit tests for puzzles and validators, source-contract tests in TS, Studio MCP playtests, keyboard/touch checks, captured screenshots and console logs. No test marked passed without evidence.

## Delivery sequence and responsibility boundaries
### Gate 0 — Repository and risk reconciliation (agent: architect/security)
1. Inspect main, open PR #1, existing contracts, migrations and tests. Inventory implementation vs stubs; identify breaking differences and outstanding threats.
2. Adopt or revise the product direction explicitly. Compare the smallest representative interaction in the implemented PlayCanvas runtime and the proposed Roblox runtime where tools permit; evaluate keyboard/touch, server authority, privacy, authoring and operations. Select the first runtime rather than treating this proposal as an engine mandate. Reuse #1's foundation after review, or keep experimental engine work independent pending it. Document dependency graph.
3. Verify *currently available* Roblox Studio MCP operations in the local client and Studio; tool names/capabilities are environment-dependent. If inaccessible, proceed with repository Luau sources and offline tests, and report Studio integration blocked.
**Done:** one architecture decision record, reviewed PR risks, baseline test report and clear independent workstreams.

### Gate 1 — Playable fantasy prototype (agent: game director + selected-runtime engineer)
1. Greybox Explorer's Island with striking central mystery, clear movement, discoverable creature, workshop, and observatory.
2. Build glider customization + forgiving test loop **or** creature ecology quest as the first completed system (choose whichever tests as more intrinsically fun after tiny paper/interactive prototype). The other quest is a small, playable hook.
3. Add world consequence, optional hint, stop/resume/reset, basic accessibility, and entirely server-validated interactions.
4. Run the selected runtime's actual playtest (Studio if Roblox), inspect logs, record captures; demonstrate from new spawn through one complete adventure. Do not count an offline Luau test or browser dashboard as a Studio/gameplay pass.
**Done:** a stranger can play a self-contained 15–20 minute journey with no developer explanation, two real choices in first 3 minutes, one memorable discovery and world change, zero fatal errors. No educational dashboard needed.

### Gate 2 — Transferable experience contract (agent: platform architect)
1. Map first quest to existing ScenePlan/ExperienceSpec, identify exactly which mechanics require schema extension (triggers, state transitions, outcomes, learning signals).
2. Version and test safe declarative schema (no executable scripts or arbitrary external asset URLs). Implement the selected adapter; implement Roblox only if approved and confirm existing PlayCanvas tests still pass.
3. Demonstrate at least one content change made through the shared spec rather than hardcoding all quest text/state in Luau.
**Done:** verified schema validation, invalid-spec rejection, backwards compatibility and one end-to-end runtime mapping.

### Gate 3 — Safe learning evidence (agent: learning engineer + privacy)
1. Agree on age-appropriate learning objectives and observable behaviors: notice habitat variables, predict/test glide outcome, change one variable, explain choice optionally.
2. Separate play telemetry, self-report and educator assessment. No leaderboard, inferred emotions, personal journals, or third-party analytics.
3. Implement session-only evidence and opt-in facilitator export with synthetic identifiers; keep production sync disabled.
**Done:** reproducible event trail for at least two strategies; can delete/reset it; no unexpected PII.

### Gate 4 — Small supervised playtest (agent: research/QA)
1. Adult engineering QA first, then guardian-consented, supervised 5–8 children with inclusive recruiting. Neutral intro, no solution coaching.
2. Observe first 60 seconds, voluntary path choice, exploration, revisions, delight/confusion, comprehension and stopping behavior.
3. Iterate before second 5–8 participant test. Predefine target indicators but do not treat small samples as efficacy proof.
**Done:** research notes with no identifying details, prioritized usability defects and evidence for either scaling or changing the game fantasy.

### Gate 5 — Expand only after fun is demonstrated
Add second complete adventure, persistent personal-world changes and deeper player creation tools. Add safe cooperative play only following moderation, permissions and age-design review; never let growth pressure bypass safeguarding. Later districts, publishing/creator tools, real-world curricula and commercialization are independent gated projects.

## Playtest questions and quantitative signals
Proposed initial thresholds, subject to revision: >80% reach meaningful interaction in 2 min without coaching; >70% finish one adventure; >60% deliberately revise a hypothesis or construction; >50% voluntarily investigate an optional hook; >70% report wanting to explore more. Track also *why* children stop, not just time spent. Capture observed transfer of knowledge, not merely quest completion. No compulsory streaks or external tracking.

## Agent execution rules
- Product destination above is proposed until approved; after adoption it guides gate-based, PR-reviewable implementation. This file alone does not authorize a new workstream or tool action.
- Work in short independent branches and draft PRs; do not merge or deploy or publish without approval.
- Every PR: rationale, linked gate, screenshots for gameplay, tests run/results, limitations, privacy/security impact, migration impact and rollback plan.
- Assign one agent to engine gameplay, one to core contracts, one to safety/tests; avoid parallel changes to the same files. Architect integrates and resolves conflicts.
- Prefer existing packages. Do not add hosted infrastructure, third-party assets, or large dependencies without justification and approval.
- Document **blocked** vs **not implemented** vs **tested** distinctly. Do not use children's actual identities or stories as fixture data.
- Do not turn Headstrong into a conventional school/LMS before the game fantasy is proven.

## Next executable handoff
1. Finish Gate 0 review and obtain direction/merge decisions for these two PRs. Keep new dependency findings and #1's auth/migration compatibility review visible; do not merge or publish implicitly.
2. After approval, use a short capability/interaction spike to select the first runtime, then create isolated `feat/curiosityverse-awakening-slice` from the reviewed baseline. Do not scaffold a second engine merely because this document names it.
3. Build one complete glider-or-creature loop, two meaningful choices, an experiment with a visible consequence, optional reflection and a stopping point. Use keyboard/touch and adult engineering QA first; no real child data or unapproved publishing.
4. If Roblox is selected, verify Studio MCP connectivity. If connected, capture actual Studio play; otherwise test deterministic mechanics offline and report gameplay/Studio validation blocked rather than complete. Return a reviewable playable increment with captures and test evidence, not just tickets or dashboards.

**Ultimate definition of done:** An accessible, privacy-respecting, expandable universe where children *choose* adventures, learn through genuine experimentation, build original solutions, help others, and can eventually author curated new experiences. Education is the consequence of compelling play, not a prerequisite for it.
