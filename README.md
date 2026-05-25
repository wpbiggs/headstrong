# Headstrong

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
