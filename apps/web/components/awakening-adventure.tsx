"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  type IslandAction,
  islandReducer,
  newIsland,
  awakeningExperience as spec,
} from "../lib/awakening";
import { mountAwakening } from "../lib/playcanvas-awakening";
import { DiscoverySavePanel } from "./discovery-save-panel";
import { LearningJourneyPanel } from "./learning-journey-panel";

export function AwakeningAdventure() {
  const [island, dispatch] = useReducer(islandReducer, undefined, newIsland);
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [reflection, setReflection] = useState(false);
  const [ready, setReady] = useState(false);
  const [renderer, setRenderer] = useState("Waking the island…");
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef(island);
  current.current = island;
  const f = island.flight;
  const playing = !island.paused && !connected && !saving;
  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!playing || !canvas.current) return;
    let cancelled = false;
    let mounted: Awaited<ReturnType<typeof mountAwakening>> | undefined;
    setRenderer("Waking the island…");
    mountAwakening(canvas.current, spec, () => current.current)
      .then((instance) => {
        if (cancelled) {
          instance.destroy();
          return;
        }
        mounted = instance;
        setRenderer("PlayCanvas ready — island view");
      })
      .catch(() => {
        if (!cancelled)
          setRenderer(
            "3D unavailable — the complete text flight and controls still work below.",
          );
      });
    return () => {
      cancelled = true;
      mounted?.destroy();
    };
  }, [playing]);

  useEffect(() => {
    if (!playing || f.phase !== "flying") return;
    const timer = window.setInterval(() => dispatch({ type: "tick" }), 100);
    return () => window.clearInterval(timer);
  }, [playing, f.phase]);

  useEffect(() => {
    const hide = () => {
      if (document.hidden) dispatch({ type: "pause" });
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);

  function reset() {
    dispatch({ type: "reset" });
    setNote("");
    setReflection(false);
  }
  useEffect(() => {
    if (connected || saving) return;
    function key(event: KeyboardEvent) {
      if (
        (event.target as HTMLElement).matches("input, textarea, select") ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const action: IslandAction | undefined =
        event.key === "ArrowLeft"
          ? { type: "steer", lane: -1 }
          : event.key === "ArrowRight"
            ? { type: "steer", lane: 1 }
            : event.key === "Escape"
              ? { type: "pause" }
              : undefined;
      if (action) {
        event.preventDefault();
        dispatch(action);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [connected, saving]);

  if (saving)
    return (
      <DiscoverySavePanel
        attempts={island.attempts}
        note={note}
        onBack={() => setSaving(false)}
      />
    );

  if (connected)
    return (
      <main className="awakening connected-record">
        <button type="button" onClick={() => setConnected(false)}>
          ← Back to paused island
        </button>
        <h1>Optional saved workspace</h1>
        <p>
          This separate authorized workflow does not receive your island notes
          or flight history. Playing grants no approval, account role or
          mastery. Saving evidence shares it with the assigned trusted adults
          under the existing rules.
        </p>
        <LearningJourneyPanel />
      </main>
    );

  return (
    <main className="awakening">
      <a className="awakening-skip" href="#flight-controls">
        Skip to flight controls
      </a>
      <header className="island-header">
        <a href="/learn" className="island-brand">
          headstrong <span>/ curiosityverse</span>
        </a>
        <span className="session-tag">LOCAL ADVENTURE · NOTHING UPLOADED</span>
      </header>
      <section className="island-intro">
        <div>
          <p className="island-eyebrow">EXPLORER’S ISLAND / 01</p>
          <h1>{spec.scene.title}</h1>
          <p>{spec.scene.summary}</p>
        </div>
        <div className="island-actions">
          <a className="build-jump" href="#flight-controls">
            Build & fly ↓
          </a>
          <button
            type="button"
            disabled={!ready}
            onClick={() =>
              dispatch({ type: island.paused ? "resume" : "pause" })
            }
          >
            {island.paused ? "Resume adventure" : "Stop & rest"}
          </button>
          <button type="button" disabled={!ready} onClick={reset}>
            Reset island
          </button>
        </div>
      </section>

      <section
        className={`island-world ${island.restored ? "awakened" : ""}`}
        aria-label="Explorer’s Island"
      >
        <div className="world-caption">
          <span>
            {island.restored
              ? "✦ BEACON AWAKE · STAR GARDEN BLOOMING"
              : "◇ A SLEEPING BEACON ACROSS THE COVE"}
          </span>
          <span>SHELTER ← / → RIDGE WIND</span>
        </div>
        {playing ? (
          <canvas
            ref={canvas}
            aria-label="Glider, Lumiling and observatory; equivalent text and controls below"
          />
        ) : (
          <div className="island-rest">
            <span aria-hidden="true">☾</span>
            <h2>A good place to rest.</h2>
            <p>
              Your island waits in this tab. Resume whenever you like, or close
              it to leave everything behind.
            </p>
            <button type="button" onClick={() => dispatch({ type: "resume" })}>
              Resume adventure
            </button>
          </div>
        )}
        <p className="render-status">
          {playing ? renderer : "Paused — flight clock and renderer stopped."}
        </p>
      </section>

      <div className="island-play-grid">
        <section
          className="flight-console"
          id="flight-controls"
          aria-label="Flight controls"
        >
          <p className="island-eyebrow">FLIGHT OF THE INVENTOR</p>
          <h2>
            {f.phase === "landed"
              ? f.reached
                ? "You carried the spark."
                : "A soft landing. A new idea?"
              : "Build a little courage. Then fly."}
          </h2>
          <p>
            Wide wings float over sheltered water. Swept wings cut the ridge
            crosswind. Try either; bank left or right during flight.
          </p>
          <fieldset disabled={!ready || !playing || f.phase !== "ready"}>
            <legend>1 / Choose your wings</legend>
            <div className="choice-row">
              <button
                type="button"
                aria-pressed={f.wing === "wide"}
                onClick={() => dispatch({ type: "wing", wing: "wide" })}
              >
                Wide · floating
              </button>
              <button
                type="button"
                aria-pressed={f.wing === "swept"}
                onClick={() => dispatch({ type: "wing", wing: "swept" })}
              >
                Swept · wind-cutting
              </button>
            </div>
          </fieldset>
          <fieldset disabled={!ready || !playing || f.phase === "landed"}>
            <legend>2 / Choose a route · steer with ← → or tap</legend>
            <div className="choice-row">
              <button
                type="button"
                aria-pressed={f.lane === -1}
                onClick={() => dispatch({ type: "steer", lane: -1 })}
              >
                ← Sheltered cove
              </button>
              <button
                type="button"
                aria-pressed={f.lane === 1}
                onClick={() => dispatch({ type: "steer", lane: 1 })}
              >
                Ridge crosswind →
              </button>
            </div>
          </fieldset>
          <div className="flight-readout" aria-label="Flight instruments">
            <span>
              Distance <strong>{Math.round(f.distance)} / 70 m</strong>
            </span>
            <span>
              Lift remaining <strong>{Math.round(f.height * 10)}%</strong>
            </span>
            <progress
              value={f.distance}
              max={70}
              aria-label="Distance to observatory"
            />
          </div>
          <output className="flight-message">
            {island.paused
              ? "Resting. Nothing is moving."
              : f.phase === "flying"
                ? `In flight · ${f.lane === -1 ? "shelter" : "ridge wind"}. You can still change course.`
                : f.phase === "landed"
                  ? f.reached
                    ? "The beacon shines and eight star flowers open. The island remembers until reset."
                    : "The glider settled safely in the cove. Your spark is safe. Change one thing and try again."
                  : "Your spark is ready. No quiz. No score. Just a possibility."}
          </output>
          {f.phase === "ready" && (
            <button
              className="launch-button"
              type="button"
              disabled={!ready || !playing}
              onClick={() => dispatch({ type: "launch" })}
            >
              Launch glider ↗
            </button>
          )}
          {f.phase === "flying" && (
            <p>Escape or “Stop & rest” pauses the flight.</p>
          )}
          {f.phase === "landed" && (
            <div className="choice-row">
              <button
                className="launch-button"
                type="button"
                disabled={!playing}
                onClick={() => dispatch({ type: "retry" })}
              >
                Return to workshop
              </button>
              <button type="button" onClick={() => dispatch({ type: "pause" })}>
                Rest here
              </button>
            </div>
          )}
        </section>

        <aside className="island-discoveries" aria-label="Island discoveries">
          <h2>Something is stirring.</h2>
          <button
            type="button"
            disabled={!ready || !playing}
            aria-expanded={island.creature}
            onClick={() => dispatch({ type: "creature" })}
          >
            ✧ Offer the Lumiling a spark
          </button>
          {island.creature && (
            <p>
              {spec.scene.interactions.find((i) => i.id === "creature")?.prompt}{" "}
              <strong>It now flies beside your glider.</strong>
            </p>
          )}
          <button
            type="button"
            disabled={!ready || !playing}
            aria-expanded={island.wind}
            onClick={() => dispatch({ type: "wind" })}
          >
            ≈ Turn the wind ribbon
          </button>
          {island.wind && (
            <p>
              {spec.scene.interactions.find((i) => i.id === "wind")?.prompt}{" "}
              Compare the same wing on both routes.
            </p>
          )}
          <h3>
            Your experiments <span>· this tab only</span>
          </h3>
          {island.attempts.length ? (
            <ol className="experiment-list">
              {island.attempts.map((a, i) => (
                <li key={`${i}-${a.wing}-${a.distance}`}>
                  <strong>{a.wing === "wide" ? "Wide" : "Swept"}</strong> ·{" "}
                  {a.route} · {a.distance} m<br />
                  <span>
                    {a.reached ? "Beacon reached ✦" : "Soft cove landing ≈"}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p>
              A flight leaves a small trace here. Try changing just a wing or a
              route.
            </p>
          )}
          <p className="island-small">
            Last six flights only. Finishing route shown; steering can change
            the result. A toy wind model, not real aerodynamics or an
            assessment.
          </p>
          <button
            type="button"
            disabled={!ready}
            aria-expanded={reflection}
            onClick={() => setReflection(!reflection)}
          >
            Optional: leave yourself a discovery
          </button>
          {reflection && (
            <label className="island-note">
              What surprised you? (optional; kept in this tab unless you choose
              to share)
              <textarea
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          )}
        </aside>
      </div>
      <footer className="island-footer">
        <p>
          Synthetic, session-only play. Reset or reload clears this tab’s
          flights and notes, not discoveries you chose to save. No score or
          automatic mastery. No account is needed to play.
        </p>
        <div>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              dispatch({ type: "pause" });
              setConnected(true);
            }}
          >
            Connect saved workspace
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              dispatch({ type: "pause" });
              setSaving(true);
            }}
          >
            Save an island discovery (optional)
          </button>
        </div>
      </footer>
    </main>
  );
}
