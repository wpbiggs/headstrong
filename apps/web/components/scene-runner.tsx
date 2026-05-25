"use client";

import type { ScenePlan } from "@headstrong/core";
import { useEffect, useState } from "react";

export function SceneRunner({ scenePlan }: { scenePlan: ScenePlan }) {
  const [supportsXr, setSupportsXr] = useState(false);

  useEffect(() => {
    const available = typeof navigator !== "undefined" && "xr" in navigator;
    setSupportsXr(available);
    console.log("scene_runner_loaded", {
      templateId: scenePlan.templateId,
      supportsXr: available,
    });
  }, [scenePlan.templateId]);

  if (supportsXr) {
    return (
      <section className="card scene-card">
        <p className="eyebrow">WebXR Runner</p>
        <h2>{scenePlan.title}</h2>
        <p>{scenePlan.summary}</p>
        <div className="scene-grid">
          {scenePlan.entities.map((entity) => (
            <div key={entity.id} className="scene-entity">
              <strong>{entity.label}</strong>
              <span>{entity.type}</span>
              <span>{entity.assetRef}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="card scene-card">
      <p className="eyebrow">2D Fallback</p>
      <h2>{scenePlan.title}</h2>
      <p>{scenePlan.summary}</p>
      <div className="fallback-stage">
        {scenePlan.entities.map((entity) => (
          <div key={entity.id} className="fallback-chip">
            {entity.label}
          </div>
        ))}
      </div>
      <ul>
        {scenePlan.interactions.map((interaction) => (
          <li key={interaction.id}>{interaction.prompt}</li>
        ))}
      </ul>
    </section>
  );
}
