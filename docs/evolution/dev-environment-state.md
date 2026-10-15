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

## Approved dev deployment

The user explicitly approved the restricted synthetic-data dev deployment after an
explanation of the build-tool advisory. This is not production approval or approval
for paid-plan upgrades. The audit finding remains visible and is not suppressed.

- App: <https://headstrong-preview-web.wbiggers60.workers.dev/learn>.
- API Worker: `headstrong-preview-api`, no public workers.dev route or version URL.
- Web Worker: `headstrong-preview-web`, workers.dev enabled only behind the owner-only
  Access app above; version URLs remain disabled. Both synthetic-only flags are enabled
  for this specifically selected dev account. Node loopback containment is unchanged.
- Hyperdrive `6d3d54166e67405a881e082339413cb3` (`headstrong-dev`) connects directly to
  this Supabase database with `headstrong_preview_api`, TLS required, query caching
  disabled, and origin connection limit 5. Cloudflare successfully validated credentials.
- Runtime password and JWT signing secret were generated locally without printing values.
  JWT_SECRET is confirmed as a Cloudflare `secret_text` binding. Neither secret is committed.
- Seeded three synthetic `.example.test` accounts and approved quest
  `1796fc7e-a353-416f-ae49-b63015b7fd02`. Seed data came from the existing offline seed CLI
  in a disposable local DB and was imported through MCP into the empty remote database
  atomically. No real learner information or hosted AI was used.
- Operator credentials are local-only mode-0600 files, ignored by git:
  `.dev.vars.headstrong-operator.json` (runtime DB password/signing secret), and
  `.dev.vars.headstrong-demo.json` (one-hour registered synthetic-account bearer tokens).
  Do not upload these files, put tokens into URLs, or share the operator signing secret.
- No paid-plan upgrade, production resource change, CI requirement or merge.

### Hosted validation

- Signed-out requests to HTML, CSS and API redirect to Access (302), rather than serving
  app content. The direct API workers.dev URL returns 404; both version URLs are disabled.
- Existing owner Cloudflare-account sign-in completed in the browser. `/learn` renders
  with styles and enabled/hydrated token input; no page console errors after the asset fix.
- The first hosted browser check caught a CSS/JS asset-dispatch failure in the custom
  entry. Added explicit ASSETS dispatch **after** gateway Access verification and a
  regression test. It does not bypass Access or expand permitted routes.
- An authenticated operator used Wrangler's temporary remote service-binding proxy
  (not a new public API route) to call the **deployed API Worker**. Passed goal creation,
  pre-selection educator isolation (403), approved quest selection, evidence, educator
  feedback, optional satisfaction, duplicate rejection (409), guardian read, and immediate
  token revocation (204 logout followed by 401). This used actual hosted Hyperdrive/SQL.
  Synthetic verification records remain for inspection; nothing was deleted to hide tests.
- Full clean-checkout verification before deploy: all 16 functional/runtime/build/browser/
  production-audit checks passed; complete toolchain audit still exited 1 for the advisory.
- Actual interactive PlayCanvas/WebGL journey in the hosted browser still needs a manual
  demo pass with the supplied learner token; both local browser renderers passed that flow.

## Deployment gate

The complete toolchain audit still reports unpatched `braces@3.0.3`
([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)) in vinext's
build-time glob dependencies. Latest version rechecked: 3.0.3. Functional checks
passed, but the full audit is not green. The user accepted this specific risk for
private synthetic development only. Build only trusted code; revisit this decision
when the dependency changes. Do not suppress the audit, deploy to production, or
select paid services by default.

## Closing the dev preview

Deny/remove the owner Access policy or disable the preview flags and redeploy to stop
access. Revoke registered sessions separately; deleting a local token file does not revoke
it. Worker rollback does not roll back database changes. Keep the API nonpublic, and keep
Hyperdrive caching off so guardian and session changes take effect on the next request.
