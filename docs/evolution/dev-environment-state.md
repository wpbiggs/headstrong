# Headstrong dev environment — 2026-10-15 UTC

This records actual account setup; the general preview runbook remains in
[`cloudflare-supabase-preview.md`](cloudflare-supabase-preview.md).

## Applied and verified

- Cloudflare account: `b7019b91654de6e62fb986cd0864cba2` (wbiggers60@gmail.com).
- Access organization: `crimson-forest-2c4e.cloudflareaccess.com`.
- Supabase project: `headstrong-dev`, ref `olysjweuyclriueuoyhv`, us-east-2.
- Fresh bootstrap through MCP: `headstrong_dev_bootstrap_and_security` applied the
  14 existing migration files and preview security rules in one migration. The
  `headstrong_migrations` ledger stores the SHA-256 checksums of the original files,
  with `baselined=false`; this was a fresh bootstrap, not a legacy baseline.
- Verified 29 public application tables, all with RLS enabled, zero table grants
  to `anon`/`authenticated`, and zero application accounts. Runtime role is
  `headstrong_preview_api`, without owner/superuser/BYPASSRLS permissions.
- User reports disabling Data API; a publishable-key REST probe was rejected (401).
  Dashboard settings were not independently visible in the agent's browser login.
- Supabase security advisor: no WARN/ERROR findings. Its 18 INFO notices about RLS
  tables without policies are intentional deny-by-default for unused domains/history:
  [RLS without policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Access application `c45c16e0-7c4d-470d-8bb6-62597a3609c6` covers the whole intended
  `headstrong-preview-web.wbiggers60.workers.dev` hostname. Reusable allow policy
  `dec1615a-3e3e-46b6-aa66-952160c76533` admits only `wbiggers60@gmail.com` through
  the existing Cloudflare-account identity provider, with a one-hour session.
  No bypass policies, broad domain rules, or changes to unrelated apps were made.
- Source Wrangler configurations now select this Cloudflare account and Access
  issuer/audience. Both feature flags and public Worker URLs remain disabled.

## Not yet applied

- Runtime database password, Hyperdrive, JWT secret, synthetic accounts/quest and
  Worker uploads/deployments. No application is serving at the intended hostname yet.
- No paid-plan upgrade or production resource changes.
- Actual Access sign-in, hosted database connections/Hyperdrive freshness and learner
  flow must still be verified after an explicitly approved deployment.

## Deployment gate

The complete toolchain audit still reports unpatched `braces@3.0.3`
([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)) in vinext's
build-time glob dependencies. Latest version rechecked: 3.0.3. Functional checks
passed previously, but the full audit is not green. Obtain explicit approval for
this restricted synthetic dev deployment with that known issue, or wait for a fix.
Do not suppress the audit, deploy to production, or select paid services by default.
