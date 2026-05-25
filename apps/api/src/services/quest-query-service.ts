import {
  type QuestState,
  type Session,
  educatorQuestInboxRuleSchema,
  listQuestsResponseSchema,
} from "@headstrong/core";
import {
  type QuestRepository,
  createQuestRepository,
} from "../repositories/app-repository";

export class QuestQueryServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function getDeniedAuditAction(operation: "list" | "read") {
  return operation === "list" ? "quest_list_forbidden" : "quest_read_forbidden";
}

async function logDeniedAudit(
  repository: QuestRepository,
  user: Session,
  operation: "list" | "read",
  payload: Record<string, unknown>,
) {
  await repository.logAuditEvent({
    actorUserId: user.sub,
    action: getDeniedAuditAction(operation),
    entityType: "quest",
    entityId: String(payload.questId ?? payload.role ?? operation),
    payload,
  });
}

function canReadQuestForRole(
  user: Session,
  detail: NonNullable<
    Awaited<ReturnType<QuestRepository["getQuestDashboardDetailById"]>>
  >,
  isParentLinked: boolean,
) {
  if (user.role === "admin") {
    return true;
  }

  if (user.role === "parent") {
    return isParentLinked;
  }

  if (user.role === "educator") {
    return (
      detail.assignedEducator?.id === user.sub ||
      detail.quest.needsEducatorReview ||
      (detail.currentState === "awaiting_approval" &&
        (!detail.assignedEducator || detail.assignedEducator.id === user.sub))
    );
  }

  return false;
}

export function createQuestQueryService(
  repository: QuestRepository = createQuestRepository(),
) {
  return {
    async getQuest(user: Session, questId: string) {
      if (!["parent", "educator", "admin"].includes(user.role)) {
        await logDeniedAudit(repository, user, "read", {
          questId,
          actualRole: user.role,
        });
        throw new QuestQueryServiceError("Forbidden.", 403);
      }

      const detail = await repository.getQuestDashboardDetailById(questId);

      if (!detail) {
        throw new QuestQueryServiceError("Quest not found.", 404);
      }

      const isParentLinked = await repository.isParentOf(
        user.sub,
        detail.quest.studentId,
      );

      if (!canReadQuestForRole(user, detail, isParentLinked)) {
        await logDeniedAudit(repository, user, "read", {
          questId,
          actualRole: user.role,
        });
        throw new QuestQueryServiceError("Forbidden.", 403);
      }

      return detail;
    },

    async listQuests(
      user: Session,
      input: {
        role: "parent" | "educator" | "admin";
        state?: QuestState;
        cursor?: string;
        limit: number;
      },
    ) {
      if (!["parent", "educator", "admin"].includes(user.role)) {
        await logDeniedAudit(repository, user, "list", {
          role: input.role,
          actualRole: user.role,
        });
        throw new QuestQueryServiceError("Forbidden.", 403);
      }

      if (user.role !== "admin" && user.role !== input.role) {
        await logDeniedAudit(repository, user, "list", {
          role: input.role,
          actualRole: user.role,
        });
        throw new QuestQueryServiceError("Forbidden.", 403);
      }

      const result = await repository.listQuestDashboardItems({
        actorUserId: user.sub,
        role: input.role,
        state: input.state,
        cursor: input.cursor,
        limit: input.limit,
      });

      return listQuestsResponseSchema.parse({
        items: result.items,
        nextCursor: result.nextCursor,
        inboxRule:
          input.role === "educator"
            ? educatorQuestInboxRuleSchema.value
            : undefined,
      });
    },
  };
}
