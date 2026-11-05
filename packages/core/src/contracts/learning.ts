import { z } from "zod";
import { experienceSpecSchema } from "./experience";
import { portfolioArtifactSchema } from "./portfolio";
import { scenePlanSchema } from "./scene";

export const learningGoalInputSchema = z.object({
  objective: z.string().trim().min(5).max(500),
});
export const selectLearningQuestSchema = z.object({
  questId: z.string().guid(),
});
export const learningEvidenceInputSchema = z.object({
  reflection: z.string().trim().min(10).max(2000),
  observedEntityIds: z.array(z.string().min(1).max(200)).min(1).max(24),
});
export const learningDiscoveryInputSchema = learningEvidenceInputSchema
  .extend({
    submissionId: z.string().guid().toLowerCase(),
    questId: z.string().guid().toLowerCase(),
    scene: scenePlanSchema,
  })
  .strict();
export const learningFeedbackInputSchema = z.object({
  assessment: z.enum(["demonstrated", "needs_practice"]),
  comment: z.string().trim().min(5).max(2000),
});
export const learningGuardianFeedbackInputSchema = z.strictObject({
  comment: z
    .string()
    .trim()
    .min(5)
    .max(2000)
    .refine(
      (value) => Array.from(value).length >= 5,
      "Use at least five characters.",
    ),
});
export const learningSatisfactionInputSchema = z.object({
  enjoyment: z.number().int().min(1).max(5),
  agency: z.number().int().min(1).max(5),
  challenge: z.number().int().min(1).max(5),
});
export const learningEvidenceSchema = portfolioArtifactSchema
  .omit({ url: true, kind: true })
  .extend({
    kind: z.literal("text"),
    taskId: z.string().guid(),
    ...learningEvidenceInputSchema.shape,
  });
export const learningJourneySchema = z.object({
  id: z.string().guid(),
  learnerId: z.string().guid(),
  objective: learningGoalInputSchema.shape.objective,
  questId: z.string().guid().nullable(),
  createdAt: z.string().datetime(),
  evidence: learningEvidenceSchema.nullable(),
  feedback: learningFeedbackInputSchema
    .extend({ educatorId: z.string().guid(), createdAt: z.string().datetime() })
    .nullable(),
  guardianFeedback: learningGuardianFeedbackInputSchema
    .extend({ guardianId: z.string().guid(), createdAt: z.string().datetime() })
    .nullable()
    .default(null),
  satisfaction: learningSatisfactionInputSchema.nullable(),
});
export const learningJourneyDetailSchema = z.object({
  journey: learningJourneySchema,
  experience: experienceSpecSchema.nullable(),
});
export const learningDiscoveryReceiptSchema = z.object({
  detail: learningJourneyDetailSchema,
  replayed: z.boolean(),
});
export const learningQuestChoicesSchema = z.object({
  items: z.array(experienceSpecSchema).max(10),
});
export const learningRecordChoicesSchema = z.object({
  viewerRole: z.enum(["student", "parent", "educator"]),
  items: z
    .array(
      z.object({
        id: z.string().guid(),
        objective: learningGoalInputSchema.shape.objective,
        questId: z.string().guid(),
        templateId: z.string(),
        createdAt: z.string().datetime(),
        hasEvidence: z.boolean(),
        hasEducatorFeedback: z.boolean(),
        hasGuardianFeedback: z.boolean(),
      }),
    )
    .max(10),
});

export type LearningJourney = z.infer<typeof learningJourneySchema>;
export type LearningJourneyDetail = z.infer<typeof learningJourneyDetailSchema>;
