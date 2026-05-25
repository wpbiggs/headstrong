import { z } from "zod";

export const safetyPreferenceSchema = z.object({
  enableNarration: z.boolean().default(true),
  enableCaptions: z.boolean().default(true),
  allowSocialDiscovery: z.boolean().default(false),
});

export const studentProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1),
  interests: z.array(z.string().min(1)).default([]),
  skillBaselines: z.record(z.string(), z.number().min(0).max(100)).default({}),
  constraints: z.array(z.string()).default([]),
  safetyPreferences: safetyPreferenceSchema,
});

export const parentSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1),
  studentIds: z.array(z.string().uuid()).default([]),
});

export const educatorSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1),
  specialties: z.array(z.string()).default([]),
});
