import {
  type Session,
  questLmsCompletionRequestSchema,
  questLmsPublishRequestSchema,
} from "@headstrong/core";
import { mapQuestToMoodleActivity } from "@headstrong/lms-adapters";
import { env } from "../env";
import {
  type QuestRepository,
  createQuestRepository,
} from "../repositories/app-repository";

export class LmsServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function createLmsService(
  repository: QuestRepository = createQuestRepository(),
) {
  return {
    async publishQuest(user: Session, questId: string, input: unknown) {
      if (!env.ENABLE_MOODLE_ADAPTER) {
        throw new LmsServiceError("Moodle adapter is disabled.", 409);
      }
      const parsed = questLmsPublishRequestSchema.parse(input);
      if (parsed.provider !== "moodle") {
        throw new LmsServiceError(
          "Only Moodle publishing is enabled in v1.",
          422,
        );
      }
      const quest = await repository.getQuestById(questId);
      if (!quest) {
        throw new LmsServiceError("Quest not found.", 404);
      }
      const tasks = await repository.getQuestTasks(questId);
      const publishResult = await mapQuestToMoodleActivity({
        questId: quest.id,
        title: quest.name,
        summary: quest.summary,
        assignments: tasks.map((task) => ({
          externalId: `${quest.id}:${task.id}`,
          title: task.title,
          instructions: task.summary,
        })),
      });
      const created = await repository.createLmsSyncEvent({
        provider: "moodle",
        questId,
        learnerId: quest.studentId,
        assignmentExternalId: null,
        idempotencyKey: publishResult.idempotencyKey,
        payload: publishResult,
      });
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: created ? "quest_lms_published" : "quest_lms_publish_replayed",
        entityType: "quest",
        entityId: questId,
        payload: publishResult,
      });
      return publishResult;
    },

    async recordCompletion(user: Session, questId: string, input: unknown) {
      const parsed = questLmsCompletionRequestSchema.parse(input);
      if (parsed.provider !== "moodle") {
        throw new LmsServiceError(
          "Only Moodle completion ingestion is enabled in v1.",
          422,
        );
      }
      const idempotencyKey = `completion:${questId}:${parsed.assignmentExternalId}:${parsed.learnerId}:${parsed.completedAt}`;
      const created = await repository.createLmsSyncEvent({
        provider: "moodle",
        questId,
        learnerId: parsed.learnerId,
        assignmentExternalId: parsed.assignmentExternalId,
        idempotencyKey,
        payload: parsed,
      });
      const current = await repository.getMasterySignal(
        parsed.learnerId,
        parsed.skillId,
      );
      const nextEvidenceCount = created
        ? (current?.evidenceCount ?? 0) + 1
        : (current?.evidenceCount ?? 0);
      const nextScore = current
        ? (current.score + parsed.score) / 2
        : parsed.score;
      const masterySignal = await repository.upsertMasterySignal({
        learnerId: parsed.learnerId,
        skillId: parsed.skillId,
        score: nextScore,
        evidenceCount: nextEvidenceCount,
      });
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: created
          ? "quest_lms_completion_recorded"
          : "quest_lms_completion_replayed",
        entityType: "quest",
        entityId: questId,
        payload: {
          assignmentExternalId: parsed.assignmentExternalId,
          masterySignal,
        },
      });
      return masterySignal;
    },
  };
}
