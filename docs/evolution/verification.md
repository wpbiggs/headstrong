# Test and security verification report — 2026-10-14

## Result

Local prototype verified. **Not production-ready, not a complete education platform, and
not an approval to deploy or use real children’s data.** Existing uncommitted campaign,
compute, commons and integration work was preserved and excluded from this slice’s commit.
An independent detached checkout of the committed slice was installed offline with the
frozen lockfile and rechecked, so these results do not depend on that inherited work.

## Executed checks

| Check | Outcome |
| --- | --- |
| `pnpm lint` | Pass; clean-checkout validation found one pre-existing test-format defect, fixed without including inherited behavioral changes |
| `pnpm typecheck` | Pass; includes new API fixtures/integration and browser test sources |
| `pnpm test` | 51 passing root-suite tests (44 API, 7 integration-package scaffold tests) |
| Extra ledger/LMS package tests | 7 pass; these are omitted by the existing root test command |
| `test:learning:integration` | 7 pass against a uniquely named disposable local PostgreSQL 17 database; database removed afterward |
| `test:learning:browser` | 2 pass with local Chrome/Playwright against both dev and a locally served production web build: full journey, keyboard controls, stop/resume, session clearing, mobile width, WebGL-failure alternative |
| `pnpm build` with explicit public fixture env | Pass across 15 packages; existing Turbo warnings about packages with no emitted build outputs remain |
| `pnpm audit --prod --json` | Fails: registry reports 2 critical, 24 high, 47 moderate and 5 low vulnerability occurrences; dependency remediation is a release blocker |

The registry audit includes existing Next.js, Hono, PostCSS, Twilio transitive dependencies
and others; counts do not establish exploitability on this host. No dependency auto-fix or
major framework upgrade was performed. New direct dependencies are free MIT PlayCanvas
2.23.2 and dev-only Apache-2.0 Playwright 1.64.1; no hosted subscription was used.

## Security and persistence cases

- Missing token → 401; disabled routes → 404; malformed IDs/input → 400; oversized body → 413.
- Default/`false` flag disabled; malformed booleans fail; remote bind and production
  enablement rejected. New UI never bootstraps roles from an email or stores bearer tokens.
- Unrelated learner/educator and blanket admin reads denied. Guardian/educator access
  begins only after learner selects the approved quest. Guardian unlink revokes adult
  record access and removes the active experience; learner retains their own history.
- Warned/review-required quest cannot launch. Evidence rejects unrelated entity IDs.
- Feedback requires evidence and the assigned educator; satisfaction requires feedback
  and owning learner. Duplicates cannot overwrite any of these records.
- Two concurrent evidence submissions yield 201 and 409, with exactly one database row.
- Audit failure rolls back goal creation; learning audit payloads contain no private text.
- Existing real SQL quest persistence initially failed due to double-serialized JSONB;
  fixed in the reused quest/scene/event/audit paths, verified by real quest creation and
  parent approval. The fixture does not insert a fabricated already-approved quest.
- Browser test asserts no uncaught page errors through the complete loop; caught a GPU
  cleanup ordering defect during development and verifies the fix. Canvas/GPU cleanup
  occurs on stop and after evidence. No external assets or inference are requested.
- Legacy `0006` missing-column and `educator_reviewed` constraint defects are reproduced
  in the disposable integration database, not silently marked as successful migrations.

## Reproduce

Install free dependencies with `pnpm install --ignore-scripts`.

```sh
# Use your local PostgreSQL admin identity, only against /postgres on loopback.
TEST_DATABASE_ADMIN_URL=postgres://YOUR_LOCAL_USER@127.0.0.1:5432/postgres \
  pnpm --filter @headstrong/api test:learning:integration

# Terminal 1: disposable seeded API, no legacy routes or real identities.
TEST_DATABASE_ADMIN_URL=postgres://YOUR_LOCAL_USER@127.0.0.1:5432/postgres \
  pnpm --filter @headstrong/api test:learning:serve

# Terminal 2: local web with prototype page enabled.
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 \
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 \
NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS=true \
  pnpm --filter @headstrong/web dev --hostname 127.0.0.1

# Terminal 3: installed Chrome, or use Playwright's own installed Chromium.
PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  pnpm test:learning:browser
```

Stop the fixture API with SIGINT/SIGTERM to remove its disposable database. Test-only
`/__fixture` exposes synthetic credentials on loopback; it is never mounted in the real API.
Browser captures are in ignored `test-results/`, not committed learner records.

## Incomplete functionality / blockers

- Goal-driven generation is not implemented: learner selects an existing approved quest
  produced by the existing quest workflow. There is no integrated parent approval UI in
  `/learn`; tests seed via real existing quest service transitions.
- PlayCanvas renders primitive inspection templates, not authored fraction simulations,
  imported assets, physics, narration, VR or full XR. Keyboard alternative is tested;
  screen-reader certification, real device matrix and pointer accuracy need further audit.
- Evidence is one private text portfolio artifact per goal. No file uploads, rubric/skill
  taxonomy, multiple attempts, mastery promotion, public portfolio or satisfaction analytics.
- Consent is existing guardian approval plus learner quest selection, not a complete
  legally reviewed mentorship consent system. No production identity/safeguarding guarantee.
- Existing full migration bootstrap is broken and no production upgrade was attempted.
  Tests intentionally apply quest prerequisites + the new migration, not all legacy tables.
- No LTI/LMS/roster/badge sandbox credential flow, AI gateway inference, MCP tool execution,
  campaign payout or distributed compute integration was exercised or claimed as working.
- No live data, production resource, paid API, deployment or merge was changed.

See `assessment.md`, `decisions.md` and `backlog.md` for the release blockers and next work.
