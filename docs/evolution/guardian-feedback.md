# Trusted guardian encouragement

Status: local acceptance passed; private-preview rollout is recorded below.
Not production or participant-test approval.

## Product boundary

A currently linked guardian may leave one supportive reply on a discovery the
learner chose to save. It is separate from educator assessment, requires no
educator assessment first, never updates mastery, and never gates play, retry,
world changes, saving another discovery or a satisfying stopping point.

The existing optional saved workspace offers the guardian form. The adventure's
optional save page can refresh and display the reply. No guardian form appears
on default adventure entry. Operator token/record provisioning remains private
preview machinery, not finished child-friendly enrollment.

## Authorization and persistence

- `POST /learning/goals/:id/guardian-feedback` accepts only a bounded comment.
  Author ID, role and assessment fields are not accepted from the browser.
- The current registered session must be the quest's parent, with a current
  guardian link. The quest must still be live, approved, assigned to an educator
  and safety-cleared. A saved discovery is required; an educator assessment or
  child rating is not.
- Learner, unrelated student, educator and admin sessions cannot impersonate a
  guardian. No admin override for private reflections is introduced.
- The owning goal is locked before checking/writing children. The primary key
  permits one reply, concurrent repeats yield one success, and the API never
  overwrites an earlier comment. Comment and content-free audit write share one
  transaction; audit failure rolls the comment back.
- Existing private-read rules apply: learner, assigned educator and current linked
  guardian only. Revoking the link blocks subsequent guardian/educator access and
  new activity; it does not silently delete the learner's historical records.
- The new table has RLS enabled and no PUBLIC/browser access. Only the existing
  server-only preview role receives SELECT/INSERT, not UPDATE/DELETE. As elsewhere
  in this preview, per-person authorization is enforced by the services; the shared
  backend role is not represented as a per-person RLS identity.
- Reply moderation uses the existing safeguarding text check. Audit payloads never
  contain the private reply. The guardian table has no assessment/mastery column
  or mastery trigger.

## Rollout

1. Keep all previous migrations unchanged. Apply `0015_guardian_feedback.sql`
   through the repository's checksum-tracked migration workflow. This project has
   its own runner and `apps/api/migrations`, not a Supabase CLI schema directory.
2. For the existing dedicated synthetic preview, apply the additive
   `infra/supabase/guardian-feedback-preview.sql` after the table exists. It checks
   the synthetic configuration and runtime role, revokes browser access, and grants
   only the new table privileges. Do not rerun broad bootstrap scripts against an
   unrelated/shared database.
3. Deploy API before web. The web gateway adds only the exact guardian-feedback
   suffix under existing Access, rate-limit, origin and bearer-session checks;
   no broad `/learn/*`, platform or provisioning route is allowed.
4. Verify actual private API reply/read/denial behavior and fresh advisory output.
   Do not enable real participants or broaden Access as part of this rollout.

The additive table is compatible with old API/web code. If code must be rolled
back, retain the table and replies; do not drop saved learning evidence to make
old code run. New writes will be unavailable behind an old gateway/API, and old
clients will not display the new field.

## Tests to retain

The local suite covers role denial, forged author/assessment fields, missing
evidence, safeguarding rejection, changed content approval, concurrent duplicate
submissions, audit rollback, revoked guardian access, guardian reads without
assessment, zero mastery changes and forbidden direct server-role update/delete.
The additive role script is tested twice for repeatable application. Browser
coverage uses the actual guardian form then refreshes the reply from the optional
adventure page, without requiring a rating or altering play.

The previously deferred credential-rotation task is unchanged. Passing this
increment's tests does not establish production safeguarding, complete enrollment
or a polished adventure world.

## Acceptance receipt

- Final exact-source `WRANGLER_SEND_METRICS=false pnpm verify:cloudflare` passed
  all 17 gates: 76 primary tests, 7 additional tests, 18 PostgreSQL tests, all 18
  browser runs on Next/vinext, Worker access/runtime/build checks and both
  zero-finding dependency audits.
- The first browser run submitted and displayed the reply, then timed out on a
  back-button selector that omitted the visible arrow while demanding an exact
  match. Fixed the selector, not the timeout or the privacy assertions, and reran
  the whole suite. Raw failure and repeat logs are retained.
- Short emoji-only replies are rejected by the contract before PostgreSQL's
  character-length constraint; unsupported author/assessment fields are rejected
  rather than silently accepted. The final database matrix covers this too.
- Reviewed the actual mobile screenshot showing distinct educator feedback and
  guardian encouragement, including the explicit no-assessment/no-mastery copy.
  Screenshot credentials are masked. Default game-entry/privacy tests still pass.
