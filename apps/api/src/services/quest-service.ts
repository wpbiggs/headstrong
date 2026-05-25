import { randomUUID } from "node:crypto";
import {
  type CreateQuestRequest,
  type Quest,
  type QuestEventType,
  type Session,
  applyQuestEventTransition,
  buildQuestTaskInputs,
  deriveQuestStateFromEvents,
  questAuditResponseSchema,
} from "@headstrong/core";
import {
  type QuestRepository,
  createQuestRepository,
} from "../repositories/app-repository";

export class QuestServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function requireOwnership(user: Session, quest: Quest, isParentOf: boolean) {
  if (user.role === "admin") {
    return;
  }

  if (user.role === "student" && user.sub === quest.studentId) {
    return;
  }

  if (user.role === "parent" && user.sub === quest.parentId && isParentOf) {
    return;
  }

  throw new QuestServiceError("Forbidden.", 403);
}

async function getQuestOrThrow(repository: QuestRepository, questId: string) {
  const quest = await repository.getQuestById(questId);

  if (!quest) {
    throw new QuestServiceError("Quest not found.", 404);
  }

  return quest;
}

export function createQuestService(
  repository: QuestRepository = createQuestRepository(),
) {
  return {
    async createDraftQuest(user: Session, input: CreateQuestRequest) {
      const parentLinked = await repository.isParentOf(
        input.parentId,
        input.studentId,
      );

      if (!parentLinked) {
        throw new QuestServiceError(
          "Quest parent must be linked to the student.",
          422,
        );
      }

      if (input.composition.moderation.verdict === "block") {
        await repository.logAuditEvent({
          actorUserId: user.sub,
          action: "quest_create_blocked_by_moderation",
          entityType: "quest",
          entityId: input.studentId,
          payload: {
            moderation: input.composition.moderation,
            title: input.composition.title,
            summary: input.composition.summary,
          },
        });

        throw new QuestServiceError("Quest content failed moderation.", 422);
      }

      if (user.role === "student" && user.sub !== input.studentId) {
        throw new QuestServiceError(
          "Students may only create their own quests.",
          403,
        );
      }

      if (user.role === "parent" && user.sub !== input.parentId) {
        throw new QuestServiceError(
          "Parents may only create quests for linked students.",
          403,
        );
      }

      if (!["student", "parent", "admin"].includes(user.role)) {
        throw new QuestServiceError("Forbidden.", 403);
      }

      const questId = randomUUID();

      return repository.transaction(async (transaction) => {
        const nextState = applyQuestEventTransition(
          null,
          "draft_created",
          user.role,
        );

        if (!nextState) {
          throw new QuestServiceError(
            "Draft creation must produce a quest state.",
            500,
          );
        }

        const quest = await transaction.createQuest({
          id: questId,
          studentId: input.studentId,
          name: input.composition.title,
          summary: input.composition.summary,
          moderation: input.composition.moderation,
          needsEducatorReview: input.composition.moderation.verdict === "warn",
          currentState: nextState,
          parentId: input.parentId,
          educatorId: input.educatorId ?? null,
        });

        const tasks = await transaction.insertQuestTasks(
          buildQuestTaskInputs(questId, input.composition.tasks),
        );
        const event = await transaction.insertQuestEvent({
          questId,
          type: "draft_created",
          performedByUserId: user.sub,
          performedByRole: user.role,
          metadata: {
            composition: input.composition,
            taskCount: tasks.length,
          },
        });

        await transaction.logAuditEvent({
          actorUserId: user.sub,
          action: event.type,
          entityType: "quest",
          entityId: questId,
          payload: event.metadata,
        });

        if (input.composition.moderation.verdict === "warn") {
          await transaction.logAuditEvent({
            actorUserId: user.sub,
            action: "quest_moderation_warned",
            entityType: "quest",
            entityId: questId,
            payload: {
              moderation: input.composition.moderation,
              educatorReviewRequired: true,
            },
          });
        }

        return {
          quest,
          tasks,
          event,
        };
      });
    },

    async transitionQuest(
      user: Session,
      questId: string,
      eventType: QuestEventType,
      metadata: Record<string, unknown>,
    ) {
      const quest = await getQuestOrThrow(repository, questId);
      const parentLinked = await repository.isParentOf(
        quest.parentId,
        quest.studentId,
      );

      if (!parentLinked) {
        throw new QuestServiceError(
          "Quest parent relationship is no longer valid.",
          409,
        );
      }

      if (eventType === "parent_approved") {
        if (!["parent", "admin"].includes(user.role)) {
          throw new QuestServiceError(
            "Only parent approvals are accepted here.",
            403,
          );
        }

        if (user.role === "parent" && user.sub !== quest.parentId) {
          throw new QuestServiceError(
            "Parent approval must be performed by the assigned parent.",
            403,
          );
        }
      } else if (eventType === "educator_intervened") {
        if (!["educator", "admin"].includes(user.role)) {
          throw new QuestServiceError("Only educators can intervene.", 403);
        }

        if (
          user.role === "educator" &&
          quest.educatorId &&
          user.sub !== quest.educatorId
        ) {
          throw new QuestServiceError(
            "Intervention must be performed by the assigned educator.",
            403,
          );
        }
      } else if (eventType === "completed") {
        const isParentOfStudent = await repository.isParentOf(
          quest.parentId,
          quest.studentId,
        );
        requireOwnership(user, quest, isParentOfStudent);
      } else {
        const isParentOfStudent = await repository.isParentOf(
          quest.parentId,
          quest.studentId,
        );
        requireOwnership(user, quest, isParentOfStudent);
      }

      const nextState = applyQuestEventTransition(
        quest.currentState,
        eventType,
        user.role,
      );

      if (!nextState) {
        throw new QuestServiceError(
          "Quest transition must resolve to a quest state.",
          500,
        );
      }

      return repository.transaction(async (transaction) => {
        const event = await transaction.insertQuestEvent({
          questId,
          type: eventType,
          performedByUserId: user.sub,
          performedByRole: user.role,
          metadata,
        });

        const updatedQuest = await transaction.updateQuestState(
          questId,
          nextState,
        );
        const events = await transaction.getQuestEvents(questId);
        const derivedState = deriveQuestStateFromEvents(events);

        if (derivedState !== updatedQuest.currentState) {
          throw new QuestServiceError("Quest state verification failed.", 500);
        }

        await transaction.logAuditEvent({
          actorUserId: user.sub,
          action: event.type,
          entityType: "quest",
          entityId: questId,
          payload: metadata,
        });

        return {
          quest: updatedQuest,
          event,
        };
      });
    },

    async reviewQuest(
      user: Session,
      questId: string,
      metadata: Record<string, unknown>,
    ) {
      const quest = await getQuestOrThrow(repository, questId);

      if (!["educator", "admin"].includes(user.role)) {
        throw new QuestServiceError("Only educators can review quests.", 403);
      }

      if (
        user.role === "educator" &&
        quest.educatorId &&
        quest.educatorId !== user.sub
      ) {
        throw new QuestServiceError(
          "Review must be performed by the assigned educator.",
          403,
        );
      }

      const nextState = applyQuestEventTransition(
        quest.currentState,
        "educator_reviewed",
        user.role,
      );

      return repository.transaction(async (transaction) => {
        const event = await transaction.insertQuestEvent({
          questId,
          type: "educator_reviewed",
          performedByUserId: user.sub,
          performedByRole: user.role,
          metadata,
        });
        const updatedQuest = await transaction.updateQuestReviewFlag(
          questId,
          false,
        );

        if (nextState && nextState !== updatedQuest.currentState) {
          throw new QuestServiceError(
            "Quest review must not change lifecycle state.",
            500,
          );
        }

        await transaction.logAuditEvent({
          actorUserId: user.sub,
          action: event.type,
          entityType: "quest",
          entityId: questId,
          payload: {
            ...metadata,
            clearedReviewRequired: true,
          },
        });

        return {
          quest: updatedQuest,
          event,
        };
      });
    },

    async getQuestAudit(user: Session, questId: string) {
      const quest = await getQuestOrThrow(repository, questId);
      const isParentOfStudent = await repository.isParentOf(
        quest.parentId,
        quest.studentId,
      );

      const canReadAsParent =
        user.role === "parent" &&
        user.sub === quest.parentId &&
        isParentOfStudent;
      const canReadAsEducator =
        user.role === "educator" &&
        (!quest.educatorId || user.sub === quest.educatorId);

      if (!(user.role === "admin" || canReadAsParent || canReadAsEducator)) {
        throw new QuestServiceError("Forbidden.", 403);
      }

      const [events, tasks] = await Promise.all([
        repository.getQuestEvents(questId),
        repository.getQuestTasks(questId),
      ]);

      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "quest_audit_read",
        entityType: "quest",
        entityId: questId,
        payload: { readOnly: true },
      });

      return questAuditResponseSchema.parse({ quest, events, tasks });
    },
  };
}
