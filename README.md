# Headstrong

## Product direction and current status

The [Curiosityverse proposal (PR #2)](https://github.com/wpbiggs/headstrong/pull/2)
describes a game-first destination. The current implementation is a candidate platform
foundation and bounded PlayCanvas glider prototype, not that finished adventure game. See
[`docs/evolution/pr-reconciliation.md`](docs/evolution/pr-reconciliation.md) for the
relationship, verified scope, open decisions and recommended next milestone.

The source-only [Awakening prototype](docs/evolution/awakening-adventure.md) opens at
`/` or `/learn` when the existing learning feature flag is enabled: choose wings and
wind, fly, experiment again, and wake the island beacon. Play is synthetic/session-only;
reflection and the separate authorized saved workspace are optional. No deployment or
child testing is implied. The inherited fraction workbench remains local-only at
`/learn/studio`; the current protected gateway rejects that route.

Combined local workstream evidence and remaining release gates are recorded in
[`docs/evolution/curiosityverse-integration.md`](docs/evolution/curiosityverse-integration.md).

The [optional adventure-discovery save flow](docs/evolution/awakening-discovery-saving.md)
previews selected flights/notes before an explicit share to an approved Awakening
record. It never silently transfers notes to an unrelated quest, gates play or
awards mastery. Preview-only operator credentials/record setup are still required;
this is not participant-ready enrollment.

## Local verification (no CI required)

Cloudflare + Supabase preview preparation is available: run `pnpm verify:cloudflare` for
Worker builds/runtime checks plus both browser renderers. See
[`docs/evolution/cloudflare-supabase-preview.md`](docs/evolution/cloudflare-supabase-preview.md)
for the private-preview architecture, required account inputs and approval-only runbook.
Nothing is deployed automatically. The November 4 local security fix resolves the
runtime and toolchain findings; [both audits are clean](docs/evolution/dependency-security.md),
without suppressions. This does not update the hosted preview. The
[dev state record](docs/evolution/dev-environment-state.md) distinguishes the older
approved hosted preview from the newer source-only studio redesign.

Run `pnpm verify:local` for local tests, full disposable-database migration checks, build,
browser acceptance and dependency auditing. It requires local PostgreSQL and Chrome or
Playwright Chromium; it never migrates the existing application database. Failures are
recorded in `artifacts/local-verification/report.json` and produce a nonzero exit code.

Public email/role login is removed. For local operator-issued credentials, migration
baselining instructions and known compatibility limits, see
[`docs/evolution/local-hardening.md`](docs/evolution/local-hardening.md).

Headstrong/FibonaccNet monorepo: an evolving learner-platform prototype alongside
adjacent integration scaffolds. Neither a working slice nor a roadmap implies that
the complete product is implemented or approved for use with children.

## Workspace

- `apps/web`: Next.js web app with a simple XR capability gallery.
- `apps/api`: Hono API with auth baseline, shared contracts, and a migration runner.
- `packages/core`: domain schemas, auth/session types, API contracts, and env validation.
- `packages/ai-gateway`: OpenAI-compatible local inference adapter surface.
- `packages/moderation`: moderation labels and baseline rule checks.
- `packages/messaging`: Twilio integration surface.
- `packages/lms-adapters`: Moodle and ERPNext adapter stubs.

## Quick start

1. Copy `.env.example` to `.env` and fill the required values.
2. Run `docker compose up -d`.
3. Run `pnpm install`.
4. Run `pnpm db:migrate`.
5. Run `pnpm dev`.
