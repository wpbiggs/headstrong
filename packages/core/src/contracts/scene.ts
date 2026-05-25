import { z } from "zod";

export const sceneEntitySchema = z.object({
  id: z.string().min(1),
  type: z.enum(["character", "object", "environment", "ui"]),
  label: z.string().min(1),
  assetRef: z.string().min(1),
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
  uri: z.string().min(1),
});

export const sceneAccessibilitySchema = z.object({
  keyboardNavigation: z.boolean(),
  captions: z.boolean(),
  narration: z.boolean(),
  contrastMode: z.boolean(),
});

export const scenePlanSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  timeboxMinutes: z.number().int().positive(),
  entities: z.array(sceneEntitySchema),
  interactions: z.array(sceneInteractionSchema),
  assets: z.array(sceneAssetSchema),
  accessibility: sceneAccessibilitySchema,
});

export type ScenePlan = z.infer<typeof scenePlanSchema>;
