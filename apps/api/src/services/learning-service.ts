import { randomUUID } from "node:crypto";
import {
  type LearningJourney,
  type Session,
  experienceSpecSchema,
  learningEvidenceInputSchema,
  learningFeedbackInputSchema,
  learningGoalInputSchema,
  learningJourneyDetailSchema,
  learningSatisfactionInputSchema,
  selectLearningQuestSchema,
} from "@headstrong/core";
import { moderateText } from "@headstrong/moderation";
import {
  type LearningRepository,
  createLearningRepository,
} from "../repositories/learning-repository";

export class LearningError extends Error {
  constructor(
    message: string,
    public readonly status: 403 | 404 | 409 | 422,
  ) {
    super(message);
  }
}

function requireLearner(user: Session, goal?: LearningJourney) {
  if (user.role !== "student" || (goal && goal.learnerId !== user.sub)) {
    throw new LearningError("Only the owning learner may do this.", 403);
  }
}

function requireSafeText(text: string) {
  if (moderateText(text).label !== "safe") {
    throw new LearningError(
      "Text requires safeguarding review; it was not saved.",
      422,
    );
  }
}

async function approvedQuest(repo: LearningRepository, goal: LearningJourney) {
  if (!goal.questId)
    throw new LearningError("Select an approved quest first.", 409);
  const quest = await repo.lockQuest(goal.questId);
  if (!quest || quest.studentId !== goal.learnerId) {
    throw new LearningError("Quest is unavailable.", 409);
  }
  const guardianLinked = await repo.lockParentLink(
    quest.parentId,
    quest.studentId,
  );
  const events = await repo.quests.getQuestEvents(quest.id);
  const educator = quest.educatorId
    ? await repo.quests.getUserById(quest.educatorId)
    : null;
  if (
    quest.currentState !== "live" ||
    quest.needsEducatorReview ||
    quest.moderation.verdict === "block" ||
    !guardianLinked ||
    educator?.role !== "educator" ||
    !events.some(
      (event) =>
        event.type === "parent_approved" &&
        event.performedByUserId === quest.parentId &&
        event.performedByRole === "parent",
    )
  ) {
    throw new LearningError(
      "Quest needs current parent approval, educator assignment and safety clearance.",
      409,
    );
  }
  return quest;
}

async function authorizeRead(
  repo: LearningRepository,
  user: Session,
  goal: LearningJourney,
) {
  if (user.role === "student" && user.sub === goal.learnerId) return;
  const quest = goal.questId ? await repo.lockQuest(goal.questId) : null;
  if (
    quest &&
    user.role === "educator" &&
    user.sub === quest.educatorId &&
    (await repo.lockParentLink(quest.parentId, goal.learnerId))
  )
    return;
  if (
    quest &&
    user.role === "parent" &&
    user.sub === quest.parentId &&
    (await repo.lockParentLink(user.sub, goal.learnerId))
  )
    return;
  // Admin role is deliberately not a blanket permission to private reflections.
  throw new LearningError("Learning record access denied.", 403);
}

async function experienceFor(repo: LearningRepository, goal: LearningJourney) {
  const tasks = goal.questId
    ? await repo.quests.getQuestTasks(goal.questId)
    : [];
  const task = tasks.find((item) => item.scenePlan.entities.length > 0);
  if (!task) throw new LearningError("Quest has no supported scene task.", 409);
  return experienceSpecSchema.parse({
    version: "v1",
    questId: task.questId,
    taskId: task.id,
    objective: goal.objective,
    scene: task.scenePlan,
  });
}

export function createLearningService(
  repository: LearningRepository = createLearningRepository(),
) {
  async function audit(
    repo: LearningRepository,
    user: Session,
    goalId: string,
    action: string,
  ) {
    await repo.quests.logAuditEvent({
      actorUserId: user.sub,
      entityId: goalId,
      entityType: "learning_goal",
      action,
      payload: {},
    });
  }

  async function mutate(
    user: Session,
    id: string,
    work: (repo: LearningRepository, goal: LearningJourney) => Promise<void>,
  ) {
    return repository.transaction(async (repo) => {
      const goal = await repo.getGoal(id, true);
      if (!goal) throw new LearningError("Goal not found.", 404);
      await authorizeRead(repo, user, goal);
      await work(repo, goal);
      const updated = await repo.getGoal(id);
      if (!updated) throw new LearningError("Goal not found.", 404);
      return updated;
    });
  }

  return {
    async createGoal(user: Session, input: unknown) {
      requireLearner(user);
      const { objective } = learningGoalInputSchema.parse(input);
      requireSafeText(objective);
      return repository.transaction(async (repo) => {
        const goal = await repo.createGoal(user.sub, objective);
        await audit(repo, user, goal.id, "learning_goal_created");
        return goal;
      });
    },
    async getJourney(user: Session, id: string) {
      return repository.transaction(async (repo) => {
        const journey = await repo.getGoal(id, true);
        if (!journey) throw new LearningError("Goal not found.", 404);
        await authorizeRead(repo, user, journey);
        let experience = null;
        if (journey.questId) {
          try {
            await approvedQuest(repo, journey);
            experience = await experienceFor(repo, journey);
          } catch (error) {
            if (!(error instanceof LearningError && error.status === 409))
              throw error;
          }
        }
        await audit(repo, user, id, "learning_record_read");
        return learningJourneyDetailSchema.parse({ journey, experience });
      });
    },
    async selectQuest(user: Session, id: string, input: unknown) {
      const { questId } = selectLearningQuestSchema.parse(input);
      return mutate(user, id, async (repo, goal) => {
        requireLearner(user, goal);
        if (goal.questId)
          throw new LearningError(
            "Quest selection is immutable; create a new goal to change it.",
            409,
          );
        const linked = { ...goal, questId };
        await approvedQuest(repo, linked);
        await experienceFor(repo, linked);
        await repo.selectQuest(id, questId);
        await audit(repo, user, id, "learning_quest_selected");
      });
    },
    async submitEvidence(user: Session, id: string, input: unknown) {
      const parsed = learningEvidenceInputSchema.parse(input);
      requireSafeText(parsed.reflection);
      return mutate(user, id, async (repo, goal) => {
        requireLearner(user, goal);
        if (goal.evidence)
          throw new LearningError("Evidence is already submitted.", 409);
        await approvedQuest(repo, goal);
        const spec = await experienceFor(repo, goal);
        const ids = new Set(parsed.observedEntityIds);
        if (
          ids.size !== parsed.observedEntityIds.length ||
          [...ids].some(
            (entityId) =>
              !spec.scene.entities.some((entity) => entity.id === entityId),
          )
        ) {
          throw new LearningError(
            "Observation does not belong to this experience.",
            422,
          );
        }
        await repo.insertEvidence(goal, {
          id: randomUUID(),
          kind: "text",
          questId: spec.questId,
          taskId: spec.taskId,
          ...parsed,
          submittedAt: new Date().toISOString(),
        });
        await audit(repo, user, id, "learning_evidence_submitted");
      });
    },
    async submitFeedback(user: Session, id: string, input: unknown) {
      const parsed = learningFeedbackInputSchema.parse(input);
      requireSafeText(parsed.comment);
      return mutate(user, id, async (repo, goal) => {
        const quest = await approvedQuest(repo, goal);
        if (user.role !== "educator" || user.sub !== quest.educatorId) {
          throw new LearningError(
            "Only the assigned educator may assess evidence.",
            403,
          );
        }
        if (!goal.evidence || goal.feedback)
          throw new LearningError(
            "Feedback requires unreviewed evidence.",
            409,
          );
        await repo.insertFeedback(id, {
          ...parsed,
          educatorId: user.sub,
          createdAt: new Date().toISOString(),
        });
        await audit(repo, user, id, "learning_feedback_submitted");
      });
    },
    async submitSatisfaction(user: Session, id: string, input: unknown) {
      const parsed = learningSatisfactionInputSchema.parse(input);
      return mutate(user, id, async (repo, goal) => {
        requireLearner(user, goal);
        await approvedQuest(repo, goal);
        if (!goal.feedback || goal.satisfaction)
          throw new LearningError(
            "Ratings require feedback and may be submitted once.",
            409,
          );
        await repo.insertSatisfaction(id, parsed);
        await audit(repo, user, id, "learning_satisfaction_submitted");
      });
    },
  };
}
