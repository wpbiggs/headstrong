import { z } from "zod";

const maxSceneEntities = 24;
const maxSceneInteractions = 16;
const maxSceneAssets = 32;
const assetRefPattern =
  /^(https?:\/\/|[a-z0-9][a-z0-9-]*(?::|\/))[a-z0-9/_:\-.]*$/i;

export const scenePlanVersionSchema = z.literal("v1");

export const sceneEntitySchema = z.object({
  id: z.string().min(1),
  type: z.enum(["character", "object", "environment", "ui"]),
  label: z.string().min(1),
  assetRef: z.string().regex(assetRefPattern, "Invalid scene asset reference."),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
});

export const sceneInteractionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["inspect", "collect", "drag", "respond", "observe"]),
  prompt: z.string().min(1),
  targetEntityId: z.string().min(1),
  successSignal: z.string().min(1),
});

export const sceneAssetSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["image", "audio", "model", "text"]),
  uri: z.string().regex(assetRefPattern, "Invalid scene asset URI."),
});

export const sceneAccessibilitySchema = z.object({
  keyboardNavigation: z.boolean(),
  captions: z.boolean(),
  narration: z.boolean(),
  contrastMode: z.boolean(),
});

export const scenePlanSchema = z
  .object({
    version: scenePlanVersionSchema,
    id: z.string().min(1),
    templateId: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    timeboxMinutes: z.number().int().positive().max(30),
    entities: z.array(sceneEntitySchema).max(maxSceneEntities),
    interactions: z.array(sceneInteractionSchema).max(maxSceneInteractions),
    assets: z.array(sceneAssetSchema).max(maxSceneAssets),
    accessibility: sceneAccessibilitySchema,
  })
  .superRefine((plan, context) => {
    const entityIds = new Set(plan.entities.map((entity) => entity.id));

    if (entityIds.size !== plan.entities.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scene entities must have unique ids.",
        path: ["entities"],
      });
    }

    const interactionIds = new Set(
      plan.interactions.map((interaction) => interaction.id),
    );

    if (interactionIds.size !== plan.interactions.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scene interactions must have unique ids.",
        path: ["interactions"],
      });
    }

    for (const interaction of plan.interactions) {
      if (!entityIds.has(interaction.targetEntityId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Interaction target '${interaction.targetEntityId}' is missing.`,
          path: ["interactions"],
        });
      }
    }
  });

export type ScenePlan = z.infer<typeof scenePlanSchema>;
