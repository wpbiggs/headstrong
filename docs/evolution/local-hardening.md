# Local operation and hardening

This supersedes the migration/authentication findings in the original prototype report
where explicitly marked below. It does **not** authorize deployment or use with real children.

## No CI account is required

Run `pnpm verify:local`. It runs lint, type checks, unit tests (including the previously
omitted ledger/LMS tests), full-schema PostgreSQL integration tests, a sequential build,
browser acceptance against disposable fixtures, and the production dependency audit.

- Defaults to the current OS user's loopback PostgreSQL `/postgres` admin database.
  Override with `TEST_DATABASE_ADMIN_URL` if needed. Non-loopback databases are rejected.
- Requires permission to create/drop disposable databases; never migrates the application's
  configured `DATABASE_URL`. The test fixture overwrites app env with synthetic values.
- Uses installed Chrome on macOS, `PLAYWRIGHT_CHROME_PATH`, or installed Playwright Chromium.
- Refuses occupied ports 3000/4000 before altering build output; it never stops your servers.
- Stops only its own server process groups and removes its own disposable databases.
- Writes machine-readable results to ignored `artifacts/local-verification/report.json`,
  security findings to `security-audit.json`, and browser captures to `test-results/`.
- Any failed or skipped check makes the command fail. **Known dependency advisories are
  not waived**: a failed security audit means the overall result is not green even when
  tests pass. No billing setting, CI runner or production resource is required.

## Migration safety

`pnpm db:migrate` now records migration filenames and SHA-256 checksums, serializes runners
with a PostgreSQL advisory lock, and applies each file + history entry in one transaction.
Repeated runs do not replay files; missing/edited applied files and out-of-order additions
are refused. A failed file rolls back its DDL and can be retried after correction.

Fresh bootstrap now covers every migration, not just quest prerequisites. Fixes:

- 0006 supports fresh `state` schemas and historical `status` schemas.
- 0011 converts existing `validated` jobs before adding the new status constraint.
- 0013 permits `educator_reviewed`, adds `next_attempt_at`, and unwraps old JSONB strings
  in quest/task/event/audit records. Malformed legacy JSON fails the transaction for review.
- 0014 adds revocable server-side authentication sessions.

The historical 0006/0011 edits repair the previously unversioned baseline before adopting
checksums. **Once tracked, migration files must not be edited.** Add a new file instead.

An existing untracked database is refused without changing it. After independently
inspecting a backup and confirming the last fully applied file, an operator can explicitly
baseline it, for example:

```sh
pnpm --filter @headstrong/api migrate --baseline-through=0009_compute_jobs.sql
```

This is an assertion by the operator, **not automatic schema certification**. Never guess
the boundary. No existing application database or production upgrade was attempted here.
Upgrade tests use disposable schemas and preserve a real legacy `validated` job.

## Self-hosted access credentials

The public `/auth/login` email/role bootstrap returns **410** and never creates an account
or issues credentials. Unverified LTI login/callback routes return **501**, regardless of
legacy flags; scaffolds cannot mint real sessions or trigger issuer discovery through HTTP.

For local fixture/operator use, a trusted operator with database/JWT-secret access issues
one-hour access tokens using existing account roles:

```sh
pnpm --filter @headstrong/api auth:token issue learner@example.test student
pnpm --filter @headstrong/api auth:token revoke-user USER_UUID
```

Issuing for a new email provisions that role; an existing role cannot be changed by this
command. The token is a secret printed deliberately to stdout: transfer it securely and
never put it in source control, browser URLs, issue comments or logs. `/learn` holds it only
in tab memory. `POST /auth/logout` revokes the current credential.

Every authenticated request validates HS256, issuer, audience, expiration and a live
database session joined to the current account role/email. Revocation, account deletion,
expiration or an account-role mismatch invalidate access. Old seven-day/unregistered JWTs
are intentionally invalidated. Database access is now required to authenticate requests.

**Compatibility impact:** older operator/dashboard helpers still relying on email/role
login no longer authenticate. They need a token-aware session UI before live use; do not
silently re-enable the old login to make those helpers work. Their demo fallbacks are not
live verification. The learner prototype already accepts a provisioned bearer token.

This is operator-provisioned access, not a full child-facing identity product: enrollment,
secure credential delivery, recovery, MFA/passkeys, rotation, audit/retention policy,
restrictive CORS and rate limits remain release requirements. There is no paid identity,
email, SMS or external inference dependency in this slice.

## Dependency remediation and verification — 2026-10-15 UTC

Upgraded Next.js to 16.4.1, React/React DOM to 19.3.1, Hono to 4.13.13 and the Node adapter
to 2.1.5, and refreshed compatible dependency ranges/lockfile (including Twilio's dependency
tree). Node >=20.9 is required. Promise-based Next.js route/search parameters are awaited;
Webpack remains explicit to avoid changing bundlers as part of a security update. Type
checking runs `next typegen` first so a clean checkout does not depend on an earlier build.

`pnpm verify:local` completed with exit code **0**:

| Check | Result |
| --- | --- |
| Lint and type checking | Pass |
| Root unit/scaffold suite | 54 tests pass |
| Additional ledger/LMS tests | 7 tests pass |
| PostgreSQL integration | 11 tests pass, full 14-file migration history |
| Build | Pass |
| Playwright/local Chrome | 2 tests pass against the upgraded local production web build |
| Production dependency audit | Pass: 0 reported vulnerabilities at verification time |

Database tests include fresh/historical social schemas, explicit legacy baseline, validated
job conversion, JSONB recovery, migration concurrency/checksums/DDL rollback, token role
binding/expiry/revocation/account deletion, and the entire learning journey. Local servers
were stopped and disposable databases removed afterward. These are local checks, not a
security certification, live integration validation or a production deployment.
