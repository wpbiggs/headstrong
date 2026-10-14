import { z } from "zod";
import { experienceSpecSchema } from "./experience";
import { portfolioArtifactSchema } from "./portfolio";

export const learningGoalInputSchema = z.object({
  objective: z.string().trim().min(5).max(500),
});
export const selectLearningQuestSchema = z.object({
  questId: z.string().uuid(),
});
export const learningEvidenceInputSchema = z.object({
  reflection: z.string().trim().min(10).max(2000),
  observedEntityIds: z.array(z.string().min(1).max(200)).min(1).max(24),
});
export const learningFeedbackInputSchema = z.object({
  assessment: z.enum(["demonstrated", "needs_practice"]),
  comment: z.string().trim().min(5).max(2000),
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
    taskId: z.string().uuid(),
    ...learningEvidenceInputSchema.shape,
  });
export const learningJourneySchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().uuid(),
  objective: learningGoalInputSchema.shape.objective,
  questId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  evidence: learningEvidenceSchema.nullable(),
  feedback: learningFeedbackInputSchema
    .extend({ educatorId: z.string().uuid(), createdAt: z.string().datetime() })
    .nullable(),
  satisfaction: learningSatisfactionInputSchema.nullable(),
});
export const learningJourneyDetailSchema = z.object({
  journey: learningJourneySchema,
  experience: experienceSpecSchema.nullable(),
});

export type LearningJourney = z.infer<typeof learningJourneySchema>;
export type LearningJourneyDetail = z.infer<typeof learningJourneyDetailSchema>;
