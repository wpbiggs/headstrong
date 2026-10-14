# Prioritized implementation backlog

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
6. CI PostgreSQL migration/route tests and browser tests on supported runners.

## P2 — Existing platform hardening (separate changes)

- Atomic campaign allocations, stable ledger pagination and reconciliation.
- Compute leases, bounded retries, immutable finalization and traceable validator rewards.
- Verified sandbox LTI/OAuth/roster/LMS/badge flows; no scaffold described as live.
- Commons authoring/discovery quality and privacy-preserving impact attribution.
