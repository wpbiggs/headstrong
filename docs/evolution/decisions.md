# Architecture decisions

Status: accepted for local prototype; production rollout requires separate review.

## ADR-001 — Learner agency and pathways

Persist a learner-owned goal before choosing a quest. For the minimal slice, select an
existing parent-approved live quest instead of building a second quest composer. The
learner may stop without completing the loop; no streaks, penalties or automated ranking.
Goals are private, not feed posts. Multi-quest graphs and goal revisions are backlog.

## ADR-002 — Mentorship and consent

Reuse `quests.parent_id`, parent-student links, parent approval events and
`quests.educator_id`. Require a valid assigned educator, current guardian relationship,
parent approval and cleared educator review to launch or write evidence. Recheck these
conditions under row lock on each mutation. Learner selection of the quest explicitly
shares that goal/evidence with its assigned educator and linked guardian. No open mentor
discovery, adult direct messaging or unrelated educator access. Formal, revocable mentor
invitations and jurisdiction-specific parental consent remain production requirements.

## ADR-003 — Evidence, feedback and portfolios

Extend the existing portfolio artifact shape into a private text evidence artifact, with
quest/task references, a bounded reflection and claimed observations. One immutable
submission and one educator assessment per goal make retries/ordering unambiguous.
Educator feedback is `demonstrated` or `needs_practice`; browser interaction is self-reported
evidence, never proof of mastery. Do not increment legacy mastery signals without a real
skill rubric. Evidence plus assessment is the first private portfolio record, not a
public gallery. Multiple attempts, skill mappings and retention/export are future work.

## ADR-004 — Learner satisfaction

After educator feedback, learner may optionally submit enjoyment, agency and challenge
ratings (1–5). Declining is permitted. Keep satisfaction separate from grades/rewards;
no behavioral surveillance, time-on-task, biometrics or public leaderboard. Store raw
ratings privately; do not export small-cohort statistics. No free-text satisfaction field.

## ADR-005 — ExperienceSpec and PlayCanvas

Use a small engine-neutral `ExperienceSpec v1` wrapping existing ScenePlan plus objective,
quest/task IDs. No engine classes, executable scripts, URLs to load or tool permissions.
Adapt it client-side using the free MIT PlayCanvas npm engine, not hosted editor services.
Initial engine renders primitive entities with pointer inspection and a matching native
keyboard interaction list. No imported assets, tracking, headset requirement or XR claim.
Dispose the application/listeners on unmount; report WebGL failure explicitly and retain
the accessible alternative. This is a template renderer, not bespoke generated content.

## ADR-006 — AI gateway and MCP permissions

Reuse `packages/ai-gateway` only behind existing composition flows. The slice makes zero
AI requests, avoiding unapproved cost and profile egress. Future AI operates on minimized
objectives, returns schema-validated proposals, and cannot approve quests, assess mastery,
contact minors, read private portfolios or invoke MCP tools. Tool access must be explicit,
least-privilege, per actor/action, with server checks and audit; model output grants none.
Do not add MCP infrastructure or a generic permission framework for this slice.

## ADR-007 — Safeguarding and deployment containment

New API and page default off and fail closed for malformed flag values. API may enable
only with a loopback bind and outside production. New browser uses a pasted bearer token
held in React memory (no role/email bootstrap, URLs, cookies or localStorage). New text
uses existing moderation and rejects non-safe results; this heuristic is explicitly
insufficient for production safeguarding. Audit only identifiers/actions, not reflections
or ratings. All SQL is parameterized, size bounded, actor scoped, and mutations atomic.
Do not deploy this prototype or exercise external integrations without approval.
