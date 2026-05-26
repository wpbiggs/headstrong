import assert from "node:assert/strict";
import test from "node:test";
import {
  type CreateQuestRequest,
  type Quest,
  type QuestEvent,
  type QuestTask,
  type Role,
  type Session,
  composeQuestResponseSchema,
  deriveQuestStateFromEvents,
} from "@headstrong/core";
import type { QuestRepository } from "../repositories/app-repository";
import { QuestServiceError, createQuestService } from "./quest-service";

function createSessionFixture(overrides: Partial<Session>): Session {
  return {
    sub: overrides.sub ?? crypto.randomUUID(),
    email: overrides.email ?? "test@example.com",
    role: overrides.role ?? "student",
    sessionId: overrides.sessionId ?? crypto.randomUUID(),
  };
}

function createComposition() {
  return composeQuestResponseSchema.parse({
    version: "v3",
    state: "preview-only",
    title: "Fraction Forest",
    summary: "Learn fractions with a short XR-friendly quest.",
    moderation: {
      labels: [],
      verdict: "pass",
    },
    templateId: "fractions-lab",
    scenePlan: {
      version: "v1",
      id: "fractions-lab-scene",
      templateId: "fractions-lab",
      title: "Fractions Lab",
      summary: "Practice fractions in a lab.",
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
    highLevelPlan: ["Introduce halves", "Practice with visuals"],
    tasks: [
      {
        title: "Intro",
        kind: "lesson",
        summary: "Meet the concept.",
        contentRef: "fraction-intro",
        templateId: "fractions-lab-task-1",
        scenePlan: {
          version: "v1",
          id: "fractions-lab-task-1-scene",
          templateId: "fractions-lab-task-1",
          title: "Fractions Lab Task 1",
          summary: "Inspect fractions.",
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
        estimatedMinutes: 10,
      },
    ],
    contentReferences: [
      {
        id: "fraction-intro",
        title: "Fraction Intro",
        kind: "lesson",
      },
    ],
    estimatedMinutes: 10,
    requiredApprovals: ["parent"],
  });
}

function createRequest(
  studentId: string,
  parentId: string,
): CreateQuestRequest {
  return {
    studentId,
    parentId,
    composition: createComposition(),
  };
}

function createRepositoryFixture() {
  const users = new Map<
    string,
    { id: string; email: string; role: Role; createdAt: string }
  >();
  const parentLinks = new Set<string>();
  const quests = new Map<string, Quest>();
  const events = new Map<string, QuestEvent[]>();
  const tasks = new Map<string, QuestTask[]>();
  const auditLogs: string[] = [];

  const repository: QuestRepository = {
    async transaction<T>(callback: (repo: QuestRepository) => Promise<T>) {
      return callback(repository);
    },
    async findUserByEmail(email: string) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async createUser(email: string, role: Role) {
      const id = crypto.randomUUID();
      const user = { id, email, role, createdAt: new Date().toISOString() };
      users.set(id, user);
      return user;
    },
    async getUserById(id: string) {
      return users.get(id) ?? null;
    },
    async isParentOf(parentId: string, studentId: string) {
      return parentLinks.has(`${parentId}:${studentId}`);
    },
    async linkParentToStudent(parentId: string, studentId: string) {
      const link = {
        linkId: `${parentId}:${studentId}`,
        parentId,
        studentId,
        createdAt: new Date().toISOString(),
      };
      parentLinks.add(link.linkId);
      return link;
    },
    async unlinkParentFromStudent(parentId: string, studentId: string) {
      return parentLinks.delete(`${parentId}:${studentId}`);
    },
    async listParentLinks(parentId: string) {
      return [...parentLinks]
        .map((entry) => {
          const [linkedParentId, linkedStudentId] = entry.split(":");
          return {
            linkId: entry,
            parentId: linkedParentId,
            studentId: linkedStudentId,
            createdAt: new Date().toISOString(),
          };
        })
        .filter((link) => link.parentId === parentId);
    },
    async listStudentParents(studentId: string) {
      return [...parentLinks]
        .map((entry) => {
          const [linkedParentId, linkedStudentId] = entry.split(":");
          return {
            linkId: entry,
            parentId: linkedParentId,
            studentId: linkedStudentId,
            createdAt: new Date().toISOString(),
          };
        })
        .filter((link) => link.studentId === studentId);
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
    async createQuest(input: {
      id: string;
      studentId: string;
      name: string;
      summary: string;
      moderation: Quest["moderation"];
      needsEducatorReview: boolean;
      currentState: Quest["currentState"];
      parentId: string;
      educatorId: string | null;
    }) {
      const quest: Quest = {
        id: input.id,
        studentId: input.studentId,
        name: input.name,
        summary: input.summary,
        moderation: input.moderation,
        needsEducatorReview: input.needsEducatorReview,
        currentState: input.currentState,
        parentId: input.parentId,
        educatorId: input.educatorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      quests.set(quest.id, quest);
      return quest;
    },
    async insertQuestTasks(input: Array<Omit<QuestTask, "id" | "createdAt">>) {
      const created = input.map((task) => ({
        ...task,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }));
      tasks.set(input[0]?.questId ?? crypto.randomUUID(), created);
      return created;
    },
    async insertQuestEvent(input: {
      questId: string;
      type: QuestEvent["type"];
      performedByUserId: string;
      performedByRole: Role;
      metadata: Record<string, unknown>;
    }) {
      const event: QuestEvent = {
        id: crypto.randomUUID(),
        questId: input.questId,
        type: input.type,
        performedByUserId: input.performedByUserId,
        performedByRole: input.performedByRole,
        metadata: input.metadata,
        createdAt: new Date().toISOString(),
      };
      const current = events.get(input.questId) ?? [];
      current.push(event);
      events.set(input.questId, current);
      return event;
    },
    async updateQuestState(questId: string, nextState: Quest["currentState"]) {
      const quest = quests.get(questId);

      if (!quest) {
        throw new Error("Quest missing in fixture.");
      }

      const updated = {
        ...quest,
        currentState: nextState,
        updatedAt: new Date().toISOString(),
      };
      quests.set(questId, updated);
      return updated;
    },
    async updateQuestReviewFlag(questId: string, needsEducatorReview: boolean) {
      const quest = quests.get(questId);

      if (!quest) {
        throw new Error("Quest missing in fixture.");
      }

      const updated = {
        ...quest,
        needsEducatorReview,
        updatedAt: new Date().toISOString(),
      };
      quests.set(questId, updated);
      return updated;
    },
    async getQuestById(questId: string) {
      return quests.get(questId) ?? null;
    },
    async getQuestEvents(questId: string) {
      return events.get(questId) ?? [];
    },
    async getQuestTasks(questId: string) {
      return tasks.get(questId) ?? [];
    },
    async getMasterySignal() {
      return null;
    },
    async upsertMasterySignal() {
      throw new Error("Not used in quest tests.");
    },
    async createLmsSyncEvent() {
      return false;
    },
    async logAuditEvent(input: { action: string }) {
      auditLogs.push(input.action);
    },
  };

  return {
    repository,
    users,
    parentLinks,
    quests,
    events,
    tasks,
    auditLogs,
  };
}

test("quest transitions derive and persist correctly", async () => {
  const fixture = createRepositoryFixture();
  const studentId = crypto.randomUUID();
  const parentId = crypto.randomUUID();
  fixture.parentLinks.add(`${parentId}:${studentId}`);

  const service = createQuestService(fixture.repository);
  const student = createSessionFixture({ role: "student", sub: studentId });
  const parent = createSessionFixture({ role: "parent", sub: parentId });

  const created = await service.createDraftQuest(
    student,
    createRequest(studentId, parentId),
  );
  assert.equal(created.quest.currentState, "draft");

  const submitted = await service.transitionQuest(
    student,
    created.quest.id,
    "submitted_for_approval",
    {},
  );
  assert.equal(submitted.quest.currentState, "awaiting_approval");

  const approved = await service.transitionQuest(
    parent,
    created.quest.id,
    "parent_approved",
    {},
  );
  assert.equal(approved.quest.currentState, "live");

  const completed = await service.transitionQuest(
    student,
    created.quest.id,
    "completed",
    {},
  );
  assert.equal(completed.quest.currentState, "completed");

  const finalEvents = fixture.events.get(created.quest.id) ?? [];
  assert.equal(deriveQuestStateFromEvents(finalEvents), "completed");
});

test("invalid approval actor is rejected and audit remains governed", async () => {
  const fixture = createRepositoryFixture();
  const studentId = crypto.randomUUID();
  const parentId = crypto.randomUUID();
  fixture.parentLinks.add(`${parentId}:${studentId}`);

  const service = createQuestService(fixture.repository);
  const student = createSessionFixture({ role: "student", sub: studentId });
  const otherStudent = createSessionFixture({ role: "student" });

  const created = await service.createDraftQuest(
    student,
    createRequest(studentId, parentId),
  );
  await service.transitionQuest(
    student,
    created.quest.id,
    "submitted_for_approval",
    {},
  );

  await assert.rejects(
    () =>
      service.transitionQuest(
        otherStudent,
        created.quest.id,
        "parent_approved",
        {},
      ),
    (error: unknown) => {
      assert.ok(error instanceof QuestServiceError);
      assert.equal(error.status, 403);
      return true;
    },
  );
});

test("audit read is limited to parent educator admin and logged", async () => {
  const fixture = createRepositoryFixture();
  const studentId = crypto.randomUUID();
  const parentId = crypto.randomUUID();
  const educatorId = crypto.randomUUID();
  fixture.parentLinks.add(`${parentId}:${studentId}`);

  const service = createQuestService(fixture.repository);
  const student = createSessionFixture({ role: "student", sub: studentId });
  const parent = createSessionFixture({ role: "parent", sub: parentId });

  const created = await service.createDraftQuest(student, {
    ...createRequest(studentId, parentId),
    educatorId,
  });

  const audit = await service.getQuestAudit(parent, created.quest.id);
  assert.equal(audit.quest.id, created.quest.id);
  assert.ok(fixture.auditLogs.includes("quest_audit_read"));

  await assert.rejects(
    () => service.getQuestAudit(student, created.quest.id),
    (error: unknown) => {
      assert.ok(error instanceof QuestServiceError);
      assert.equal(error.status, 403);
      return true;
    },
  );
});

test("blocked moderation never persists a quest and logs the attempt", async () => {
  const fixture = createRepositoryFixture();
  const studentId = crypto.randomUUID();
  const parentId = crypto.randomUUID();
  fixture.parentLinks.add(`${parentId}:${studentId}`);
  const service = createQuestService(fixture.repository);
  const student = createSessionFixture({ role: "student", sub: studentId });

  const request = createRequest(studentId, parentId);
  request.composition = {
    ...request.composition,
    title: "Weapon Workshop",
    moderation: {
      labels: ["blocked"],
      verdict: "block",
    },
  };

  await assert.rejects(
    () => service.createDraftQuest(student, request),
    (error: unknown) => {
      assert.ok(error instanceof QuestServiceError);
      assert.equal(error.status, 422);
      return true;
    },
  );

  assert.equal(fixture.quests.size, 0);
  assert.ok(fixture.auditLogs.includes("quest_create_blocked_by_moderation"));
});

test("warn moderation persists and logs educator review requirement", async () => {
  const fixture = createRepositoryFixture();
  const studentId = crypto.randomUUID();
  const parentId = crypto.randomUUID();
  fixture.parentLinks.add(`${parentId}:${studentId}`);
  const service = createQuestService(fixture.repository);
  const student = createSessionFixture({ role: "student", sub: studentId });

  const request = createRequest(studentId, parentId);
  request.composition = {
    ...request.composition,
    summary: "Please dm me after the lesson.",
    moderation: {
      labels: ["needs_parent_review"],
      verdict: "warn",
    },
  };

  const created = await service.createDraftQuest(student, request);
  assert.equal(created.quest.moderation.verdict, "warn");
  assert.equal(created.quest.needsEducatorReview, true);
  assert.ok(fixture.auditLogs.includes("quest_moderation_warned"));
});

test("educator review clears review required flag", async () => {
  const fixture = createRepositoryFixture();
  const studentId = crypto.randomUUID();
  const parentId = crypto.randomUUID();
  const educatorId = crypto.randomUUID();
  fixture.parentLinks.add(`${parentId}:${studentId}`);
  const service = createQuestService(fixture.repository);
  const student = createSessionFixture({ role: "student", sub: studentId });
  const educator = createSessionFixture({ role: "educator", sub: educatorId });

  const request = createRequest(studentId, parentId);
  request.educatorId = educatorId;
  request.composition = {
    ...request.composition,
    moderation: {
      labels: ["needs_parent_review"],
      verdict: "warn",
    },
  };

  const created = await service.createDraftQuest(student, request);
  const reviewed = await service.reviewQuest(educator, created.quest.id, {
    notes: "Reviewed by educator.",
  });

  assert.equal(reviewed.quest.needsEducatorReview, false);
  assert.ok(fixture.auditLogs.includes("educator_reviewed"));
});
