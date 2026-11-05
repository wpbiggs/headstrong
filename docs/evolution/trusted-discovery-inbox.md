# Trusted discovery inbox

Status: pushed and deployed to the existing owner-only synthetic preview.
Actual OpenChamber Web inbox flow verified; not participant or production approval.

## Supporting the adventure

The optional footer opens a dedicated adult inbox, separate from default play,
the optional learner save page and the legacy saved workspace. It does not show
goal creation, quest-ID setup, a game player, learner evidence-entry forms or
learner satisfaction ratings. No response is required to continue playing.

An explicit Find action requests authorized record metadata, at most ten recent
approved records. A second explicit Open action reads the selected discovery.
The pending-only filter is local; it sends no reminder or learner notification.
Users can show previously replied records without overwriting existing replies.
Empty views explain the bounded scope rather than implying a complete roster.

The catalog now includes `viewerRole`, derived from the current authenticated
server session after the existing role check. The browser does not decode JWTs,
offer a role selector or accept an author ID to decide reply authority. Guardians
see only supportive encouragement; educators see feedback and an initially
unselected, required human assessment. Learner sessions see no adult tools.
All existing service-side authorization remains decisive on every read/write.

## Privacy and feedback boundaries

- Opening the panel or typing a token/draft makes no request. Tokens remain in
  memory. Clear connection, token change and leaving remove records and drafts;
  clearing local state does not claim to revoke the provisioned server session.
- Abort/epoch checks discard late responses after connection changes/unmount.
  Drafts are cleared before opening a different record. No notes or other island
  history are imported into the inbox.
- Current content approval is rechecked by existing services. If a loaded record
  has no available approved experience, the inbox offers no new reply form.
- Guardian comments require no educator assessment first, contain no assessment
  input, and remain separate. Educator assessment has no preselected value.
- Explicit submit sends only the chosen reply (and educator judgment where
  applicable) through existing immutable, moderated and audited endpoints.
  Neither reply type changes mastery or gates play. Interrupted replies instruct
  the user to refresh rather than assume an accepted write can be replaced.
- No schema, enrollment, Access, login, gateway allowlist or runtime grant changes.
  Operator-provisioned synthetic sessions remain a preview constraint, not safe
  participant enrollment or verified guardian consent.

## Local receipt and rollout order

Exact-source `WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` passed all 17
gates, including 79 primary tests, 7 additional tests, 19 PostgreSQL tests, both
built Worker/artifact tests, all 30 browser runs across Next/vinext and both clean
dependency audits. The earlier same-origin compiled-client regression still runs.

New browser tests verify no automatic requests, metadata-only discovery until
Open, guardian-only tools, no learner ratings, scoped empty results for an
unrelated educator, independent guardian/educator replies, no default assessment,
saved/pending views, clearing an unsent private draft on token change, clearing
learner/adult transitions, late catalog rejection, mobile width and leaving to
the paused island. Reviewed the local mobile feedback screenshot.

Missing files in the existing dependency installation initially prevented Biome
and Vite from running. A normal frozen-lockfile install did not repair them;
`pnpm install --frozen-lockfile --force` restored the existing locked packages.
No dependency version or lockfile change was made. Full acceptance ran after
repair; installation success was not substituted for test evidence.

Deploy API before web: old clients ignore the additional catalog field, while
the new inbox requires a server-confirmed role and fails closed if absent. No
migration is needed. The legacy workspace remains available for compatibility.
Enrollment, longer-world polish, real-participant evidence and deferred
credential rotation remain unfinished; the full objective is not complete.

## Hosted rollout receipt

- Source `1862478` pushed on the integration branch after acceptance. Deployed
  API first, version `0254a354-35db-4696-aadf-86f55277010d`, then verified web
  output, version `2cfc499b-f263-4333-bac1-b337778b4cab`. No migration, Access,
  user-role, enrollment or permission change was applied.
- The actual private API confirmed `viewerRole` as student/parent/educator for
  the matching registered test sessions and included the new synthetic record
  in their authorized catalogs. Record:
  `a1b0833b-f771-4242-8d8d-5efdc495c9c5`. No existing private record was edited.
- In the refreshed authenticated OpenChamber Web tab at 390px, explicitly opened
  the new inbox, connected as guardian, found/opened that discovery and submitted
  encouragement. The selected record disappeared from the pending list, the
  saved reply stayed readable, and no educator-assessment tool was present.
- Changing to the educator session cleared displayed records/replies. Find/Open
  loaded the same record with the guardian comment visible and an unselected
  human-assessment placeholder. Explicitly selected `needs_practice`, typed
  feedback and submitted. Both separate replies and the immutable-saved message
  appeared in the hosted mobile capture, which was inspected.
- Changing to a learner session and requesting records showed the learner-session
  explanation with no record-reading or adult-reply controls in this surface.
  Clear connection removed the credential and private view; returned to the
  paused island. This does not claim local clearing revokes a server session.
- All three newly provisioned, short-lived browser probe sessions were then
  revoked. Final database check: one guardian reply, educator `needs_practice`,
  no ratings and mastery count zero. Signing secrets and protected operator/demo
  configuration were not changed. No real participant data was used.
- Signed-out HTML, the actual new adventure JS bundle and record catalog still
  redirect to Access; direct API workers.dev returns 404. Synthetic-only flags
  and owner-only access scope remain unchanged.
- Ignored hosted evidence:
  `.openchamber/screenshots/trusted-inbox-hosted-feedback-2026-11-05T15-52-41-115.jpg`.
  Sanitized private-API setup receipt is in ignored
  `artifacts/local-verification/hosted-inbox-setup-report.json`.

The focused preview inbox addresses the overloaded adult workflow, not complete
onboarding or a full multi-learner roster. Authorized results remain bounded to
ten recent approved records. Participant enrollment/consent, longer adventure
polish, real-user play evidence and deferred credential rotation are still open.
