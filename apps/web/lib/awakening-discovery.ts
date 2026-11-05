import type { LearningJourneyDetail } from "@headstrong/core";
import {
  type Attempt,
  type Observatory,
  awakeningExperience,
} from "./awakening";
import type { SeedTrial } from "./seedwind";
import { type WaterGate, routeWater } from "./waterworks";

export type ExtraDiscoverySelection = {
  waterRoutes?: WaterGate[];
  includeWater?: boolean;
  sky?: Observatory;
  includeSky?: boolean;
};

export function discoverySummary(
  attempts: Attempt[],
  note: string,
  includeFlights: boolean,
  includeNote: boolean,
  seedTrials: SeedTrial[] = [],
  includeSeeds = false,
  extra: ExtraDiscoverySelection = {},
) {
  const parts: string[] = [];
  if (includeFlights && attempts.length)
    parts.push(
      `Selected flights (toy wind model):\n${attempts
        .map(
          (a) =>
            `${a.wing} wings · ${a.route} · ${a.distance} m · ${a.reached ? "beacon reached" : "soft cove landing"}`,
        )
        .join("\n")}`,
    );
  if (includeNote && note.trim()) parts.push(`My discovery: ${note.trim()}`);
  if (includeSeeds && seedTrials.length)
    parts.push(
      `Selected seed releases (toy dispersal model):\n${seedTrials.map((trial) => `${trial.shape} seed · ${trial.breeze} breeze · ${trial.distance} m · ${trial.bed} bed`).join("\n")}`,
    );
  if (extra.includeWater && extra.waterRoutes?.length)
    parts.push(
      `Selected water routes (toy allocation model; each cup replaces the previous one):\n${extra.waterRoutes
        .map((gate) => {
          const flow = routeWater(gate);
          return `${gate} route · cove ${flow.cove}, slope ${flow.slope}, terrace ${flow.terrace} drops`;
        })
        .join("\n")}`,
    );
  if (extra.includeSky && extra.sky)
    parts.push(
      `Selected current sky setup (toy projection model, not a history):\n${extra.sky.constellation} constellation · ${extra.sky.lens} lens · five lights · ${extra.sky.lens === "close" ? "1.6× spread relative to wide lens" : "centered at wide-lens scale"}`,
    );
  if (!parts.length) return "";
  return `The Awakening — learner-selected observations, not proof of mastery.\n\n${parts.join("\n\n")}`;
}

// A glider discovery must never be filed under an unrelated fraction quest.
// The API still owns all account/approval/guardian/educator authorization.
export function isAwakeningRecord(detail: LearningJourneyDetail) {
  return (
    detail.experience !== null &&
    detail.journey.questId === detail.experience.questId &&
    JSON.stringify(detail.experience.scene) ===
      JSON.stringify(awakeningExperience.scene)
  );
}
