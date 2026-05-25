import { z } from "zod";
import { studentProfileSchema } from "../profile";
import { scenePlanSchema } from "./scene";

export const questContractVersionSchema = z.literal("v3");
export const educatorQuestInboxRuleSchema = z.literal(
  "assigned_or_warned_review_required_or_unassigned_awaiting_approval",
);
export const questModerationLabelSchema = z.enum([
  "safe",
  "needs_parent_review",
  "needs_educator_review",
  "blocked",
]);
export const questModerationSchema = z.object({
  labels: z.array(questModerationLabelSchema),
  verdict: z.enum(["pass", "warn", "block"]),
});

export const composedQuestTaskSchema = z.object({
  title: z.string().min(1),
  kind: z.enum(["lesson", "exercise", "scene"]),
  summary: z.string().min(1),
  contentRef: z.string().min(1),
  templateId: z.string().min(1),
  scenePlan: scenePlanSchema,
  estimatedMinutes: z.number().int().positive(),
});

export const contentReferenceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(["lesson", "scene", "worksheet", "reading", "prompt"]),
});

export const composeQuestRequestSchema = z.object({
  profile: studentProfileSchema,
  targets: z.array(z.string().min(1)).min(1),
  constraints: z.array(z.string().min(1)).default([]),
  seed: z.string().min(1).optional(),
});

export const composeQuestResponseSchema = z.object({
  version: questContractVersionSchema,
  state: z.literal("preview-only"),
  title: z.string().min(1),
  summary: z.string().min(1),
  moderation: questModerationSchema,
  templateId: z.string().min(1),
  scenePlan: scenePlanSchema,
  highLevelPlan: z.array(z.string().min(1)).min(1),
  tasks: z.array(composedQuestTaskSchema).min(1),
  contentReferences: z.array(contentReferenceSchema),
  estimatedMinutes: z.number().int().positive(),
  requiredApprovals: z.array(z.enum(["parent", "educator"])).min(1),
});

export const questDashboardRoleSchema = z.enum(["parent", "educator", "admin"]);

export const questDashboardItemSchema = z.object({
  quest: z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
    parentId: z.string().uuid(),
    name: z.string().min(1),
    summary: z.string().min(1),
    moderation: questModerationSchema,
    needsEducatorReview: z.boolean(),
  }),
  currentState: z.enum([
    "draft",
    "awaiting_approval",
    "live",
    "completed",
    "rejected",
    "deleted",
  ]),
  lastUpdated: z.string().datetime(),
  assignedEducator: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
    })
    .nullable(),
});

export const questDashboardDetailSchema = questDashboardItemSchema.extend({
  createdAt: z.string().datetime(),
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1),
      kind: z.enum(["lesson", "exercise", "scene"]),
      summary: z.string().min(1),
      contentRef: z.string().min(1),
      templateId: z.string().min(1),
      scenePlan: scenePlanSchema,
      position: z.number().int().nonnegative(),
      estimatedMinutes: z.number().int().positive(),
    }),
  ),
});

export const listQuestsRequestSchema = z.object({
  role: questDashboardRoleSchema,
  state: z
    .enum([
      "draft",
      "awaiting_approval",
      "live",
      "completed",
      "rejected",
      "deleted",
    ])
    .optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listQuestsResponseSchema = z.object({
  items: z.array(questDashboardItemSchema),
  nextCursor: z.string().nullable(),
  inboxRule: educatorQuestInboxRuleSchema.optional(),
});

export type ComposeQuestRequest = z.infer<typeof composeQuestRequestSchema>;
export type ComposeQuestResponse = z.infer<typeof composeQuestResponseSchema>;
export type ComposedQuestTask = z.infer<typeof composedQuestTaskSchema>;
