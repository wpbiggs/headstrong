import assert from "node:assert/strict";
import test from "node:test";
import type {
  Quest,
  QuestEvent,
  QuestTask,
  Role,
  Session,
} from "@headstrong/core";
import type {
  ListQuestDashboardItemsInput,
  QuestListResult,
  QuestRepository,
} from "../repositories/app-repository";
import {
  QuestQueryServiceError,
  createQuestQueryService,
} from "./quest-query-service";

function createSessionFixture(overrides: Partial<Session>): Session {
  return {
    sub: overrides.sub ?? crypto.randomUUID(),
    email: overrides.email ?? "viewer@example.com",
    role: overrides.role ?? "parent",
    sessionId: overrides.sessionId ?? crypto.randomUUID(),
  };
}

function createScenePlan(templateId: string) {
  return {
    id: `${templateId}-scene`,
    templateId,
    title: `${templateId} scene`,
    summary: `${templateId} summary`,
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
  };
}

function createRepositoryFixture() {
  const users = new Map<
    string,
    { id: string; email: string; role: Role; createdAt: string }
  >();
  const links = new Set<string>();
  const quests = [] as Array<{
    id: string;
    studentId: string;
    parentId: string;
    name: string;
    summary: string;
    moderation: Quest["moderation"];
    needsEducatorReview: boolean;
    currentState: Quest["currentState"];
    updatedAt: string;
    createdAt: string;
    assignedEducator: { id: string; email: string } | null;
    tasks: Array<{
      id: string;
      title: string;
      kind: QuestTask["kind"];
      summary: string;
      contentRef: string;
      templateId: string;
      scenePlan: QuestTask["scenePlan"];
      position: number;
      estimatedMinutes: number;
    }>;
  }>;
  const auditLogs: string[] = [];

  function asListResult(items: typeof quests): QuestListResult {
    return {
      items: items.map((quest) => ({
        quest: {
          id: quest.id,
          studentId: quest.studentId,
          parentId: quest.parentId,
          name: quest.name,
          summary: quest.summary,
          moderation: quest.moderation,
          needsEducatorReview: quest.needsEducatorReview,
        },
        currentState: quest.currentState,
        lastUpdated: quest.updatedAt,
        assignedEducator: quest.assignedEducator,
      })),
      nextCursor: null,
    };
  }

  const repository: QuestRepository = {
    async transaction<T>(callback: (repo: QuestRepository) => Promise<T>) {
      return callback(repository);
    },
    async findUserByEmail(email: string) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async createUser(email: string, role: Role) {
      const user = {
        id: crypto.randomUUID(),
        email,
        role,
        createdAt: new Date().toISOString(),
      };
      users.set(user.id, user);
      return user;
    },
    async getUserById(id: string) {
      return users.get(id) ?? null;
    },
    async isParentOf(parentId: string, studentId: string) {
      return links.has(`${parentId}:${studentId}`);
    },
    async linkParentToStudent(parentId: string, studentId: string) {
      links.add(`${parentId}:${studentId}`);
      return {
        linkId: `${parentId}:${studentId}`,
        parentId,
        studentId,
        createdAt: new Date().toISOString(),
      };
    },
    async unlinkParentFromStudent(parentId: string, studentId: string) {
      return links.delete(`${parentId}:${studentId}`);
    },
    async listParentLinks(parentId: string) {
      return [...links]
        .filter((entry) => entry.startsWith(`${parentId}:`))
        .map((entry) => {
          const [, studentId] = entry.split(":");
          return {
            linkId: entry,
            parentId,
            studentId,
            createdAt: new Date().toISOString(),
          };
        });
    },
    async listStudentParents(studentId: string) {
      return [...links]
        .filter((entry) => entry.endsWith(`:${studentId}`))
        .map((entry) => {
          const [parentId] = entry.split(":");
          return {
            linkId: entry,
            parentId,
            studentId,
            createdAt: new Date().toISOString(),
          };
        });
    },
    async getQuestDashboardItemById(questId: string) {
      const quest = quests.find((entry) => entry.id === questId);
      return quest ? (asListResult([quest]).items[0] ?? null) : null;
    },
    async getQuestDashboardDetailById(questId: string) {
      const quest = quests.find((entry) => entry.id === questId);

      if (!quest) {
        return null;
      }

      return {
        ...(asListResult([quest]).items[0] ?? null),
        createdAt: quest.createdAt,
        tasks: quest.tasks,
      };
    },
    async listQuestDashboardItems(input: ListQuestDashboardItemsInput) {
      const decodedCursor = input.cursor
        ? Buffer.from(input.cursor, "base64url").toString("utf8")
        : null;
      const filtered = [...quests]
        .sort(
          (left, right) =>
            right.updatedAt.localeCompare(left.updatedAt) ||
            right.id.localeCompare(left.id),
        )
        .filter((quest) => {
          if (input.state && quest.currentState !== input.state) {
            return false;
          }

          if (input.role === "parent") {
            return links.has(`${input.actorUserId}:${quest.studentId}`);
          }

          if (input.role === "educator") {
            return (
              quest.assignedEducator?.id === input.actorUserId ||
              quest.needsEducatorReview ||
              (quest.currentState === "awaiting_approval" &&
                (!quest.assignedEducator ||
                  quest.assignedEducator.id === input.actorUserId))
            );
          }

          return true;
        });
      const startIndex = decodedCursor
        ? filtered.findIndex(
            (quest) => `${quest.updatedAt}|${quest.id}` === decodedCursor,
          ) + 1
        : 0;
      const page = filtered.slice(startIndex, startIndex + input.limit);
      const next = filtered[startIndex + input.limit];

      return {
        items: asListResult(page).items,
        nextCursor: next
          ? Buffer.from(
              `${page.at(-1)?.updatedAt ?? ""}|${page.at(-1)?.id ?? ""}`,
            ).toString("base64url")
          : null,
      };
    },
    async createQuest() {
      throw new Error("Not used in query tests.");
    },
    async insertQuestTasks() {
      return [];
    },
    async insertQuestEvent() {
      throw new Error("Not used in query tests.");
    },
    async updateQuestState() {
      throw new Error("Not used in query tests.");
    },
    async updateQuestReviewFlag() {
      throw new Error("Not used in query tests.");
    },
    async getQuestById() {
      return null;
    },
    async getQuestEvents() {
      return [] as QuestEvent[];
    },
    async getQuestTasks() {
      return [] as QuestTask[];
    },
    async logAuditEvent(input: { action: string }) {
      auditLogs.push(input.action);
    },
  };

  return { repository, users, links, quests, auditLogs };
}

test("parent list only returns linked student quests with pagination", async () => {
  const fixture = createRepositoryFixture();
  const parent = await fixture.repository.createUser(
    "parent@example.com",
    "parent",
  );
  const studentOne = await fixture.repository.createUser(
    "student1@example.com",
    "student",
  );
  const studentTwo = await fixture.repository.createUser(
    "student2@example.com",
    "student",
  );
  const studentThree = await fixture.repository.createUser(
    "student3@example.com",
    "student",
  );

  fixture.links.add(`${parent.id}:${studentOne.id}`);
  fixture.links.add(`${parent.id}:${studentTwo.id}`);
  fixture.quests.push(
    {
      id: crypto.randomUUID(),
      studentId: studentOne.id,
      parentId: parent.id,
      name: "Quest one",
      summary: "Linked 1",
      moderation: { labels: [], verdict: "pass" },
      needsEducatorReview: false,
      currentState: "live",
      updatedAt: "2026-05-25T12:00:00.000Z",
      createdAt: "2026-05-25T11:00:00.000Z",
      assignedEducator: null,
      tasks: [
        {
          id: crypto.randomUUID(),
          title: "Quest one task",
          kind: "scene",
          summary: "Explore quest one.",
          contentRef: "asset-1",
          templateId: "fractions-lab-task-1",
          scenePlan: createScenePlan("fractions-lab-task-1"),
          position: 0,
          estimatedMinutes: 10,
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      studentId: studentTwo.id,
      parentId: parent.id,
      name: "Quest two",
      summary: "Linked 2",
      moderation: { labels: ["needs_parent_review"], verdict: "warn" },
      needsEducatorReview: true,
      currentState: "awaiting_approval",
      updatedAt: "2026-05-25T11:00:00.000Z",
      createdAt: "2026-05-25T10:00:00.000Z",
      assignedEducator: null,
      tasks: [],
    },
    {
      id: crypto.randomUUID(),
      studentId: studentThree.id,
      parentId: parent.id,
      name: "Quest three",
      summary: "Unlinked",
      moderation: { labels: [], verdict: "pass" },
      needsEducatorReview: false,
      currentState: "draft",
      updatedAt: "2026-05-25T10:00:00.000Z",
      createdAt: "2026-05-25T09:00:00.000Z",
      assignedEducator: null,
      tasks: [],
    },
  );

  const service = createQuestQueryService(fixture.repository);
  const parentSession = createSessionFixture({
    role: "parent",
    sub: parent.id,
  });
  const firstPage = await service.listQuests(parentSession, {
    role: "parent",
    limit: 1,
  });

  assert.equal(firstPage.items.length, 1);
  assert.equal(firstPage.items[0]?.quest.name, "Quest one");
  assert.ok(firstPage.nextCursor);

  const secondPage = await service.listQuests(parentSession, {
    role: "parent",
    limit: 1,
    cursor: firstPage.nextCursor ?? undefined,
  });

  assert.equal(secondPage.items.length, 1);
  assert.equal(secondPage.items[0]?.quest.name, "Quest two");
  assert.equal(secondPage.nextCursor, null);
});

test("educator list exposes assigned quests and inbox contract", async () => {
  const fixture = createRepositoryFixture();
  const educator = await fixture.repository.createUser(
    "teacher@example.com",
    "educator",
  );
  const parent = await fixture.repository.createUser(
    "parent@example.com",
    "parent",
  );
  const student = await fixture.repository.createUser(
    "student@example.com",
    "student",
  );

  fixture.quests.push(
    {
      id: crypto.randomUUID(),
      studentId: student.id,
      parentId: parent.id,
      name: "Assigned quest",
      summary: "Assigned",
      moderation: { labels: [], verdict: "pass" },
      needsEducatorReview: false,
      currentState: "live",
      updatedAt: "2026-05-25T12:00:00.000Z",
      createdAt: "2026-05-25T11:00:00.000Z",
      assignedEducator: { id: educator.id, email: educator.email },
      tasks: [],
    },
    {
      id: crypto.randomUUID(),
      studentId: student.id,
      parentId: parent.id,
      name: "Inbox quest",
      summary: "Needs review",
      moderation: { labels: ["needs_parent_review"], verdict: "warn" },
      needsEducatorReview: true,
      currentState: "awaiting_approval",
      updatedAt: "2026-05-25T11:00:00.000Z",
      createdAt: "2026-05-25T10:00:00.000Z",
      assignedEducator: null,
      tasks: [],
    },
  );

  const service = createQuestQueryService(fixture.repository);
  const educatorSession = createSessionFixture({
    role: "educator",
    sub: educator.id,
  });
  const result = await service.listQuests(educatorSession, {
    role: "educator",
    limit: 10,
  });

  assert.equal(result.items.length, 2);
  assert.equal(
    result.inboxRule,
    "assigned_or_warned_review_required_or_unassigned_awaiting_approval",
  );
});

test("role leaks are rejected and logged for quest reads and lists", async () => {
  const fixture = createRepositoryFixture();
  const parent = await fixture.repository.createUser(
    "parent@example.com",
    "parent",
  );
  const student = await fixture.repository.createUser(
    "student@example.com",
    "student",
  );
  const educator = await fixture.repository.createUser(
    "teacher@example.com",
    "educator",
  );

  fixture.quests.push({
    id: crypto.randomUUID(),
    studentId: student.id,
    parentId: parent.id,
    name: "Sensitive quest",
    summary: "No leak",
    moderation: { labels: ["needs_parent_review"], verdict: "warn" },
    needsEducatorReview: true,
    currentState: "awaiting_approval",
    updatedAt: "2026-05-25T12:00:00.000Z",
    createdAt: "2026-05-25T11:00:00.000Z",
    assignedEducator: null,
    tasks: [],
  });
  const questId = fixture.quests[0]?.id;

  if (!questId) {
    throw new Error("Expected seeded quest.");
  }

  const service = createQuestQueryService(fixture.repository);
  const studentSession = createSessionFixture({
    role: "student",
    sub: student.id,
  });
  const parentSession = createSessionFixture({
    role: "parent",
    sub: parent.id,
  });

  await assert.rejects(
    () => service.listQuests(studentSession, { role: "parent", limit: 10 }),
    (error: unknown) => {
      assert.ok(error instanceof QuestQueryServiceError);
      assert.equal(error.status, 403);
      return true;
    },
  );

  await assert.rejects(
    () => service.getQuest(parentSession, questId),
    (error: unknown) => {
      assert.ok(error instanceof QuestQueryServiceError);
      assert.equal(error.status, 403);
      return true;
    },
  );

  assert.ok(fixture.auditLogs.includes("quest_list_forbidden"));
  assert.ok(fixture.auditLogs.includes("quest_read_forbidden"));

  const educatorSession = createSessionFixture({
    role: "educator",
    sub: educator.id,
  });
  const detail = await service.getQuest(educatorSession, questId);
  assert.equal(detail.quest.name, "Sensitive quest");
});
