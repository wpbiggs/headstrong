import { z } from "zod";

export const curriculumAssetStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
]);

export const curriculumContributionTypeSchema = z.enum([
  "original",
  "remix",
  "translation",
  "adaptation",
]);

export const curriculumAssetSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(140),
  summary: z.string().min(1).max(2000),
  subject: z.string().min(1).max(80),
  gradeBand: z.string().min(1).max(40),
  license: z.string().min(1).max(80),
  sourceUrl: z.string().url(),
  tags: z.array(z.string().min(1).max(32)).max(12),
  contributorUserId: z.string().uuid(),
  contributionType: curriculumContributionTypeSchema,
  status: curriculumAssetStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const curriculumRemixEdgeSchema = z.object({
  id: z.string().uuid(),
  parentAssetId: z.string().uuid(),
  childAssetId: z.string().uuid(),
  relation: z.enum(["remixed_from", "translated_from", "adapted_from"]),
  createdAt: z.string().datetime(),
});

export const contributorScoreSchema = z.object({
  contributorUserId: z.string().uuid(),
  assetCount: z.number().int().nonnegative(),
  remixCount: z.number().int().nonnegative(),
  impactCount: z.number().int().nonnegative(),
  score: z.number().nonnegative(),
});

export const curriculumAssetDetailSchema = z.object({
  asset: curriculumAssetSchema,
  parents: z.array(curriculumAssetSchema),
  children: z.array(curriculumAssetSchema),
  contributorScore: contributorScoreSchema,
});

export const createCurriculumAssetRequestSchema = z.object({
  title: z.string().min(1).max(140),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  summary: z.string().min(1).max(2000),
  subject: z.string().min(1).max(80),
  gradeBand: z.string().min(1).max(40),
  license: z.string().min(1).max(80),
  sourceUrl: z.string().url(),
  tags: z.array(z.string().min(1).max(32)).max(12).default([]),
  contributionType: curriculumContributionTypeSchema.default("original"),
});

export const remixCurriculumAssetRequestSchema = z.object({
  title: z.string().min(1).max(140),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  summary: z.string().min(1).max(2000),
  relation: z.enum(["remixed_from", "translated_from", "adapted_from"]),
});

export const recordCurriculumImpactRequestSchema = z.object({
  learnerId: z.string().uuid().optional(),
  questId: z.string().uuid().optional(),
  signal: z.enum(["view", "reuse", "completion"]),
  weight: z.number().positive().max(10).default(1),
});

export const listCurriculumAssetsRequestSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
  subject: z.string().min(1).max(80).optional(),
  tag: z.string().min(1).max(32).optional(),
});

export const listCurriculumAssetsResponseSchema = z.object({
  items: z.array(curriculumAssetSchema),
  nextCursor: z.string().nullable(),
});

export type CurriculumAsset = z.infer<typeof curriculumAssetSchema>;
export type ContributorScore = z.infer<typeof contributorScoreSchema>;
