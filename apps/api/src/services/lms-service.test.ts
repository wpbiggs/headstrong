import assert from "node:assert/strict";
import test from "node:test";
import type {
  MasterySignal,
  Quest,
  QuestTask,
  Session,
} from "@headstrong/core";
import type { QuestRepository } from "../repositories/app-repository";
import { createLmsService } from "./lms-service";

function createSessionFixture(overrides: Partial<Session>): Session {
  return {
    sub: overrides.sub ?? crypto.randomUUID(),
    email: overrides.email ?? "teacher@example.com",
    role: overrides.role ?? "educator",
    sessionId: overrides.sessionId ?? crypto.randomUUID(),
  };
}

function createRepositoryFixture() {
  const masterySignals = new Map<string, MasterySignal>();
  const syncEvents = new Set<string>();
  const auditLogs: string[] = [];
  const questId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  const quest: Quest = {
    id: questId,
    studentId,
    name: "Fractions Quest",
    summary: "Quest summary",
    moderation: { labels: [], verdict: "pass" },
    needsEducatorReview: false,
    currentState: "live",
    parentId: crypto.randomUUID(),
    educatorId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const tasks: QuestTask[] = [
    {
      id: crypto.randomUUID(),
      questId,
      title: "Task 1",
      kind: "lesson",
      summary: "Do task 1",
      contentRef: "asset:task-1",
      templateId: "fractions-lab-task-1",
      scenePlan: {
        version: "v1",
        id: "scene-1",
        templateId: "fractions-lab-task-1",
        title: "Scene 1",
        summary: "Scene",
        timeboxMinutes: 10,
        entities: [],
        interactions: [],
        assets: [],
        accessibility: {
          keyboardNavigation: true,
          captions: true,
          narration: true,
          contrastMode: true,
        },
      },
      position: 0,
      estimatedMinutes: 10,
      createdAt: new Date().toISOString(),
    },
  ];

  const repository: QuestRepository = {
    async transaction<T>(
      callback: (repository: QuestRepository) => Promise<T>,
    ) {
      return callback(repository);
    },
    async findUserByEmail() {
      return null;
    },
    async createUser() {
      throw new Error("unused");
    },
    async getUserById() {
      return null;
    },
    async isParentOf() {
      return false;
    },
    async linkParentToStudent() {
      throw new Error("unused");
    },
    async unlinkParentFromStudent() {
      return false;
    },
    async listParentLinks() {
      return [];
    },
    async listStudentParents() {
      return [];
    },
    async getQuestDashboardItemById() {
      return null;
    },
    async getQuestDashboardDetailById() {
      return null;
    },
    async listQuestDashboardItems() {
      return { items: [], nextCursor: null };
    },
    async updateQuestReviewFlag() {
      return quest;
    },
    async createQuest() {
      return quest;
    },
    async insertQuestTasks() {
      return tasks;
    },
    async insertQuestEvent() {
      throw new Error("unused");
    },
    async updateQuestState() {
      return quest;
    },
    async getQuestById(id: string) {
      return id === questId ? quest : null;
    },
    async getQuestEvents() {
      return [];
    },
    async getQuestTasks() {
      return tasks;
    },
    async getMasterySignal(learnerId: string, skillId: string) {
      return masterySignals.get(`${learnerId}:${skillId}`) ?? null;
    },
    async upsertMasterySignal(input) {
      const signal = {
        skillId: input.skillId,
        score: input.score,
        evidenceCount: input.evidenceCount,
      };
      masterySignals.set(`${input.learnerId}:${input.skillId}`, signal);
      return signal;
    },
    async createLmsSyncEvent(input) {
      if (syncEvents.has(input.idempotencyKey)) return false;
      syncEvents.add(input.idempotencyKey);
      return true;
    },
    async logAuditEvent(input) {
      auditLogs.push(input.action);
    },
  };

  return {
    repository,
    questId,
    studentId,
    syncEvents,
    masterySignals,
    auditLogs,
  };
}

test("publishing quest to Moodle is idempotent at sync event layer", async () => {
  const fixture = createRepositoryFixture();
  const service = createLmsService(fixture.repository);
  const educator = createSessionFixture({});
  const first = await service.publishQuest(educator, fixture.questId, {
    provider: "moodle",
  });
  const second = await service.publishQuest(educator, fixture.questId, {
    provider: "moodle",
  });
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.ok(fixture.auditLogs.includes("quest_lms_published"));
  assert.ok(fixture.auditLogs.includes("quest_lms_publish_replayed"));
});

test("completion ingestion updates mastery signals and replays safely", async () => {
  const fixture = createRepositoryFixture();
  const service = createLmsService(fixture.repository);
  const educator = createSessionFixture({});
  const skillId = crypto.randomUUID();
  const payload = {
    provider: "moodle" as const,
    learnerId: fixture.studentId,
    assignmentExternalId: `${fixture.questId}:${fixture.questId}`,
    score: 0.8,
    completedAt: new Date().toISOString(),
    skillId,
  };
  const first = await service.recordCompletion(
    educator,
    fixture.questId,
    payload,
  );
  const second = await service.recordCompletion(
    educator,
    fixture.questId,
    payload,
  );
  assert.equal(first.evidenceCount, 1);
  assert.equal(second.evidenceCount, 1);
  assert.ok(fixture.auditLogs.includes("quest_lms_completion_recorded"));
  assert.ok(fixture.auditLogs.includes("quest_lms_completion_replayed"));
});
