"use client";

import {
  type LearningJourneyDetail,
  learningJourneyDetailSchema,
  learningRecordChoicesSchema,
} from "@headstrong/core";
import { useEffect, useRef, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
type Catalog = ReturnType<typeof learningRecordChoicesSchema.parse>;
type Role = Catalog["viewerRole"];

export function TrustedDiscoveryInbox({ onBack }: { onBack: () => void }) {
  const [token, setToken] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [records, setRecords] = useState<Catalog["items"]>([]);
  const [detail, setDetail] = useState<LearningJourneyDetail | null>(null);
  const [comment, setComment] = useState("");
  const [assessment, setAssessment] = useState("");
  const [pendingOnly, setPendingOnly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const epoch = useRef(0);
  const active = useRef<AbortController | null>(null);
  const lock = useRef(false);
  useEffect(
    () => () => {
      epoch.current++;
      active.current?.abort();
    },
    [],
  );

  function clear() {
    epoch.current++;
    active.current?.abort();
    setRole(null);
    setRecords([]);
    setDetail(null);
    setComment("");
    setAssessment("");
    setError("");
    setMessage("");
    setBusy(false);
    setPendingOnly(true);
  }

  async function run(action: "find" | "open" | "reply", id?: string) {
    if (lock.current) return;
    lock.current = true;
    const version = epoch.current;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!token.trim())
        throw new Error("A provisioned synthetic session is required.");
      async function request(path: string, body?: unknown) {
        const response = await fetch(`${apiUrl}/learning${path}`, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (version !== epoch.current || controller.signal.aborted)
          throw new Error("Connection changed.");
        if (!response.ok)
          throw new Error(result.error ?? "The discovery is unavailable.");
        return result;
      }
      if (action === "find") {
        // Role is supplied by the current authenticated server session, never by
        // decoding unverified token claims or offering a browser role selector.
        const catalog = learningRecordChoicesSchema.parse(
          await request("/goals"),
        );
        setRole(catalog.viewerRole);
        setRecords(catalog.items.filter((item) => item.hasEvidence));
        setDetail(null);
        setComment("");
      } else if (action === "open" && id) {
        setDetail(null);
        setComment("");
        setAssessment("");
        setDetail(
          learningJourneyDetailSchema.parse(await request(`/goals/${id}`)),
        );
      } else if (action === "reply" && detail) {
        if (role !== "parent" && role !== "educator")
          throw new Error("Only an authorized trusted adult may reply here.");
        const suffix = role === "parent" ? "guardian-feedback" : "feedback";
        await request(
          `/goals/${detail.journey.id}/${suffix}`,
          role === "parent" ? { comment } : { comment, assessment },
        );
        const updated = learningJourneyDetailSchema.parse(
          await request(`/goals/${detail.journey.id}`),
        );
        setDetail(updated);
        setComment("");
        setRecords((items) =>
          items.map((item) =>
            item.id === updated.journey.id
              ? {
                  ...item,
                  hasGuardianFeedback: !!updated.journey.guardianFeedback,
                  hasEducatorFeedback: !!updated.journey.feedback,
                }
              : item,
          ),
        );
        setMessage(
          "Your reply was saved. It does not gate play or award mastery.",
        );
      }
    } catch (reason) {
      if (version === epoch.current && !controller.signal.aborted)
        setError(reason instanceof Error ? reason.message : "Request failed.");
    } finally {
      lock.current = false;
      if (version === epoch.current) setBusy(false);
      if (active.current === controller) active.current = null;
    }
  }

  const adult = role === "parent" || role === "educator";
  const needsReply = (item: Catalog["items"][number]) =>
    role === "parent" ? !item.hasGuardianFeedback : !item.hasEducatorFeedback;
  const visible = records.filter((item) => !pendingOnly || needsReply(item));
  const replied =
    role === "parent"
      ? !!detail?.journey.guardianFeedback
      : !!detail?.journey.feedback;

  return (
    <main className="awakening connected-record trusted-inbox">
      <button type="button" onClick={onBack}>
        ← Back to paused island
      </button>
      <h1>Trusted discovery inbox</h1>
      <p>
        Read what a learner chose to share. Offer a human response, not a score
        inferred from play. Opening this inbox sends nothing; the adventure
        never requires a reply.
      </p>
      <section className="learning-journey">
        <h2>Private preview connection</h2>
        <p>
          Synthetic accounts only. Use your provisioned educator or guardian
          session. It stays in memory; changing or clearing it removes displayed
          discoveries and drafts. Access admission alone grants no application
          role.
        </p>
        <label>
          Trusted adult token
          <input
            aria-label="Trusted adult token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => {
              clear();
              setToken(event.target.value);
            }}
          />
        </label>
        <div className="choice-row">
          <button
            type="button"
            disabled={busy || !token.trim()}
            onClick={() => void run("find")}
          >
            Find discoveries shared with me
          </button>
          <button
            type="button"
            onClick={() => {
              clear();
              setToken("");
            }}
          >
            Clear connection
          </button>
        </div>
      </section>
      <output aria-live="polite">
        {busy ? "Checking authorized discoveries…" : message}
      </output>
      {error && (
        <p role="alert">
          {error} Refresh before retrying an interrupted reply; an accepted
          reply cannot be overwritten.
        </p>
      )}
      {role === "student" && (
        <p>
          This is a learner session. Return to the island’s optional save page
          to read feedback. No adult reply tools are available.
        </p>
      )}
      {adult && (
        <>
          <section
            className="inbox-records"
            aria-label="Discoveries shared with you"
          >
            <h2>
              {role === "parent"
                ? "Guardian encouragement"
                : "Educator feedback"}
            </h2>
            <p>
              {role === "parent"
                ? "Support curiosity without grading. No educator assessment is needed first."
                : "Review the selected evidence yourself. A flight or seed result is not proof of mastery."}{" "}
              Recent approved records only, at most ten; this is not a complete
              enrollment roster.
            </p>
            <label>
              <input
                type="checkbox"
                checked={pendingOnly}
                onChange={(event) => setPendingOnly(event.target.checked)}
              />{" "}
              Awaiting my reply only
            </label>
            {!visible.length && (
              <p>
                No saved discoveries match this view. You can show replied
                records or refresh; no reminder is sent to the learner.
              </p>
            )}
            <ul className="inbox-record-list">
              {visible.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={detail?.journey.id === item.id}
                    onClick={() => void run("open", item.id)}
                  >
                    <strong>{item.objective}</strong>
                    <span>
                      {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                      {item.id.slice(0, 8)} ·{" "}
                      {needsReply(item)
                        ? "Awaiting your reply"
                        : "Your reply saved"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {detail && (
            <section
              className="inbox-discovery learning-journey"
              aria-label="Selected shared discovery"
            >
              <h2>The learner’s selected discovery</h2>
              <p className="inbox-evidence">
                {detail.journey.evidence?.reflection}
              </p>
              {detail.journey.feedback && (
                <section>
                  <h3>Educator feedback</h3>
                  <p>{detail.journey.feedback.comment}</p>
                  <p>Human assessment: {detail.journey.feedback.assessment}</p>
                </section>
              )}
              {detail.journey.guardianFeedback && (
                <section>
                  <h3>Guardian encouragement</h3>
                  <p>{detail.journey.guardianFeedback.comment}</p>
                  <p>Encouragement is not an assessment or proof of mastery.</p>
                </section>
              )}
              {!detail.experience ? (
                <p>
                  Current approval or content clearance needs attention. No new
                  reply is available.
                </p>
              ) : replied ? (
                <p>Your reply is already saved and cannot be overwritten.</p>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run("reply");
                  }}
                >
                  <h3>
                    {role === "parent"
                      ? "Leave encouragement"
                      : "Leave educator feedback"}
                  </h3>
                  {role === "educator" && (
                    <label>
                      Human assessment
                      <select
                        aria-label="Inbox human assessment"
                        required
                        value={assessment}
                        onChange={(event) => setAssessment(event.target.value)}
                      >
                        <option value="">
                          Choose after reviewing the evidence
                        </option>
                        <option value="needs_practice">Needs practice</option>
                        <option value="demonstrated">Demonstrated</option>
                      </select>
                    </label>
                  )}
                  <label>
                    {role === "parent"
                      ? "Supportive reply"
                      : "Educator response"}
                    <textarea
                      aria-label="Inbox reply"
                      required
                      minLength={5}
                      maxLength={2000}
                      value={comment}
                      disabled={busy}
                      onChange={(event) => setComment(event.target.value)}
                    />
                  </label>
                  <p>
                    Only this reply
                    {role === "educator" ? " and your human assessment" : ""}{" "}
                    will be submitted to the selected record. It will be visible
                    to the learner and currently authorized adults. Nothing is
                    sent while you type.
                  </p>
                  <button
                    type="submit"
                    disabled={
                      busy ||
                      !detail.journey.evidence ||
                      comment.trim().length < 5 ||
                      (role === "educator" && !assessment)
                    }
                  >
                    Send my reply once
                  </button>
                </form>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
