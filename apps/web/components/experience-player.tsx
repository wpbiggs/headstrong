"use client";

import type { ExperienceSpec } from "@headstrong/core";
import { useEffect, useRef, useState } from "react";
import { mountPlayCanvasExperience } from "../lib/playcanvas-experience";

export function ExperiencePlayer({
  spec,
  onObserve,
  initialObserved = [],
  localOnly = false,
}: {
  spec: ExperienceSpec;
  onObserve: (id: string) => void;
  initialObserved?: string[];
  localOnly?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const adapter = useRef<Awaited<
    ReturnType<typeof mountPlayCanvasExperience>
  > | null>(null);
  const callback = useRef(onObserve);
  callback.current = onObserve;
  const [status, setStatus] = useState("Loading PlayCanvas…");
  const [observed, setObserved] = useState<string[]>(initialObserved);
  const initial = useRef(initialObserved);

  function observe(id: string) {
    setObserved((ids) => (ids.includes(id) ? ids : [...ids, id]));
    adapter.current?.highlight(id);
    callback.current(id);
  }
  const observeRef = useRef(observe);
  observeRef.current = observe;

  useEffect(() => {
    let cancelled = false;
    let mounted: typeof adapter.current = null;
    if (canvas.current) {
      mountPlayCanvasExperience(canvas.current, spec, (id) =>
        observeRef.current(id),
      )
        .then((instance) => {
          if (cancelled) {
            instance.destroy();
            return;
          }
          mounted = instance;
          adapter.current = instance;
          for (const id of initial.current) instance.highlight(id);
          setStatus(
            "PlayCanvas ready — select a block or use the inspection buttons.",
          );
        })
        .catch(() => {
          if (!cancelled)
            setStatus(
              "3D unavailable. Use the equivalent keyboard-accessible inspection buttons below.",
            );
        });
    }
    return () => {
      cancelled = true;
      mounted?.destroy();
      adapter.current = null;
    };
  }, [spec]);

  return (
    <section className="card experience-player">
      <div className="player-heading">
        <h2>{spec.scene.title}</h2>
        <span className="player-live">INTERACTIVE EXPLORATION</span>
      </div>
      <p>{spec.objective}</p>
      <output>{status}</output>
      <div
        className="player-canvas-wrap"
        style={{ width: "100%", height: 360, overflow: "hidden" }}
      >
        <canvas
          ref={canvas}
          aria-label="Interactive learning scene; equivalent inspection controls follow"
          style={{ width: "100%", height: 360, display: "block" }}
        />
      </div>
      <p>{spec.scene.summary}</p>
      <ul className="inspection-controls">
        {spec.scene.entities.map((entity) => (
          <li key={entity.id}>
            <button
              type="button"
              aria-pressed={observed.includes(entity.id)}
              onClick={() => observe(entity.id)}
            >
              Inspect {entity.label}
            </button>
            {observed.includes(entity.id) ? " — observed" : ""}
          </li>
        ))}
      </ul>
      <ul className="inspection-prompts">
        {spec.scene.interactions.map((interaction) => (
          <li key={interaction.id}>{interaction.prompt}</li>
        ))}
      </ul>
      <p className="player-disclaimer">
        {localOnly
          ? "A local sample built from template blocks. Inspecting pieces is not an assessment; no reflection is sent to an educator."
          : "These are template blocks, not imported assets. Observations are self-reported; your educator reviews your reflection."}
      </p>
    </section>
  );
}
