export * from "./auth/roles";
export * from "./admin";
export * from "./contracts";
export * from "./profile";
export * from "./quest";

import { z } from "zod";
import { roleSchema } from "./auth/roles";
import {
  type educatorSchema,
  type parentSchema,
  safetyPreferenceSchema,
  type studentProfileSchema,
} from "./profile";

export const skillSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  category: z.string().min(1),
});

export const lessonSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  objective: z.string().min(1),
  recommendedAssets: z.array(z.string()).default([]),
});

export const portfolioArtifactSchema = z.object({
  id: z.string().uuid(),
  questId: z.string().uuid(),
  kind: z.enum(["text", "image", "video", "scene", "link"]),
  url: z.string().url(),
  submittedAt: z.string().datetime(),
});

export const masterySignalSchema = z.object({
  skillId: z.string().uuid(),
  score: z.number().min(0).max(1),
  evidenceCount: z.number().int().min(0),
});

export const sessionSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  role: roleSchema,
  sessionId: z.string().uuid(),
});

export type Student = z.infer<typeof studentProfileSchema>;
export type Parent = z.infer<typeof parentSchema>;
export type Educator = z.infer<typeof educatorSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type PortfolioArtifact = z.infer<typeof portfolioArtifactSchema>;
export type MasterySignal = z.infer<typeof masterySignalSchema>;
export type Session = z.infer<typeof sessionSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
});

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  session: sessionSchema,
});

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("api"),
});

export function readEnv<T extends z.ZodRawShape>(
  schemaShape: T,
  source: Record<string, string | undefined>,
) {
  const schema = z.object(schemaShape);
  const parsed = schema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}
