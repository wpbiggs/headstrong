import { z } from "zod";
import { roleSchema } from "./auth/roles";
import {
  composeQuestResponseSchema,
  type composedQuestTaskSchema,
  questModerationSchema,
} from "./contracts/quest";
import { scenePlanSchema } from "./contracts/scene";

export const questStateSchema = z.enum([
  "draft",
  "awaiting_approval",
  "live",
  "completed",
  "rejected",
  "deleted",
]);

export const questEventTypeSchema = z.enum([
  "draft_created",
  "submitted_for_approval",
  "parent_approved",
  "educator_intervened",
  "educator_reviewed",
  "completed",
  "rejected",
  "deleted",
]);

export const questTaskSchema = z.object({
  id: z.string().uuid(),
  questId: z.string().uuid(),
  title: z.string().min(1),
  kind: z.enum(["lesson", "exercise", "scene"]),
  summary: z.string().min(1),
  contentRef: z.string().min(1),
  templateId: z.string().min(1),
  scenePlan: scenePlanSchema,
  position: z.number().int().nonnegative(),
  estimatedMinutes: z.number().int().positive(),
  createdAt: z.string().datetime(),
});

export const questSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  name: z.string().min(1),
  summary: z.string().min(1),
  moderation: questModerationSchema,
  needsEducatorReview: z.boolean(),
  currentState: questStateSchema,
  parentId: z.string().uuid(),
  educatorId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const questEventSchema = z.object({
  id: z.string().uuid(),
  questId: z.string().uuid(),
  type: questEventTypeSchema,
  performedByUserId: z.string().uuid(),
  performedByRole: roleSchema,
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
});

export const createQuestRequestSchema = z.object({
  studentId: z.string().uuid(),
  parentId: z.string().uuid(),
  educatorId: z.string().uuid().nullable().optional(),
  composition: composeQuestResponseSchema,
});

export const questTransitionRequestSchema = z.object({
  notes: z.string().min(1).max(2000).optional(),
  reason: z.string().min(1).max(500).optional(),
});

export const questAuditResponseSchema = z.object({
  quest: questSchema,
  events: z.array(questEventSchema),
  tasks: z.array(questTaskSchema),
});

export type QuestState = z.infer<typeof questStateSchema>;
export type QuestEventType = z.infer<typeof questEventTypeSchema>;
export type Quest = z.infer<typeof questSchema>;
export type QuestEvent = z.infer<typeof questEventSchema>;
export type QuestTask = z.infer<typeof questTaskSchema>;
export type CreateQuestRequest = z.infer<typeof createQuestRequestSchema>;

const transitionRules: Record<
  QuestEventType,
  {
    from: Array<QuestState | null>;
    roles: z.infer<typeof roleSchema>[];
    to: QuestState | null;
  }
> = {
  draft_created: {
    from: [null],
    roles: ["student", "parent", "admin"],
    to: "draft",
  },
  submitted_for_approval: {
    from: ["draft", "rejected"],
    roles: ["student", "parent", "admin"],
    to: "awaiting_approval",
  },
  parent_approved: {
    from: ["awaiting_approval"],
    roles: ["parent", "admin"],
    to: "live",
  },
  educator_intervened: {
    from: ["awaiting_approval", "live"],
    roles: ["educator", "admin"],
    to: null,
  },
  educator_reviewed: {
    from: ["draft", "awaiting_approval", "live", "completed", "rejected"],
    roles: ["educator", "admin"],
    to: null,
  },
  completed: {
    from: ["live"],
    roles: ["student", "educator", "admin"],
    to: "completed",
  },
  rejected: {
    from: ["awaiting_approval", "live"],
    roles: ["parent", "educator", "admin"],
    to: "rejected",
  },
  deleted: {
    from: ["draft", "rejected"],
    roles: ["student", "parent", "admin"],
    to: "deleted",
  },
};

export function applyQuestEventTransition(
  currentState: QuestState | null,
  eventType: QuestEventType,
  performedByRole: z.infer<typeof roleSchema>,
) {
  const rule = transitionRules[eventType];

  if (!rule.from.includes(currentState)) {
    throw new Error(
      `Invalid quest transition: cannot apply ${eventType} from ${currentState ?? "none"}`,
    );
  }

  if (!rule.roles.includes(performedByRole)) {
    throw new Error(
      `Invalid quest transition actor: ${performedByRole} cannot perform ${eventType}`,
    );
  }

  return rule.to ?? currentState;
}

export function deriveQuestStateFromEvents(events: QuestEvent[]) {
  let currentState: QuestState | null = null;

  for (const event of events) {
    currentState = applyQuestEventTransition(
      currentState,
      event.type,
      event.performedByRole,
    );
  }

  return currentState;
}

export function buildQuestTaskInputs(
  questId: string,
  tasks: z.infer<typeof composedQuestTaskSchema>[],
) {
  return tasks.map((task, index) => ({
    questId,
    title: task.title,
    kind: task.kind,
    summary: task.summary,
    contentRef: task.contentRef,
    templateId: task.templateId,
    scenePlan: task.scenePlan,
    position: index,
    estimatedMinutes: task.estimatedMinutes,
  }));
}
