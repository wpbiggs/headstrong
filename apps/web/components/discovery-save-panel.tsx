"use client";

import {
  type LearningJourneyDetail,
  learningDiscoveryReceiptSchema,
  learningEvidenceInputSchema,
  learningJourneyDetailSchema,
  learningQuestChoicesSchema,
  learningRecordChoicesSchema,
} from "@headstrong/core";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { type Attempt, awakeningExperience } from "../lib/awakening";
import {
  discoverySummary,
  isAwakeningRecord,
} from "../lib/awakening-discovery";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export function DiscoverySavePanel({
  attempts,
  note,
  onBack,
}: {
  attempts: Attempt[];
  note: string;
  onBack: () => void;
}) {
  const [token, setToken] = useState("");
  const [goalId, setGoalId] = useState("");
  const [flights, setFlights] = useState(false);
  const [notes, setNotes] = useState(false);
  const [detail, setDetail] = useState<LearningJourneyDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [quests, setQuests] = useState<
    ReturnType<typeof learningQuestChoicesSchema.parse>["items"]
  >([]);
  const [records, setRecords] = useState<
    ReturnType<typeof learningRecordChoicesSchema.parse>["items"]
  >([]);
  const [questId, setQuestId] = useState("");
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const submission = useRef<{ key: string; id: string } | null>(null);
  const active = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const lock = useRef(false);
  const summary = discoverySummary(attempts, note, flights, notes);

  useEffect(
    () => () => {
      epoch.current += 1;
      active.current?.abort();
    },
    [],
  );

  function changed() {
    epoch.current += 1;
    active.current?.abort();
    setDetail(null);
    setError("");
    setSent(false);
    setBusy(false);
  }

  async function run(save: boolean, catalog = false) {
    if (lock.current) return;
    lock.current = true;
    const version = epoch.current;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    try {
      if (!token.trim())
        throw new Error("An authorized learner session is required to save.");
      async function request(
        body?: unknown,
        path = `/goals/${goalId.trim()}${body ? "/evidence" : ""}`,
      ) {
        const response = await fetch(`${apiUrl}/learning${path}`, {
          method: body ? "POST" : "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (version !== epoch.current)
          throw new Error("Session changed; response discarded.");
        if (!response.ok)
          throw new Error(result.error ?? "The record is unavailable.");
        return result;
      }
      if (catalog) {
        const choices = learningQuestChoicesSchema.parse(
          await request(undefined, "/quests"),
        );
        const saved = learningRecordChoicesSchema.parse(
          await request(undefined, "/goals"),
        );
        setQuests(
          choices.items.filter(
            (item) =>
              JSON.stringify(item.scene) ===
              JSON.stringify(awakeningExperience.scene),
          ),
        );
        setRecords(
          saved.items.filter(
            (item) => item.templateId === awakeningExperience.scene.templateId,
          ),
        );
        setCatalogLoaded(true);
        return;
      }
      if (save && questId && !goalId) {
        const chosen = quests.find((item) => item.questId === questId);
        if (!chosen || !summary)
          throw new Error(
            "Choose an approved adventure and a discovery to share.",
          );
        const key = JSON.stringify({ questId, summary, scene: chosen.scene });
        if (!submission.current || submission.current.key !== key)
          submission.current = { key, id: crypto.randomUUID() };
        const receipt = learningDiscoveryReceiptSchema.parse(
          await request(
            {
              submissionId: submission.current.id,
              questId,
              scene: chosen.scene,
              reflection: summary,
              observedEntityIds: ["workshop"],
            },
            "/discoveries",
          ),
        );
        setGoalId(receipt.detail.journey.id);
        setDetail(receipt.detail);
        setSent(true);
        return;
      }
      z.string().guid().parse(goalId.trim());
      // Recheck current authorization and approval even after a previous preview.
      const current = learningJourneyDetailSchema.parse(await request());
      if (!isAwakeningRecord(current))
        throw new Error(
          "This is not a currently approved Awakening record. Nothing from your island was sent.",
        );
      setDetail(current);
      if (save) {
        if (current.journey.evidence)
          throw new Error(
            "This record already has a discovery. Refresh to read its feedback; it cannot be overwritten.",
          );
        if (!summary)
          throw new Error("Choose a flight or your optional note to share.");
        const body = learningEvidenceInputSchema.parse({
          reflection: summary,
          observedEntityIds: ["workshop"],
        });
        // No asynchronous gap between the final epoch check and explicit submission.
        if (version !== epoch.current || controller.signal.aborted) return;
        await request(body);
        setSent(true);
        const updated = learningJourneyDetailSchema.parse(await request());
        setDetail(updated);
      }
    } catch (reason) {
      if (version === epoch.current && !controller.signal.aborted)
        setError(
          reason instanceof z.ZodError
            ? "Check the record ID and selected discovery."
            : reason instanceof Error
              ? reason.message
              : "Request failed.",
        );
    } finally {
      lock.current = false;
      if (version === epoch.current) setBusy(false);
      if (active.current === controller) active.current = null;
    }
  }

  return (
    <main className="awakening connected-record discovery-save">
      <button type="button" onClick={onBack}>
        ← Back to paused island
      </button>
      <h1>Save a discovery — only if you choose</h1>
      <p>
        Play is complete without this step. Choose what to share; opening this
        page sends nothing. No quiz or reflection is required.
      </p>
      <fieldset disabled={busy || sent}>
        <legend>Your selection</legend>
        <label>
          <input
            type="checkbox"
            checked={flights}
            disabled={!attempts.length}
            onChange={(e) => setFlights(e.target.checked)}
          />{" "}
          Share completed flights ({attempts.length})
        </label>
        <label>
          <input
            type="checkbox"
            checked={notes}
            disabled={!note.trim()}
            onChange={(e) => setNotes(e.target.checked)}
          />{" "}
          Share my optional island note
        </label>
      </fieldset>
      <h2>Exactly what will be shared</h2>
      <pre className="discovery-preview">
        {summary || "Nothing selected. You can return to play without sharing."}
      </pre>
      <p>
        Saving sends only this text and the workshop observation to your private
        Awakening record, creating one only when you share. Its assigned
        educator and linked guardian can read it. Feedback is human; flight
        results never establish mastery. No other notes or gameplay history are
        uploaded.
      </p>
      <section className="learning-journey">
        <h2>Private preview connection</h2>
        <p>
          Use synthetic accounts only. An operator must provision a learner
          session and approved adventure, but no pre-created record is needed.
          Tokens stay in memory, never browser storage. An unrelated quest
          cannot receive this discovery.
        </p>
        <label>
          Learner token
          <input
            aria-label="Discovery learner token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => {
              changed();
              setQuests([]);
              setCatalogLoaded(false);
              setRecords([]);
              setQuestId("");
              setGoalId("");
              setFlights(false);
              setNotes(false);
              submission.current = null;
              setToken(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy || !token.trim()}
          onClick={() => void run(false, true)}
        >
          Find my approved adventures and records
        </button>
        {catalogLoaded && !quests.length && (
          <p>
            No currently approved matching Awakening adventure is available for
            this session. You can still return to play without saving.
          </p>
        )}
        <label>
          Approved Awakening adventure
          <select
            aria-label="Approved Awakening adventure"
            value={questId}
            disabled={busy || sent}
            onChange={(e) => {
              changed();
              setQuestId(e.target.value);
              setGoalId("");
            }}
          >
            <option value="">Choose an adventure for a new discovery</option>
            {quests.map((item) => (
              <option key={item.questId} value={item.questId}>
                The Awakening · {item.questId.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label>
          My saved discovery records
          <select
            aria-label="My saved discovery records"
            value={records.some((item) => item.id === goalId) ? goalId : ""}
            disabled={busy}
            onChange={(e) => {
              changed();
              setGoalId(e.target.value);
              setQuestId("");
            }}
          >
            <option value="">Choose a record to check feedback</option>
            {records.map((item) => (
              <option key={item.id} value={item.id}>
                {item.objective} · {item.id.slice(0, 8)}
                {item.hasGuardianFeedback || item.hasEducatorFeedback
                  ? " · feedback available"
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Awakening record ID
          <input
            aria-label="Awakening record ID"
            value={goalId}
            onChange={(e) => {
              changed();
              setQuestId("");
              setGoalId(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy || !token.trim() || !goalId.trim()}
          onClick={() => void run(false)}
        >
          Check record / refresh human feedback
        </button>
        {detail && (
          <p>
            Record: {detail.journey.id}.{" "}
            {detail.journey.evidence
              ? "A discovery is already saved."
              : "Approved Awakening record available."}
          </p>
        )}
        <button
          type="button"
          disabled={
            busy ||
            !summary ||
            (!detail && !questId) ||
            !!detail?.journey.evidence ||
            sent
          }
          onClick={() => void run(true)}
        >
          Share this discovery with my trusted adults
        </button>
        <output aria-live="polite">
          {busy
            ? "Checking the private record…"
            : sent
              ? "Your discovery was saved. You can return to play; no rating is required."
              : "Nothing is sent until you choose Share."}
        </output>
        {error && (
          <p role="alert">
            {error} If a save request was interrupted, refresh this record
            before retrying; leaving does not delete an accepted save.
          </p>
        )}
        {detail?.journey.feedback && (
          <section>
            <h2>Human educator feedback</h2>
            <p>{detail.journey.feedback.comment}</p>
          </section>
        )}
        {detail?.journey.guardianFeedback && (
          <section>
            <h2>Guardian encouragement</h2>
            <p>{detail.journey.guardianFeedback.comment}</p>
            <p>
              This supportive reply is not an assessment or proof of mastery.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
