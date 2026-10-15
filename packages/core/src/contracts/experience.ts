import { z } from "zod";
import { scenePlanSchema } from "./scene";

// No engine types, executable content or extra asset-loading authority.
export const experienceSpecSchema = z.object({
  version: z.literal("v1"),
  questId: z.string().uuid(),
  taskId: z.string().uuid(),
  objective: z.string().trim().min(1).max(500),
  scene: scenePlanSchema,
});

export type ExperienceSpec = z.infer<typeof experienceSpecSchema>;
