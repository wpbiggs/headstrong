import { z } from "zod";

export const computeProtocolVersionSchema = z.literal("v1");
export const computeJobTypeSchema = z.enum(["inference", "scoring"]);
export const computeJobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
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

export const computeJobRequestSchema = z.discriminatedUnion("type", [
  z.object({
    version: computeProtocolVersionSchema,
    type: z.literal("inference"),
    payload: computeInferencePayloadSchema,
    providerId: z.string().min(1),
    validatorId: z.string().min(1),
  }),
  z.object({
    version: computeProtocolVersionSchema,
    type: z.literal("scoring"),
    payload: computeScoringPayloadSchema,
    providerId: z.string().min(1),
    validatorId: z.string().min(1),
  }),
]);

export const computeJobResultSchema = z.object({
  output: z.string().min(1),
  score: z.number().min(0).max(1),
  valid: z.boolean(),
  penaltyApplied: z.boolean(),
});

export const computeJobEventTypeSchema = z.enum([
  "queued",
  "started",
  "succeeded",
  "failed",
  "retry_scheduled",
]);

export const computeJobEventSchema = z.object({
  id: z.string().guid(),
  jobId: z.string().guid(),
  type: computeJobEventTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
});

export const providerRunSchema = z.object({
  id: z.string().guid(),
  jobId: z.string().guid(),
  providerId: z.string().min(1),
  validatorId: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
  attempt: z.number().int().positive(),
  createdAt: z.string().datetime(),
});

export const computeJobSchema = z.object({
  id: z.string().guid(),
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
  retryCount: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  nextAttemptAt: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const computeJobListRequestSchema = z.object({
  state: computeJobStatusSchema.optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

export const computeJobListResponseSchema = z.object({
  items: z.array(computeJobSchema),
  nextCursor: z.string().nullable(),
});

export const computeJobDetailSchema = z.object({
  job: computeJobSchema,
  events: z.array(computeJobEventSchema),
  providerRuns: z.array(providerRunSchema),
});

export type ComputeJob = z.infer<typeof computeJobSchema>;
