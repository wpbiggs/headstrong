# Prioritized implementation backlog

**Scope:** this is the platform backlog, not the complete product roadmap. PR #2 proposes
a game-first Curiosityverse destination. See `pr-reconciliation.md` before selecting
new work: onboarding/dashboard expansion is not a substitute for proving a compelling
adventure loop. The proposed direction and engine selection still require approval.

Completed local hardening is recorded in `local-hardening.md`: full migration bootstrap,
tracked/transactional upgrades, operator-issued revocable credentials, disabled insecure
login/LTI handoff, dependency remediation and a CI-independent verification command.

## Prototype acceptance

- [x] Learner creates a private goal, then selects an existing approved quest.
- [x] Actual PlayCanvas canvas renders the reused task ScenePlan; pointer and keyboard
  observations are recorded locally, with explicit WebGL fallback and stop/reset.
- [x] Learner submits immutable reflection/evidence; only assigned educator can assess.
- [x] Learner sees feedback and can optionally submit independent satisfaction ratings.
- [x] Disabled flags, actor isolation, consent revocation, validation, ordering, retries,
  SQL persistence/rollback and browser flows verified; limitations recorded honestly.

## P0 — Before any use with real children / remote deployment

1. Verified authentication, server-side roles, revocation, restrictive CORS and rate limits.
2. Disable insecure LTI session minting; strict boolean flags in every legacy package.
3. Versioned migration runner; repair fresh bootstrap and upgrade compatibility tests.
4. Recompute quest moderation on save, assignment-role checks and explicit mentor consent.
5. Retention/deletion/export, safeguarding escalation and reviewed moderation policy.
6. AI egress redaction, cost/deadline controls and explicit tool permission enforcement.
7. Upgrade dependency/security review (including existing Next.js baseline).

## P1 — Product quality

1. Goal-driven draft generation through existing composer + parent/educator approval UI.
2. Multi-attempt evidence, teacher rubrics and evidence-linked mastery with skill taxonomy.
3. Learner portfolio overview, goal revision/withdrawal and educator review inbox.
4. Cohort-threshold satisfaction aggregates and opt-out/retention policy, never grade input.
5. Richer curated PlayCanvas templates, accessibility audit, content validation and mobile
   GPU/performance budgets. Full XR is a separate opt-in project.
6. Maintain repeatable local PostgreSQL/route/browser verification; CI is optional.

## P2 — Existing platform hardening (separate changes)

- Atomic campaign allocations, stable ledger pagination and reconciliation.
- Compute leases, bounded retries, immutable finalization and traceable validator rewards.
- Verified sandbox LTI/OAuth/roster/LMS/badge flows; no scaffold described as live.
- Commons authoring/discovery quality and privacy-preserving impact attribution.
