"use client";

import type { Island, IslandAction } from "../lib/awakening";
import type { GardenBed } from "../lib/seedwind";

const beds: { id: GardenBed; label: string; mark: string }[] = [
  { id: "cove", label: "Cove bed", mark: "≈" },
  { id: "slope", label: "Slope bed", mark: "⌁" },
  { id: "terrace", label: "High terrace", mark: "△" },
];

export function SeedwindGarden({
  garden,
  disabled,
  dispatch,
}: {
  garden: Island["garden"];
  disabled: boolean;
  dispatch: (action: IslandAction) => void;
}) {
  const last = garden.trials.at(-1);
  return (
    <section className="seedwind-garden" aria-label="Seedwind garden">
      <p className="island-eyebrow">ANOTHER PATH / THE SEEDWIND GARDEN</p>
      <h2>Where will the wind plant a forest?</h2>
      <p>
        A handful of sleeping seeds waits at the workshop. Try a shape and a
        breeze. Every landing grows something; the high terrace is not a better
        score.
      </p>
      <fieldset disabled={disabled}>
        <legend>Choose a seed shape</legend>
        <div className="choice-row">
          <button
            type="button"
            aria-pressed={garden.shape === "round"}
            onClick={() => dispatch({ type: "seed-shape", shape: "round" })}
          >
            Round · rolls close
          </button>
          <button
            type="button"
            aria-pressed={garden.shape === "feathered"}
            onClick={() => dispatch({ type: "seed-shape", shape: "feathered" })}
          >
            Feathered · catches air
          </button>
        </div>
      </fieldset>
      <fieldset disabled={disabled}>
        <legend>Choose the seed breeze</legend>
        <div className="choice-row">
          <button
            type="button"
            aria-pressed={garden.breeze === "shelter"}
            onClick={() => dispatch({ type: "seed-breeze", breeze: "shelter" })}
          >
            Gentle cove breeze
          </button>
          <button
            type="button"
            aria-pressed={garden.breeze === "ridge"}
            onClick={() => dispatch({ type: "seed-breeze", breeze: "ridge" })}
          >
            Ridge gust
          </button>
        </div>
      </fieldset>
      <button
        type="button"
        className="launch-button"
        disabled={disabled}
        onClick={() => dispatch({ type: "sow-seed" })}
      >
        Release a seed on the wind
      </button>
      <div className="seedwind-beds" aria-label="Your growing island garden">
        {beds.map((bed) => (
          <div
            key={bed.id}
            className={`seedwind-bed ${garden.beds[bed.id] ? "growing" : ""}`}
          >
            <span aria-hidden="true">
              {bed.mark} {"✿".repeat(garden.beds[bed.id]) || "·"}
            </span>
            <strong>{bed.label}</strong>
            <span>
              {garden.beds[bed.id]
                ? `${garden.beds[bed.id]} growing ${garden.beds[bed.id] === 1 ? "clump" : "clumps"}`
                : "Sleeping soil"}
            </span>
          </div>
        ))}
      </div>
      <output className="seedwind-result" aria-live="polite">
        {last
          ? `${last.shape === "round" ? "Round" : "Feathered"} seed · ${last.breeze === "shelter" ? "gentle cove breeze" : "ridge gust"} · ${last.distance} m. A new shoot opens in the ${beds.find((bed) => bed.id === last.bed)?.label.toLowerCase()}.`
          : "The soil is waiting. Try either seed; you do not need to finish a flight first."}
      </output>
      {last && (
        <p>
          Keep the breeze and change only the seed, or keep the seed and change
          only the breeze. What changes in the garden?
        </p>
      )}
      {!!garden.trials.length && (
        <ol className="seedwind-trials" aria-label="Your last seed experiments">
          {garden.trials.map((trial, index) => (
            <li key={`${index}-${trial.shape}-${trial.breeze}`}>
              {trial.shape} · {trial.breeze} · {trial.distance} m → {trial.bed}
            </li>
          ))}
        </ol>
      )}
      <p className="island-small">
        A toy wind-and-seed model, not real botany. Last four releases stay in
        this tab; each bed shows up to three clumps. Pause keeps the garden,
        reset clears it. Nothing is uploaded unless selected in optional
        sharing.
      </p>
    </section>
  );
}
