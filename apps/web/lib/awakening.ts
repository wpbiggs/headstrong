import { experienceSpecSchema } from "@headstrong/core";
import {
  type SeedAction,
  type SeedGarden,
  newSeedGarden,
  seedGardenReducer,
} from "./seedwind";

// Curated synthetic content, not a quest authorization or persisted learner record.
// v1 supplies the portable scene/content envelope. Flight rules stay local to this
// adapter: v1 does not pretend to describe physics or grant executable authority.
export const awakeningExperience = experienceSpecSchema.parse({
  version: "v1",
  questId: "00000000-0000-4000-8000-000000000011",
  taskId: "00000000-0000-4000-8000-000000000012",
  objective: "Try a wing, read the wind, and wake the island beacon.",
  scene: {
    version: "v1",
    id: "explorers-island",
    templateId: "awakening-glider",
    title: "The Awakening",
    summary:
      "A pulse sleeps inside the observatory. Carry a spark across the cove to wake it.",
    timeboxMinutes: 10,
    entities: [
      {
        id: "workshop",
        type: "object",
        label: "Inventor’s launch",
        assetRef: "template/workshop",
        position: { x: 0, y: 0, z: 0 },
      },
      {
        id: "beacon",
        type: "environment",
        label: "Sleeping observatory",
        assetRef: "template/beacon",
        position: { x: 0, y: 0, z: -70 },
      },
      {
        id: "lumiling",
        type: "character",
        label: "Lost Lumiling",
        assetRef: "template/lumiling",
        position: { x: -10, y: 2, z: -8 },
      },
    ],
    interactions: [
      {
        id: "wind",
        type: "observe",
        prompt:
          "The ribbon points toward the ridge. Sheltered water lies left; a crosswind runs right.",
        targetEntityId: "workshop",
        successSignal: "session_observation",
      },
      {
        id: "creature",
        type: "inspect",
        prompt:
          "The Lumiling answers your spark with a glow. It follows the light, not a score.",
        targetEntityId: "lumiling",
        successSignal: "session_observation",
      },
    ],
    assets: [],
    accessibility: {
      keyboardNavigation: true,
      captions: true,
      narration: false,
      contrastMode: true,
    },
  },
});

export type Wing = "wide" | "swept";
export type Lane = -1 | 1;
export type Flight = {
  phase: "ready" | "flying" | "landed";
  wing: Wing;
  lane: Lane;
  distance: number;
  height: number;
  ticks: number;
  reached: boolean;
};
export type Attempt = Pick<Flight, "wing" | "distance" | "reached"> & {
  route: string;
};
export type Island = {
  garden: SeedGarden;
  flight: Flight;
  attempts: Attempt[];
  restored: boolean;
  paused: boolean;
  creature: boolean;
  wind: boolean;
};
export type IslandAction =
  | SeedAction
  | { type: "wing"; wing: Wing }
  | { type: "steer"; lane: Lane }
  | {
      type:
        | "launch"
        | "tick"
        | "retry"
        | "pause"
        | "resume"
        | "reset"
        | "creature"
        | "wind";
    };

const readyFlight = (wing: Wing = "wide", lane: Lane = -1): Flight => ({
  phase: "ready",
  wing,
  lane,
  distance: 0,
  height: 10,
  ticks: 0,
  reached: false,
});
export const newIsland = (): Island => ({
  garden: newSeedGarden(),
  flight: readyFlight(),
  attempts: [],
  restored: false,
  paused: false,
  creature: false,
  wind: false,
});

// Deliberately small, reproducible toy model, NOT an aerodynamic simulation.
// 100 ms steps; no time-on-task collection or frame-rate-dependent outcomes.
export function islandReducer(state: Island, action: IslandAction): Island {
  if (action.type === "reset") return newIsland();
  if (action.type === "pause") return { ...state, paused: true };
  if (action.type === "resume") return { ...state, paused: false };
  if (state.paused) return state;
  const f = state.flight;
  switch (action.type) {
    case "seed-shape":
    case "seed-breeze":
    case "sow-seed":
      return { ...state, garden: seedGardenReducer(state.garden, action) };
    case "wing":
      return f.phase === "ready"
        ? { ...state, flight: { ...f, wing: action.wing } }
        : state;
    case "steer":
      return f.phase !== "landed"
        ? { ...state, flight: { ...f, lane: action.lane } }
        : state;
    case "creature":
      return { ...state, creature: !state.creature };
    case "wind":
      return { ...state, wind: !state.wind };
    case "retry":
      return f.phase === "landed"
        ? { ...state, flight: readyFlight(f.wing, f.lane) }
        : state;
    case "launch":
      return f.phase === "ready"
        ? { ...state, flight: { ...f, phase: "flying" } }
        : state;
    case "tick": {
      if (f.phase !== "flying") return state;
      const matched =
        (f.wing === "wide" && f.lane === -1) ||
        (f.wing === "swept" && f.lane === 1);
      const speed = matched ? (f.wing === "wide" ? 1 : 1.3) : 0.75;
      const sink = matched ? 0.1 : 0.22;
      const distance = Math.min(70, f.distance + speed);
      const height = Math.max(0, f.height - sink);
      const reached = distance >= 70;
      const done = reached || height <= 0 || f.ticks + 1 >= 100;
      const flight: Flight = {
        ...f,
        distance,
        height,
        reached,
        ticks: f.ticks + 1,
        phase: done ? "landed" : "flying",
      };
      return {
        ...state,
        flight,
        restored: state.restored || reached,
        attempts: done
          ? [
              ...state.attempts.slice(-5),
              {
                wing: f.wing,
                distance: Math.round(distance),
                reached,
                route: f.lane === -1 ? "shelter finish" : "ridge finish",
              },
            ]
          : state.attempts,
      };
    }
  }
}
