import assert from "node:assert/strict";
import test from "node:test";
import type { Role, Session } from "@headstrong/core";
import type { QuestRepository } from "../repositories/app-repository";
import { AdminServiceError, createAdminService } from "./admin-service";

function createSessionFixture(overrides: Partial<Session>): Session {
  return {
    sub: overrides.sub ?? crypto.randomUUID(),
    email: overrides.email ?? "admin@example.com",
    role: overrides.role ?? "admin",
    sessionId: overrides.sessionId ?? crypto.randomUUID(),
  };
}

function createRepositoryFixture() {
  const users = new Map<
    string,
    { id: string; email: string; role: Role; createdAt: string }
  >();
  const links = new Map<
    string,
    { parentId: string; studentId: string; createdAt: string }
  >();
  const auditLogs: string[] = [];

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
      const link = {
        linkId: `${parentId}:${studentId}`,
        parentId,
        studentId,
        createdAt: new Date().toISOString(),
      };
      links.set(link.linkId, link);
      return link;
    },
    async unlinkParentFromStudent(parentId: string, studentId: string) {
      return links.delete(`${parentId}:${studentId}`);
    },
    async listParentLinks(parentId: string) {
      return [...links.entries()]
        .filter(([, link]) => link.parentId === parentId)
        .map(([linkId, link]) => ({ linkId, ...link }));
    },
    async listStudentParents(studentId: string) {
      return [...links.entries()]
        .filter(([, link]) => link.studentId === studentId)
        .map(([linkId, link]) => ({ linkId, ...link }));
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
    async createQuest() {
      throw new Error("Not used in admin tests.");
    },
    async insertQuestTasks() {
      return [];
    },
    async insertQuestEvent() {
      throw new Error("Not used in admin tests.");
    },
    async updateQuestState() {
      throw new Error("Not used in admin tests.");
    },
    async updateQuestReviewFlag() {
      throw new Error("Not used in admin tests.");
    },
    async getQuestById() {
      return null;
    },
    async getQuestEvents() {
      return [];
    },
    async getQuestTasks() {
      return [];
    },
    async logAuditEvent(input: { action: string }) {
      auditLogs.push(input.action);
    },
  };

  return { repository, users, links, auditLogs };
}

test("admin can link valid parent and student users", async () => {
  const fixture = createRepositoryFixture();
  const parent = await fixture.repository.createUser(
    "parent@example.com",
    "parent",
  );
  const student = await fixture.repository.createUser(
    "student@example.com",
    "student",
  );
  const service = createAdminService(fixture.repository);

  const result = await service.linkParentStudents(createSessionFixture({}), [
    { parentId: parent.id, studentId: student.id },
  ]);

  assert.equal(result.links.length, 1);
  assert.equal(result.links[0]?.linkId, `${parent.id}:${student.id}`);
  assert.ok(fixture.auditLogs.includes("parent_student_link_created"));
});

test("duplicate links and wrong roles are rejected and logged", async () => {
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
  const service = createAdminService(fixture.repository);
  const admin = createSessionFixture({});

  await service.linkParentStudents(admin, [
    { parentId: parent.id, studentId: student.id },
  ]);

  await assert.rejects(
    () =>
      service.linkParentStudents(admin, [
        { parentId: parent.id, studentId: student.id },
      ]),
    (error: unknown) => {
      assert.ok(error instanceof AdminServiceError);
      assert.equal(error.status, 409);
      return true;
    },
  );

  await assert.rejects(
    () =>
      service.linkParentStudents(admin, [
        { parentId: educator.id, studentId: student.id },
      ]),
    (error: unknown) => {
      assert.ok(error instanceof AdminServiceError);
      assert.equal(error.status, 422);
      return true;
    },
  );

  assert.ok(fixture.auditLogs.includes("parent_student_link_create_failed"));
});

test("admin can unlink an existing link and missing links fail fast", async () => {
  const fixture = createRepositoryFixture();
  const parent = await fixture.repository.createUser(
    "parent@example.com",
    "parent",
  );
  const student = await fixture.repository.createUser(
    "student@example.com",
    "student",
  );
  const service = createAdminService(fixture.repository);
  const admin = createSessionFixture({});

  await service.linkParentStudents(admin, [
    { parentId: parent.id, studentId: student.id },
  ]);
  await service.unlinkParentStudent(admin, `${parent.id}:${student.id}`);
  assert.equal(
    await fixture.repository.isParentOf(parent.id, student.id),
    false,
  );

  await assert.rejects(
    () => service.unlinkParentStudent(admin, `${parent.id}:${student.id}`),
    (error: unknown) => {
      assert.ok(error instanceof AdminServiceError);
      assert.equal(error.status, 404);
      return true;
    },
  );

  assert.ok(fixture.auditLogs.includes("parent_student_link_deleted"));
  assert.ok(fixture.auditLogs.includes("parent_student_link_delete_failed"));
});
