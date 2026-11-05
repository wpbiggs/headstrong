"use client";

import type { IslandAction } from "../lib/awakening";
import { type WaterGate, type Waterworks, routeWater } from "../lib/waterworks";

const gates: { id: WaterGate; label: string }[] = [
  { id: "cove", label: "Cove channel" },
  { id: "slope", label: "Slope channel" },
  { id: "terrace", label: "Terrace channel" },
  { id: "split", label: "Split three ways" },
];
export function GardenWaterworks({
  waterworks,
  disabled,
  dispatch,
}: {
  waterworks: Waterworks;
  disabled: boolean;
  dispatch: (action: IslandAction) => void;
}) {
  const preview = routeWater(waterworks.gate);
  const last = waterworks.pours.at(-1);
  return (
    <section className="garden-waterworks" aria-label="Garden waterworks">
      <p className="island-eyebrow">ONE CUP / MANY POSSIBILITIES</p>
      <h3>Where will the water wander?</h3>
      <p>
        A little hand pump sends three drops through your channels. Concentrate
        them in one bed or share them across all three. Try a channel before
        planting, or watch your seedlings change shape.
      </p>
      <fieldset disabled={disabled}>
        <legend>Turn the water gate</legend>
        <div className="choice-row">
          {gates.map((gate) => (
            <button
              type="button"
              key={gate.id}
              aria-pressed={waterworks.gate === gate.id}
              onClick={() => dispatch({ type: "water-gate", gate: gate.id })}
            >
              {gate.label}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="water-preview">
        Next cup: cove {preview.cove}, slope {preview.slope}, terrace{" "}
        {preview.terrace} drops. Turning the gate alone does not pour.
      </p>
      <button
        type="button"
        className="launch-button"
        disabled={disabled}
        onClick={() => dispatch({ type: "pour-water" })}
      >
        Pour one cup
      </button>
      <svg
        className="water-map"
        viewBox="0 0 360 180"
        role="img"
        aria-label={`Last poured water: cove ${waterworks.flow.cove}, slope ${waterworks.flow.slope}, terrace ${waterworks.flow.terrace} drops`}
      >
        <circle cx="180" cy="24" r="14" fill="currentColor" />
        {(
          [
            ["cove", 60, "Cove"],
            ["slope", 180, "Slope"],
            ["terrace", 300, "Terrace"],
          ] as const
        ).map(([bed, x, label]) => (
          <g key={bed}>
            <path
              d={`M180 38 L${x} 118`}
              fill="none"
              stroke="currentColor"
              strokeWidth={
                waterworks.flow[bed] ? 2 + waterworks.flow[bed] * 2 : 1
              }
              strokeDasharray={waterworks.flow[bed] ? undefined : "4 5"}
            />
            <ellipse
              cx={x}
              cy="124"
              rx="30"
              ry="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <text x={x} y="155" textAnchor="middle" fill="currentColor">
              {label}: {waterworks.flow[bed]}
            </text>
          </g>
        ))}
      </svg>
      <output className="water-result" aria-live="polite">
        {last
          ? last === "split"
            ? "One cup splits into three trickles: one drop per bed. Any seedlings open low, wide leaves."
            : `One cup follows the ${last} channel: three drops in one bed. Any seedlings there lift tall blossoms.`
          : "The pump is waiting. All channels are open to try; no flight or seed is required."}
      </output>
      <button
        type="button"
        onClick={() =>
          document.querySelector(".island-world")?.scrollIntoView()
        }
      >
        Look at the island ↑
      </button>
      <p>
        Each fresh cup drains the previous one. Plants never die while you are
        away; there is no care timer. Keep the seed and breeze the same, then
        change only the gate. The garden beds above describe what changes.
      </p>
      {!!waterworks.pours.length && (
        <ol className="water-history" aria-label="Your last water routes">
          {waterworks.pours.map((gate, index) => (
            <li key={`${index}-${gate}`}>
              {gates.find((item) => item.id === gate)?.label} · one cup / three
              drops
            </li>
          ))}
        </ol>
      )}
      <p className="island-small">
        A toy routing model, not real gardening advice. Last four cups only.
        Water routes stay in this tab and are not included in seed discovery
        uploads. No score, correct route or automatic mastery.
      </p>
    </section>
  );
}
