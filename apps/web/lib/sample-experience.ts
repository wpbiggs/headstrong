import { experienceSpecSchema } from "@headstrong/core";

// A local, explicitly labelled sample. It grants no account, approval or mastery.
export const sampleExperience = experienceSpecSchema.parse({
  version: "v1",
  questId: "00000000-0000-4000-8000-000000000001",
  taskId: "00000000-0000-4000-8000-000000000002",
  objective: "Discover how equal parts make a whole.",
  scene: {
    version: "v1",
    id: "equal-parts-studio",
    templateId: "fraction-blocks",
    title: "The whole picture",
    summary:
      "One whole, two halves, four quarters. Each row has the same total width. Inspect the pieces and look for connections.",
    timeboxMinutes: 10,
    entities: [
      {
        id: "whole",
        type: "object",
        label: "One whole",
        assetRef: "template/whole",
        position: { x: 0, y: 0, z: 0 },
      },
      ...[0, 1].map((i) => ({
        id: `half-${i}`,
        type: "object",
        label: `Half ${i + 1}`,
        assetRef: "template/half",
        position: { x: i, y: 0, z: -1 },
      })),
      ...[0, 1, 2, 3].map((i) => ({
        id: `quarter-${i}`,
        type: "object",
        label: `Quarter ${i + 1}`,
        assetRef: "template/quarter",
        position: { x: i, y: 0, z: -2 },
      })),
    ],
    interactions: [
      {
        id: "compare",
        type: "inspect",
        prompt: "How many quarters would you need to match one half?",
        targetEntityId: "half-0",
        successSignal: "self_reported_observation",
      },
      {
        id: "notice",
        type: "observe",
        prompt: "What changes as you divide the whole? What stays the same?",
        targetEntityId: "whole",
        successSignal: "self_reported_observation",
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
