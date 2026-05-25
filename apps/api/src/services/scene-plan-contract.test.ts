import assert from "node:assert/strict";
import test from "node:test";
import { createQuestRequestSchema, scenePlanSchema } from "@headstrong/core";

test("scene plan contract rejects invalid interaction targets", () => {
  assert.throws(() =>
    scenePlanSchema.parse({
      version: "v1",
      id: "invalid-scene",
      templateId: "fractions-lab",
      title: "Invalid Scene",
      summary: "Broken target reference.",
      timeboxMinutes: 10,
      entities: [],
      interactions: [
        {
          id: "inspect-1",
          type: "inspect",
          prompt: "Inspect the object.",
          targetEntityId: "missing-entity",
          successSignal: "done",
        },
      ],
      assets: [],
      accessibility: {
        keyboardNavigation: true,
        captions: true,
        narration: true,
        contrastMode: true,
      },
    }),
  );
});

test("quest persistence boundary rejects invalid scene plans", () => {
  assert.throws(() =>
    createQuestRequestSchema.parse({
      studentId: crypto.randomUUID(),
      parentId: crypto.randomUUID(),
      composition: {
        version: "v3",
        state: "preview-only",
        title: "Fractions Quest",
        summary: "Scene validation should fail before persistence.",
        moderation: {
          labels: [],
          verdict: "pass",
        },
        templateId: "fractions-lab",
        scenePlan: {
          version: "v1",
          id: "scene-one",
          templateId: "fractions-lab",
          title: "Fractions Lab",
          summary: "Too many entities.",
          timeboxMinutes: 10,
          entities: Array.from({ length: 25 }, (_, index) => ({
            id: `entity-${index}`,
            type: "object",
            label: `Entity ${index}`,
            assetRef: `asset:${index}`,
            position: { x: 0, y: 0, z: 0 },
          })),
          interactions: [],
          assets: [],
          accessibility: {
            keyboardNavigation: true,
            captions: true,
            narration: true,
            contrastMode: true,
          },
        },
        highLevelPlan: ["Step 1"],
        tasks: [
          {
            title: "Scene task",
            kind: "scene",
            summary: "Broken scene task.",
            contentRef: "asset:scene-task",
            templateId: "fractions-lab-task-1",
            scenePlan: {
              version: "v1",
              id: "scene-task",
              templateId: "fractions-lab-task-1",
              title: "Broken Scene Task",
              summary: "Broken target.",
              timeboxMinutes: 10,
              entities: [],
              interactions: [
                {
                  id: "inspect-missing",
                  type: "inspect",
                  prompt: "Inspect missing object.",
                  targetEntityId: "missing-entity",
                  successSignal: "done",
                },
              ],
              assets: [],
              accessibility: {
                keyboardNavigation: true,
                captions: true,
                narration: true,
                contrastMode: true,
              },
            },
            estimatedMinutes: 10,
          },
        ],
        contentReferences: [],
        estimatedMinutes: 10,
        requiredApprovals: ["parent"],
      },
    }),
  );
});
