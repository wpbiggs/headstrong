# Trusted discovery inbox

Status: local release acceptance passed; private-preview rollout pending.

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
