import { randomUUID } from "node:crypto";
import { createQuestComposer } from "@headstrong/quest-composer";
import postgres from "postgres";
import { createSession, signSession } from "../src/auth";
import type { DatabaseClient } from "../src/db";
import { createQuestRepository } from "../src/repositories/app-repository";
import { createQuestService } from "../src/services/quest-service";

export async function seedLearningFixture(client: DatabaseClient) {
  const repo = createQuestRepository(client);
  const users = {
    learner: await repo.createUser(
      `learner-${randomUUID()}@example.test`,
      "student",
    ),
    parent: await repo.createUser(
      `parent-${randomUUID()}@example.test`,
      "parent",
    ),
    educator: await repo.createUser(
      `educator-${randomUUID()}@example.test`,
      "educator",
    ),
    stranger: await repo.createUser(
      `stranger-${randomUUID()}@example.test`,
      "student",
    ),
    otherEducator: await repo.createUser(
      `other-${randomUUID()}@example.test`,
      "educator",
    ),
    admin: await repo.createUser(`admin-${randomUUID()}@example.test`, "admin"),
  };
  const sessions = Object.fromEntries(
    await Promise.all(
      Object.entries(users).map(
        async ([key, user]) =>
          [key, await createSession(user.id, user.email, user.role)] as const,
      ),
    ),
  );
  const tokens = Object.fromEntries(
    await Promise.all(
      Object.entries(sessions).map(
        async ([key, session]) => [key, await signSession(session)] as const,
      ),
    ),
  );
  await repo.linkParentToStudent(users.parent.id, users.learner.id);
  const composition = await createQuestComposer().compose({
    profile: {
      id: users.learner.id,
      displayName: "Fixture learner",
      interests: ["fractions"],
      skillBaselines: {},
      constraints: [],
      safetyPreferences: {
        enableNarration: false,
        enableCaptions: true,
        allowSocialDiscovery: false,
      },
    },
    targets: ["fractions"],
    constraints: [],
  });
  const quests = createQuestService(repo);
  const created = await quests.createDraftQuest(sessions.learner, {
    studentId: users.learner.id,
    parentId: users.parent.id,
    educatorId: users.educator.id,
    composition,
  });
  await quests.transitionQuest(
    sessions.learner,
    created.quest.id,
    "submitted_for_approval",
    {},
  );
  await quests.transitionQuest(
    sessions.parent,
    created.quest.id,
    "parent_approved",
    {},
  );
  return {
    users,
    sessions,
    tokens,
    questId: created.quest.id,
    task: created.tasks[0],
  };
}

export function localAdminUrl() {
  // TEST_DATABASE_ADMIN_URL must name an explicitly local admin database, never an app DB.
  const value = process.env.TEST_DATABASE_ADMIN_URL;
  if (!value)
    throw new Error(
      "Set TEST_DATABASE_ADMIN_URL to an explicit loopback postgres admin URL.",
    );
  const url = new URL(value);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/postgres"
  ) {
    throw new Error(
      "Tests may create databases only on loopback using /postgres.",
    );
  }
  return value;
}

export async function createDisposableDatabase() {
  const adminUrl = localAdminUrl();
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  const name = `headstrong_learning_test_${randomUUID().replaceAll("-", "")}`;
  await admin.unsafe(`create database "${name}"`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const client = postgres(url.toString(), { max: 5, onnotice: () => {} });
  return {
    client,
    url: url.toString(),
    async cleanup() {
      await client.end();
      await admin.unsafe(`drop database "${name}"`);
      await admin.end();
    },
  };
}
