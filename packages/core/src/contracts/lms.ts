import { z } from "zod";

export const lmsProviderSchema = z.enum(["moodle", "erpnext", "gibbon"]);

export const lmsCourseInputSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
});

export const lmsAssignmentInputSchema = z.object({
  courseId: z.string().min(1),
  externalId: z.string().min(1),
  title: z.string().min(1),
  instructions: z.string().min(1),
  dueAt: z.string().datetime().optional(),
});

export const lmsCompletionInputSchema = z.object({
  assignmentId: z.string().min(1),
  learnerId: z.string().uuid(),
  completedAt: z.string().datetime(),
  score: z.number().min(0).max(1),
});

export const lmsGradeSchema = z.object({
  assignmentId: z.string().min(1),
  learnerId: z.string().uuid(),
  score: z.number().min(0).max(1),
  recordedAt: z.string().datetime(),
});

export const lmsResourceRefSchema = z.object({
  provider: lmsProviderSchema,
  resourceId: z.string().min(1),
  externalId: z.string().min(1),
  status: z.enum(["stubbed", "created", "synced"]),
});

export const questLmsPublishResultSchema = z.object({
  provider: lmsProviderSchema,
  course: lmsResourceRefSchema,
  assignments: z.array(lmsResourceRefSchema),
  idempotencyKey: z.string().min(1),
});

export const questLmsPublishRequestSchema = z.object({
  provider: z.enum(["moodle"]),
});

export const questLmsCompletionRequestSchema = z.object({
  provider: z.enum(["moodle"]),
  learnerId: z.string().uuid(),
  assignmentExternalId: z.string().min(1),
  score: z.number().min(0).max(1),
  completedAt: z.string().datetime(),
  skillId: z.string().uuid(),
});
