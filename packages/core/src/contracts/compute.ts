import { z } from "zod";

export const computeProtocolVersionSchema = z.literal("v1");
export const computeJobTypeSchema = z.enum(["inference", "scoring"]);
export const computeJobStatusSchema = z.enum([
  "queued",
  "running",
  "validated",
  "failed",
]);

export const computeInferencePayloadSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1),
  expectedOutput: z.string().optional(),
  maxTokens: z.number().int().positive().max(4096).default(256),
  aggregateOnly: z.boolean().default(true),
});

export const computeScoringPayloadSchema = z.object({
  candidate: z.string().min(1),
  rubric: z.string().min(1),
  expectedScore: z.number().min(0).max(1).optional(),
  aggregateOnly: z.boolean().default(true),
});

export const computeJobRequestSchema = z.object({
  version: computeProtocolVersionSchema,
  type: computeJobTypeSchema,
  payload: z.union([
    computeInferencePayloadSchema,
    computeScoringPayloadSchema,
  ]),
  providerId: z.string().min(1),
  validatorId: z.string().min(1),
});

export const computeJobResultSchema = z.object({
  output: z.string().min(1),
  score: z.number().min(0).max(1),
  valid: z.boolean(),
  penaltyApplied: z.boolean(),
});

export const computeJobSchema = z.object({
  id: z.string().uuid(),
  version: computeProtocolVersionSchema,
  type: computeJobTypeSchema,
  status: computeJobStatusSchema,
  payload: z.union([
    computeInferencePayloadSchema,
    computeScoringPayloadSchema,
  ]),
  providerId: z.string().min(1),
  validatorId: z.string().min(1),
  result: computeJobResultSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ComputeJob = z.infer<typeof computeJobSchema>;
