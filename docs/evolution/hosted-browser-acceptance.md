# Hosted adventure acceptance in OpenChamber Web

Status: verified against the owner-only synthetic preview on 2026-11-05.
This supersedes earlier receipts' unperformed-hosted-browser and black-capture
limitations for the specific flows and viewport described here, not for all
browsers/devices or participant readiness.

## Real defect found and fixed

Using the existing authenticated OpenChamber Web tab, the adventure rendered but
Find returned `Failed to fetch`. Inspection of the actual deployable client
bundle found `http://127.0.0.1:4000` compiled into both learning clients.
The verification runner intentionally supplies that environment to loopback
browser fixtures. vinext's config hook collects `NEXT_PUBLIC_*` from process.env
and overrode the Vite define intended to select `/api` for the Cloudflare build.

Prior local browser tests and direct hosted API checks were valid for those
boundaries but did not establish an end-to-end deployed browser connection. This
acceptance attempt demonstrated why they must not be reported as equivalent.

`apps/web/vite.config.ts` now pins the two public preview settings in its own
Vite process before vinext collects them. It changes no user shell/configuration,
secrets or separate loopback fixture config. The production API prefix is `/api`.
A new built-artifact regression test checks both emitted learning client modules
for that literal prefix and rejects the fixture loopback API origin. It failed
against the previous release artifact before the fix and passed after rebuild
under the same inherited fixture environment.

Exact-source `WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` passed all 17
gates, including 79 primary tests, 19 PostgreSQL tests, 26 browser runs, two built
Worker/artifact tests and clean dependency audits. Source fix `ea2fbb8` was pushed
before deploying verified web output, version
`e0460936-dc3a-42d4-90b2-07cb41043461`. API version remains
`2c0049fe-8af1-439a-8de8-a560967487ca`. No schema, Access or account-policy change.

## Actual hosted browser flow

All interactions below used OpenChamber Web at the real private preview URL,
not a local renderer, mocked response, service-binding-only smoke or separate
Chrome login session:

1. Resumed the existing island. Captured and inspected the 1440×900 hosted view:
   the glider, soil islets, growing seedlings, trees and sleeping beacon are
   visible. The previously black screenshot did not reproduce; this is visual
   evidence, not merely a `PlayCanvas ready` label.
2. After deployment/reload, released one round seed in the gentle breeze. No
   flight, account token, quiz or reflection was required. Entered an optional
   synthetic private-note sentinel to test exclusion.
3. Opened optional saving, entered a temporary registered learner session and
   explicitly requested authorized choices. The actual approved Awakening option
   and saved-record picker loaded from the same-origin gateway.
4. Selected the adventure and only `Share seed experiments`. The exact preview
   contained the 2 m cove observation and no private note or flight history.
   Explicit Share created record `7d2d0c92-598c-4fa3-bb2b-675c508f75f8` and
   showed the accepted-save status with further sharing disabled.
5. Returned to the separate optional workspace. Entered a temporary guardian
   session, found the record in its authorized picker, loaded it and submitted
   supportive encouragement before any educator assessment.
6. Attempted educator feedback under that guardian session. The actual form
   response was `Only the assigned educator may assess evidence.` No assessment
   was written by that attempt.
7. Changed to the assigned educator session, found/loaded the record and manually
   submitted `needs_practice` feedback. This was a synthetic human-role acceptance
   action, not an inference from gameplay or a real child's assessment.
8. Returned to optional saving as the learner, rediscovered the saved record and
   refreshed. Both educator feedback and separate guardian encouragement appeared.
   Inspected a hosted 390×844 capture containing both replies and no-mastery copy.
9. Revoked all six temporary sessions from the failed pre-fix and successful
   post-fix attempts. Cleared displayed private state, re-entered the revoked
   learner token and requested choices: `Invalid session.` No record/feedback
   choices were shown. Cleared the input and returned to the paused island.

Database verification confirms one evidence row, seed-only content with the
private sentinel and flights excluded, one guardian reply preceding educator
feedback, `needs_practice` assessment, no optional ratings and mastery count zero
before/after. The short-lived probe credentials are now revoked; long-lived keys,
existing operator sessions and protected operator/demo files were not changed.

Signed-out HTML, the actual new adventure JS bundle, catalog and discovery paths
still redirect to Access. Direct API workers.dev returns 404. No login challenge
was bypassed, cookies exported or Access policy broadened. The separate Chrome
session was unnecessary; the user's existing authenticated OpenChamber tab worked.

## Evidence and remaining scope

Local ignored captures:

- `.openchamber/screenshots/hosted-seedwind-island-2026-11-05T01-27-52-988.jpg`
- `.openchamber/screenshots/hosted-discovery-human-feedback-confirmed-2026-11-05T01-40-43-680.jpg`

The initial capture proves visibility for this hosted renderer/viewport; it is
not universal GPU/device coverage. No real-child testing, complete enrollment,
guardian-consent onboarding, polished adult inbox or longer-world play study is
established. Deferred signing-secret/database-password rotation is still
unresolved. The overall Curiosityverse objective remains unfinished.
