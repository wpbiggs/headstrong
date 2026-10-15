# Headstrong

## Local verification (no CI required)

Cloudflare + Supabase preview preparation is available: run `pnpm verify:cloudflare` for
Worker builds/runtime checks plus both browser renderers. See
[`docs/evolution/cloudflare-supabase-preview.md`](docs/evolution/cloudflare-supabase-preview.md)
for the private-preview architecture, required account inputs and approval-only runbook.
Nothing is deployed automatically. The expanded toolchain audit currently reports one
unpatched build-time advisory; it is not suppressed.

Run `pnpm verify:local` for local tests, full disposable-database migration checks, build,
browser acceptance and dependency auditing. It requires local PostgreSQL and Chrome or
Playwright Chromium; it never migrates the existing application database. Failures are
recorded in `artifacts/local-verification/report.json` and produce a nonzero exit code.

Public email/role login is removed. For local operator-issued credentials, migration
baselining instructions and known compatibility limits, see
[`docs/evolution/local-hardening.md`](docs/evolution/local-hardening.md).

Minimal Phase 0 monorepo scaffold for Headstrong and FibonaccNet.

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
