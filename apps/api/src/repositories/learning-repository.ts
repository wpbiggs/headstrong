import {
  type LearningJourney,
  type Session,
  learningJourneySchema,
} from "@headstrong/core";
import { type DatabaseClient, getDefaultDatabase } from "../db";
import { type QuestRepository, createQuestRepository } from "./app-repository";

export interface LearningRepository {
  quests: QuestRepository;
  transaction<T>(work: (repo: LearningRepository) => Promise<T>): Promise<T>;
  createGoal(learnerId: string, objective: string): Promise<LearningJourney>;
  claimDiscoveryGoal(
    id: string,
    learnerId: string,
    objective: string,
  ): Promise<{ created: boolean; learnerId: string; submission: boolean }>;
  listQuestIds(learnerId: string): Promise<string[]>;
  listGoalIds(user: Session): Promise<string[]>;
  getGoal(id: string, lock?: boolean): Promise<LearningJourney | null>;
  lockQuest(
    id: string,
    readOnly?: boolean,
  ): ReturnType<QuestRepository["getQuestById"]>;
  lockParentLink(parentId: string, studentId: string): Promise<boolean>;
  selectQuest(goalId: string, questId: string): Promise<void>;
  insertEvidence(
    goal: LearningJourney,
    input: NonNullable<LearningJourney["evidence"]>,
  ): Promise<void>;
  insertFeedback(
    goalId: string,
    input: NonNullable<LearningJourney["feedback"]>,
  ): Promise<void>;
  insertSatisfaction(
    goalId: string,
    input: NonNullable<LearningJourney["satisfaction"]>,
  ): Promise<void>;
  insertGuardianFeedback(
    goalId: string,
    input: NonNullable<LearningJourney["guardianFeedback"]>,
  ): Promise<void>;
}

function mapGoal(row: Record<string, unknown>): LearningJourney {
  return learningJourneySchema.parse({
    id: row.id,
    learnerId: row.learner_id,
    objective: row.objective,
    questId: row.quest_id,
    createdAt: new Date(String(row.created_at)).toISOString(),
    evidence: row.evidence ?? null,
    feedback: row.feedback ?? null,
    satisfaction: row.satisfaction ?? null,
    guardianFeedback: row.guardian_feedback ?? null,
  });
}

export function createLearningRepository(
  client: DatabaseClient = getDefaultDatabase(),
): LearningRepository {
  const quests = createQuestRepository(client);
  return {
    quests,
    async transaction<T>(
      work: (repo: LearningRepository) => Promise<T>,
    ): Promise<T> {
      return client.begin((tx) =>
        work(createLearningRepository(tx as unknown as DatabaseClient)),
      ) as Promise<T>;
    },
    async createGoal(learnerId: string, objective: string) {
      const [row] = await client`
        insert into learning_goals (learner_id, objective)
        values (${learnerId}, ${objective}) returning *
      `;
      return mapGoal(row);
    },
    async getGoal(id: string, lock = false) {
      // Lock before reading children so concurrent submissions see the committed predecessor.
      const [row] = await client`
        select * from learning_goals where id = ${id} ${lock ? client`for update` : client``}
      `;
      if (!row) return null;
      const [evidence, feedback, satisfaction, guardianFeedback] =
        await Promise.all([
          client`select * from learning_evidence where goal_id = ${id}`,
          client`select * from learning_feedback where goal_id = ${id}`,
          client`select enjoyment, agency, challenge from learning_satisfaction where goal_id = ${id}`,
          client`select guardian_id, comment, created_at from learning_guardian_feedback where goal_id = ${id}`,
        ]);
      return mapGoal({
        ...row,
        evidence: evidence[0]
          ? {
              id: evidence[0].id,
              kind: "text",
              questId: evidence[0].quest_id,
              taskId: evidence[0].task_id,
              reflection: evidence[0].reflection,
              observedEntityIds: evidence[0].observed_entity_ids,
              submittedAt: new Date(evidence[0].created_at).toISOString(),
            }
          : null,
        feedback: feedback[0]
          ? {
              educatorId: feedback[0].educator_id,
              assessment: feedback[0].assessment,
              comment: feedback[0].comment,
              createdAt: new Date(feedback[0].created_at).toISOString(),
            }
          : null,
        satisfaction: satisfaction[0] ?? null,
        guardian_feedback: guardianFeedback[0]
          ? {
              guardianId: guardianFeedback[0].guardian_id,
              comment: guardianFeedback[0].comment,
              createdAt: new Date(guardianFeedback[0].created_at).toISOString(),
            }
          : null,
      });
    },
    async claimDiscoveryGoal(id, learnerId, objective) {
      const rows = await client`
        insert into learning_goals (id, learner_id, objective, discovery_submission)
        values (${id}, ${learnerId}, ${objective}, true)
        on conflict (id) do nothing returning id
      `;
      const [row] =
        await client`select learner_id, discovery_submission from learning_goals where id=${id} for update`;
      return {
        created: rows.length > 0,
        learnerId: row.learner_id,
        submission: row.discovery_submission,
      };
    },
    async listQuestIds(learnerId) {
      const rows =
        await client`select id from quests where student_id=${learnerId}
        and current_state='live' and needs_educator_review=false
        order by updated_at desc, id desc limit 10`;
      return rows.map((row) => row.id);
    },
    async listGoalIds(user) {
      const rows =
        await client`select g.id from learning_goals g join quests q on q.id=g.quest_id and q.student_id=g.learner_id
        where q.current_state='live' and q.needs_educator_review=false and (
          (${user.role}='student' and g.learner_id=${user.sub}) or (
            ((${user.role}='parent' and q.parent_id=${user.sub}) or (${user.role}='educator' and q.educator_id=${user.sub}))
            and exists (select 1 from parent_student_links p where p.parent_id=q.parent_id and p.student_id=g.learner_id)
          )) order by g.created_at desc, g.id desc limit 10`;
      return rows.map((row) => row.id);
    },
    async lockQuest(id: string, readOnly = false) {
      await client`select id from quests where id = ${id} ${readOnly ? client`for share` : client`for update`}`;
      return quests.getQuestById(id);
    },
    async lockParentLink(parentId: string, studentId: string) {
      const rows = await client`
        select parent_id from parent_student_links
        where parent_id = ${parentId} and student_id = ${studentId} for share
      `;
      return rows.length > 0;
    },
    async selectQuest(goalId: string, questId: string) {
      await client`update learning_goals set quest_id = ${questId} where id = ${goalId}`;
    },
    async insertEvidence(
      goal: LearningJourney,
      evidence: NonNullable<LearningJourney["evidence"]>,
    ) {
      await client`
        insert into learning_evidence (id, goal_id, quest_id, task_id, reflection, observed_entity_ids)
        values (${evidence.id}, ${goal.id}, ${evidence.questId}, ${evidence.taskId},
          ${evidence.reflection}, ${client.json(evidence.observedEntityIds)})
      `;
    },
    async insertFeedback(
      goalId: string,
      feedback: NonNullable<LearningJourney["feedback"]>,
    ) {
      await client`
        insert into learning_feedback (goal_id, educator_id, assessment, comment)
        values (${goalId}, ${feedback.educatorId}, ${feedback.assessment}, ${feedback.comment})
      `;
    },
    async insertSatisfaction(
      goalId: string,
      input: NonNullable<LearningJourney["satisfaction"]>,
    ) {
      await client`
        insert into learning_satisfaction (goal_id, enjoyment, agency, challenge)
        values (${goalId}, ${input.enjoyment}, ${input.agency}, ${input.challenge})
      `;
    },
    async insertGuardianFeedback(goalId, feedback) {
      await client`
        insert into learning_guardian_feedback (goal_id, guardian_id, comment)
        values (${goalId}, ${feedback.guardianId}, ${feedback.comment})
      `;
    },
  };
}
