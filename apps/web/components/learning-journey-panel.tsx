"use client";

import {
  type LearningJourneyDetail,
  learningJourneyDetailSchema,
} from "@headstrong/core";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ExperiencePlayer } from "./experience-player";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export function LearningJourneyPanel() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [token, setToken] = useState("");
  const [goalId, setGoalId] = useState("");
  const [detail, setDetail] = useState<LearningJourneyDetail | null>(null);
  const [observed, setObserved] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stopped, setStopped] = useState(false);
  const sessionEpoch = useRef(0);

  async function request(path: string, body?: unknown) {
    const epoch = sessionEpoch.current;
    const response = await fetch(`${apiUrl}/learning${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
    const result = await response.json();
    if (epoch !== sessionEpoch.current)
      throw new Error("Session changed; previous response discarded.");
    if (!response.ok) throw new Error(result.error ?? "Request failed.");
    return result;
  }

  async function refresh(id: string) {
    const result = learningJourneyDetailSchema.parse(
      await request(`/goals/${id}`),
    );
    setDetail(result);
    setGoalId(id);
  }

  async function submit(event: FormEvent<HTMLFormElement>, action: string) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (action === "load") {
        setDetail(null);
        setObserved([]);
        setStopped(false);
        await refresh(String(values.get("goalId")));
      } else if (action === "create") {
        const goal = await request("/goals", {
          objective: values.get("objective"),
        });
        setObserved([]);
        setStopped(false);
        await refresh(goal.id);
      } else {
        const payload =
          action === "quest"
            ? { questId: values.get("questId") }
            : action === "evidence"
              ? {
                  reflection: values.get("reflection"),
                  observedEntityIds: observed,
                }
              : action === "feedback"
                ? {
                    assessment: values.get("assessment"),
                    comment: values.get("comment"),
                  }
                : {
                    enjoyment: Number(values.get("enjoyment")),
                    agency: Number(values.get("agency")),
                    challenge: Number(values.get("challenge")),
                  };
        await request(`/goals/${goalId}/${action}`, payload);
        await refresh(goalId);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    sessionEpoch.current += 1;
    setToken("");
    setGoalId("");
    setDetail(null);
    setObserved([]);
    setError("");
    setStopped(false);
  }

  return (
    <div className="learning-journey">
      <section className="card">
        <h2>Local session</h2>
        <p>
          Use only fixture accounts. Bearer tokens stay in this tab’s memory;
          changing the token clears the displayed record.
        </p>
        <label>
          Bearer token{" "}
          <input
            aria-label="Bearer token"
            disabled={!ready}
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => {
              sessionEpoch.current += 1;
              setToken(event.target.value);
              setDetail(null);
              setObserved([]);
            }}
          />
        </label>
        <button type="button" onClick={reset}>
          Clear session and stop
        </button>
        <form onSubmit={(event) => submit(event, "load")}>
          <label>
            Goal ID{" "}
            <input
              aria-label="Goal ID"
              name="goalId"
              required
              defaultValue={goalId}
            />
          </label>
          <button disabled={busy || !token} type="submit">
            Load journey / refresh feedback
          </button>
        </form>
      </section>
      <output>{busy ? "Saving / loading…" : ""}</output>
      {error ? <p role="alert">{error}</p> : null}
      <section className="card">
        <h2>1. Choose your goal</h2>
        <form onSubmit={(event) => submit(event, "create")}>
          <label>
            What do you want to learn?{" "}
            <textarea
              aria-label="What do you want to learn?"
              name="objective"
              required
              minLength={5}
              maxLength={500}
            />
          </label>
          <button disabled={busy || !token} type="submit">
            Create my goal
          </button>
        </form>
      </section>
      {detail ? (
        <>
          <section className="card">
            <h2>2. Choose a quest</h2>
            <p>Goal: {detail.journey.objective}</p>
            <p>
              Goal ID: <code>{detail.journey.id}</code> — share this with your
              assigned educator.
            </p>
            {detail.journey.questId ? (
              <p>Quest: {detail.journey.questId}</p>
            ) : (
              <form onSubmit={(event) => submit(event, "quest")}>
                <p>
                  Choose your existing live, parent-approved quest. This shares
                  the goal with its assigned educator and linked guardian.
                </p>
                <label>
                  Approved quest ID{" "}
                  <input
                    aria-label="Approved quest ID"
                    name="questId"
                    required
                  />
                </label>
                <button type="submit" disabled={busy}>
                  Choose quest and share with assigned adults
                </button>
              </form>
            )}
          </section>
          {detail.experience && !detail.journey.evidence && !stopped ? (
            <>
              <ExperiencePlayer
                key={detail.journey.id}
                spec={detail.experience}
                onObserve={(id) =>
                  setObserved((ids) => (ids.includes(id) ? ids : [...ids, id]))
                }
              />
              <button
                type="button"
                onClick={() => {
                  setStopped(true);
                  setObserved([]);
                }}
              >
                Stop experience
              </button>
            </>
          ) : null}
          {stopped && !detail.journey.evidence ? (
            <button type="button" onClick={() => setStopped(false)}>
              Resume experience
            </button>
          ) : null}
          {detail.journey.questId && !detail.experience ? (
            <output>
              Experience unavailable: approval, safety clearance or supported
              scene needs attention.
            </output>
          ) : null}
          <section className="card">
            <h2>3. Learning evidence</h2>
            {detail.journey.evidence ? (
              <p>{detail.journey.evidence.reflection}</p>
            ) : (
              <form onSubmit={(event) => submit(event, "evidence")}>
                <label>
                  What did you observe and learn?{" "}
                  <textarea
                    aria-label="What did you observe and learn?"
                    name="reflection"
                    required
                    minLength={10}
                    maxLength={2000}
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || !observed.length || stopped}
                >
                  Submit evidence once
                </button>
              </form>
            )}
          </section>
          <section className="card">
            <h2>4. Educator feedback</h2>
            {detail.journey.feedback ? (
              <>
                <p>{detail.journey.feedback.assessment}</p>
                <p>{detail.journey.feedback.comment}</p>
              </>
            ) : (
              <form onSubmit={(event) => submit(event, "feedback")}>
                <p>
                  Only the assigned educator’s session may submit this form.
                </p>
                <label>
                  Assessment{" "}
                  <select aria-label="Assessment" name="assessment">
                    <option value="demonstrated">Demonstrated</option>
                    <option value="needs_practice">Needs practice</option>
                  </select>
                </label>
                <label>
                  Feedback{" "}
                  <textarea
                    aria-label="Feedback"
                    name="comment"
                    required
                    minLength={5}
                    maxLength={2000}
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || !detail.journey.evidence}
                >
                  Submit educator feedback
                </button>
              </form>
            )}
          </section>
          <section className="card">
            <h2>5. How was your learning? (optional)</h2>
            <p>
              1 = low, 5 = high. Challenge measures difficulty, not quality.
              Ratings never change your assessment.
            </p>
            {detail.journey.satisfaction ? (
              <p>Thank you. Your ratings were saved privately.</p>
            ) : (
              <form onSubmit={(event) => submit(event, "satisfaction")}>
                {(["enjoyment", "agency", "challenge"] as const).map((name) => (
                  <label key={name}>
                    {name}{" "}
                    <select aria-label={name} name={name} defaultValue="3">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <button
                  type="submit"
                  disabled={busy || !detail.journey.feedback}
                >
                  Save optional ratings
                </button>
              </form>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
