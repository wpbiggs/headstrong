import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createLearningRepository } from "../src/repositories/learning-repository";
import { createLearningRoutes } from "../src/routes/learning";
import { createLearningService } from "../src/services/learning-service";
import {
  createDisposableDatabase,
  seedLearningFixture,
} from "./learning-fixture";

test("PostgreSQL + Hono learning journey: scoped, ordered, atomic and immutable", async (t) => {
  const db = await createDisposableDatabase();
  t.after(() => db.cleanup());
  const migrationConnection = await db.client.reserve();
  try {
    for (const file of [
      "0001_init.sql",
      "0002_phase1_quests.sql",
      "0003_quest_moderation.sql",
      "0004_quest_review_and_scene_plan.sql",
      "0012_learning_journeys.sql",
    ]) {
      await migrationConnection.unsafe(
        await readFile(
          new URL(`../migrations/${file}`, import.meta.url),
          "utf8",
        ),
      );
    }
    // New migration is independently repeatable and doesn't modify legacy data.
    await migrationConnection.unsafe(
      await readFile(
        new URL("../migrations/0012_learning_journeys.sql", import.meta.url),
        "utf8",
      ),
    );
  } finally {
    migrationConnection.release();
  }
  const fixture = await seedLearningFixture(db.client);
  const repository = createLearningRepository(db.client);
  const service = createLearningService(repository);
  const routes = createLearningRoutes(service, () => true);
  async function request(actor: string, path: string, body?: unknown) {
    return routes.request(path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${fixture.tokens[actor]}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  const goalResponse = await request("learner", "/goals", {
    objective: "Understand halves through observation",
  });
  assert.equal(goalResponse.status, 201);
  const goal = await goalResponse.json();
  const path = `/goals/${goal.id}`;
  await t.test("privacy and role boundaries", async () => {
    for (const actor of [
      "stranger",
      "otherEducator",
      "admin",
      "parent",
      "educator",
    ]) {
      assert.equal((await request(actor, path)).status, 403);
    }
    assert.equal(
      (
        await request("educator", "/goals", {
          objective: "Adult-created objective",
        })
      ).status,
      403,
    );
    assert.equal(
      (await request("learner", "/goals", { objective: "Please dm me" }))
        .status,
      422,
    );
  });
  await t.test("approved quest selection and evidence validation", async () => {
    await db.client`update quests set needs_educator_review = true where id = ${fixture.questId}`;
    assert.equal(
      (await request("learner", `${path}/quest`, { questId: fixture.questId }))
        .status,
      409,
    );
    await db.client`update quests set needs_educator_review = false where id = ${fixture.questId}`;
    assert.equal(
      (await request("learner", `${path}/quest`, { questId: fixture.questId }))
        .status,
      200,
    );
    assert.equal(
      (await request("learner", `${path}/quest`, { questId: fixture.questId }))
        .status,
      409,
    );
    for (const actor of ["educator", "parent"])
      assert.equal((await request(actor, path)).status, 200);
    assert.equal(
      (
        await request("learner", `${path}/feedback`, {
          assessment: "demonstrated",
          comment: "Good reasoning",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request("educator", `${path}/feedback`, {
          assessment: "demonstrated",
          comment: "Good reasoning",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("learner", `${path}/satisfaction`, {
          enjoyment: 4,
          agency: 5,
          challenge: 3,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("learner", `${path}/evidence`, {
          reflection: "I compared the two visible objects.",
          observedEntityIds: ["forged"],
        })
      ).status,
      422,
    );
  });
  await t.test(
    "concurrent submissions serialize, then teacher and learner complete loop",
    async () => {
      const input = {
        reflection:
          "I compared the guide and focus objects to understand halves.",
        observedEntityIds: [fixture.task.scenePlan.entities[0].id],
      };
      const responses = await Promise.all([
        request("learner", `${path}/evidence`, input),
        request("learner", `${path}/evidence`, input),
      ]);
      assert.deepEqual(
        responses.map((response) => response.status).sort(),
        [201, 409],
      );
      const [count] =
        await db.client`select count(*)::int as n from learning_evidence where goal_id = ${goal.id}`;
      assert.equal(count.n, 1);
      assert.equal(
        (
          await request("otherEducator", `${path}/feedback`, {
            assessment: "demonstrated",
            comment: "Good reasoning",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request("educator", `${path}/feedback`, {
            assessment: "demonstrated",
            comment: "Explain how the two equal parts form one whole next.",
          })
        ).status,
        201,
      );
      assert.equal(
        (
          await request("educator", `${path}/feedback`, {
            assessment: "needs_practice",
            comment: "Overwrite original",
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request("learner", `${path}/satisfaction`, {
            enjoyment: 5,
            agency: 4,
            challenge: 3,
          })
        ).status,
        201,
      );
      assert.equal(
        (
          await request("learner", `${path}/satisfaction`, {
            enjoyment: 1,
            agency: 1,
            challenge: 1,
          })
        ).status,
        409,
      );
      const detail = await (await request("learner", path)).json();
      assert.equal(detail.journey.feedback.assessment, "demonstrated");
      assert.equal(detail.journey.satisfaction.enjoyment, 5);
      assert.equal(detail.experience.version, "v1");
      assert.equal(
        (await request("learner", path)).headers.get("cache-control"),
        "no-store",
      );
    },
  );
  await t.test(
    "revoking guardian link blocks new activity and unrelated record access",
    async () => {
      await repository.quests.unlinkParentFromStudent(
        fixture.users.parent.id,
        fixture.users.learner.id,
      );
      assert.equal((await request("parent", path)).status, 403);
      assert.equal((await request("educator", path)).status, 403);
      const detail = await (await request("learner", path)).json();
      assert.equal(detail.experience, null);
      assert.equal(
        (
          await request("learner", `${path}/satisfaction`, {
            enjoyment: 3,
            agency: 3,
            challenge: 3,
          })
        ).status,
        409,
      );
    },
  );
  await t.test(
    "audit failure rolls back creation; audit contains no private content",
    async () => {
      const before =
        await db.client`select count(*)::int as n from learning_goals`;
      const broken = createLearningService({
        ...repository,
        transaction: (work) =>
          repository.transaction((tx) =>
            work({
              ...tx,
              quests: {
                ...tx.quests,
                logAuditEvent: async () => {
                  throw new Error("fixture audit failure");
                },
              },
            }),
          ),
      });
      await assert.rejects(
        broken.createGoal(fixture.sessions.learner, {
          objective: "A goal that must roll back",
        }),
        /fixture audit failure/,
      );
      const after =
        await db.client`select count(*)::int as n from learning_goals`;
      assert.equal(before[0].n, after[0].n);
      const audits =
        await db.client`select payload from audit_events where entity_type = 'learning_goal'`;
      assert.ok(audits.length > 0);
      for (const row of audits) assert.deepEqual(row.payload, {});
    },
  );
  await t.test(
    "confirm legacy migration blockers instead of hiding them",
    async () => {
      await db.client.unsafe(
        await readFile(
          new URL("../migrations/0005_internal_social.sql", import.meta.url),
          "utf8",
        ),
      );
      await assert.rejects(
        db.client.unsafe(
          await readFile(
            new URL(
              "../migrations/0006_social_governance.sql",
              import.meta.url,
            ),
            "utf8",
          ),
        ),
        /column "status" does not exist/,
      );
      await assert.rejects(
        db.client`
      insert into quest_events (quest_id, type, performed_by_user_id, performed_by_role)
      values (${fixture.questId}, 'educator_reviewed', ${fixture.users.educator.id}, 'educator')
    `,
        /quest_events_type_check/,
      );
    },
  );
});
