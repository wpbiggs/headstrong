"use client";

import type { Island, IslandAction } from "../lib/awakening";
import type { WaterGate } from "../lib/waterworks";

export function IslandWorldControls({
  island,
  disabled,
  dispatch,
}: {
  island: Island;
  disabled: boolean;
  dispatch: (action: IslandAction) => void;
}) {
  const f = island.flight;
  return (
    <section className="world-quick-controls" aria-label="Play at this stop">
      <h2>
        {island.location === "workshop"
          ? "At the launch deck"
          : island.location === "garden"
            ? "Among the seed beds"
            : "Under the little sky"}
      </h2>
      {island.location === "workshop" ? (
        <>
          <p>
            {f.wing === "wide" ? "Wide wings" : "Swept wings"} ·{" "}
            {f.lane === -1 ? "sheltered route" : "ridge route"} ·{" "}
            {f.phase === "flying"
              ? `${Math.round(f.distance)} / 70 m`
              : f.phase === "landed"
                ? f.reached
                  ? "Beacon awake."
                  : "A soft landing. Try another idea."
                : "Ready when you are."}
          </p>
          <fieldset disabled={disabled}>
            <legend>Try a wing, then steer as you fly</legend>
            <div className="choice-row">
              <button
                type="button"
                disabled={f.phase !== "ready"}
                onClick={() =>
                  dispatch({
                    type: "wing",
                    wing: f.wing === "wide" ? "swept" : "wide",
                  })
                }
              >
                {f.wing === "wide" ? "Fit swept wings" : "Fit wide wings"}
              </button>
              <button
                type="button"
                disabled={f.phase === "landed"}
                aria-pressed={f.lane === -1}
                onClick={() => dispatch({ type: "steer", lane: -1 })}
              >
                Bank left
              </button>
              <button
                type="button"
                disabled={f.phase === "landed"}
                aria-pressed={f.lane === 1}
                onClick={() => dispatch({ type: "steer", lane: 1 })}
              >
                Bank right
              </button>
              {f.phase === "ready" && (
                <button
                  type="button"
                  className="launch-button"
                  onClick={() => dispatch({ type: "launch" })}
                >
                  Take flight
                </button>
              )}
              {f.phase === "landed" && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "retry" })}
                >
                  Ready another glider
                </button>
              )}
            </div>
          </fieldset>
        </>
      ) : island.location === "garden" ? (
        <>
          <p>
            {island.garden.shape} seed ·{" "}
            {island.garden.breeze === "shelter" ? "cove breeze" : "ridge gust"}.
            Water gate: {island.waterworks.gate}. Each pump replaces one cup,
            not a care timer.
          </p>
          <fieldset disabled={disabled}>
            <legend>Change a choice and watch the same beds</legend>
            <div className="choice-row">
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "seed-shape",
                    shape:
                      island.garden.shape === "round" ? "feathered" : "round",
                  })
                }
              >
                {island.garden.shape === "round"
                  ? "Try feathered seeds"
                  : "Try round seeds"}
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "seed-breeze",
                    breeze:
                      island.garden.breeze === "shelter" ? "ridge" : "shelter",
                  })
                }
              >
                {island.garden.breeze === "shelter"
                  ? "Try ridge breeze"
                  : "Try cove breeze"}
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: "sow-seed" })}
              >
                Send a seed
              </button>
            </div>
            <div className="world-water-choice">
              <label>
                Next water route
                <select
                  aria-label="Island water gate"
                  value={island.waterworks.gate}
                  onChange={(event) =>
                    dispatch({
                      type: "water-gate",
                      gate: event.target.value as WaterGate,
                    })
                  }
                >
                  <option value="cove">Cove channel</option>
                  <option value="slope">Slope channel</option>
                  <option value="terrace">Terrace channel</option>
                  <option value="split">Split three ways</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => dispatch({ type: "pour-water" })}
              >
                Pump water
              </button>
            </div>
          </fieldset>
          <p aria-live="polite">
            {island.garden.trials.at(-1)
              ? `Last seed: ${island.garden.trials.at(-1)?.distance} m → ${island.garden.trials.at(-1)?.bed}.`
              : "All beds are open to try."}{" "}
            Last cup: cove {island.waterworks.flow.cove}, slope{" "}
            {island.waterworks.flow.slope}, terrace{" "}
            {island.waterworks.flow.terrace} drops.
          </p>
        </>
      ) : (
        <>
          <p>
            {island.sky.constellation} constellation · {island.sky.lens} lens.
            The same five lights{" "}
            {island.sky.lens === "wide"
              ? "gather near the center"
              : "spread farther apart"}
            .
          </p>
          <fieldset disabled={disabled}>
            <legend>Shape the lights, with or without a flight</legend>
            <div className="choice-row">
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "constellation",
                    constellation:
                      island.sky.constellation === "moth" ? "kite" : "moth",
                  })
                }
              >
                {island.sky.constellation === "moth"
                  ? "Project a kite"
                  : "Project a moth"}
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "lens",
                    lens: island.sky.lens === "wide" ? "close" : "wide",
                  })
                }
              >
                {island.sky.lens === "wide"
                  ? "Spread the lights"
                  : "Gather the lights"}
              </button>
            </div>
          </fieldset>
        </>
      )}
      {island.location !== "workshop" && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => dispatch({ type: "visit", location: "workshop" })}
        >
          Follow the trail to workshop
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          document
            .getElementById(
              island.location === "workshop"
                ? "flight-controls"
                : island.location === "garden"
                  ? "garden-controls"
                  : "sky-controls",
            )
            ?.scrollIntoView()
        }
      >
        More experiment tools ↓
      </button>
    </section>
  );
}
