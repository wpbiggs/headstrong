# Headstrong

## Product direction and current status

The [Curiosityverse proposal (PR #2)](https://github.com/wpbiggs/headstrong/pull/2)
describes a game-first destination. The current implementation is a candidate platform
foundation and small PlayCanvas sample, not that finished adventure game. See
[`docs/evolution/pr-reconciliation.md`](docs/evolution/pr-reconciliation.md) for the
relationship, verified scope, open decisions and recommended next milestone.

## Local verification (no CI required)

Cloudflare + Supabase preview preparation is available: run `pnpm verify:cloudflare` for
Worker builds/runtime checks plus both browser renderers. See
[`docs/evolution/cloudflare-supabase-preview.md`](docs/evolution/cloudflare-supabase-preview.md)
for the private-preview architecture, required account inputs and approval-only runbook.
Nothing is deployed automatically. The October 26 audits flag a runtime Zod advisory
and toolchain findings; neither audit is green and no findings are suppressed. The
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
