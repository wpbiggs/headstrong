import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { verifySession } from "../src/auth";
import { createRequireAuth } from "../src/middleware/auth";
import { runMigrations } from "../src/migrations";
import { createAuthRepository } from "../src/repositories/auth-repository";
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
  const directory = fileURLToPath(new URL("../migrations", import.meta.url));
  assert.equal((await runMigrations(db.client, directory)).applied.length, 16);
  assert.deepEqual((await runMigrations(db.client, directory)).applied, []);
  const fixture = await seedLearningFixture(db.client);
  const repository = createLearningRepository(db.client);
  const service = createLearningService(repository);
  const routes = createLearningRoutes(
    service,
    () => true,
    createRequireAuth((token) =>
      verifySession(token, createAuthRepository(db.client)),
    ),
  );
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
  await t.test(
    "authorized catalogs and atomic discovery sharing preserve privacy and retry safety",
    async () => {
      assert.equal((await request("admin", "/goals")).status, 403);
      assert.equal((await request("parent", "/quests")).status, 403);
      assert.deepEqual(
        (await (await request("stranger", "/quests")).json()).items,
        [],
      );
      const choices = await (await request("learner", "/quests")).json();
      assert.equal(choices.items.length, 1);
      const body = {
        submissionId: crypto.randomUUID(),
        questId: fixture.questId,
        scene: choices.items[0].scene,
        reflection: "I tried comparing two different observations.",
        observedEntityIds: [fixture.task.scenePlan.entities[0].id],
      };
      const replies = await Promise.all([
        request("learner", "/discoveries", body),
        request("learner", "/discoveries", body),
      ]);
      assert.deepEqual(replies.map((r) => r.status).sort(), [200, 201]);
      assert.equal(
        (
          await request("learner", "/discoveries", {
            ...body,
            submissionId: body.submissionId.toUpperCase(),
            questId: body.questId.toUpperCase(),
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request("learner", "/discoveries", {
            ...body,
            reflection: "A different selection must not replace the first.",
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request("learner", "/discoveries", {
            ...body,
            submissionId: goal.id,
          })
        ).status,
        409,
      );
      assert.equal(
        (await request("stranger", "/discoveries", body)).status,
        409,
      );
      assert.equal((await request("parent", "/discoveries", body)).status, 403);
      for (const actor of ["learner", "parent", "educator"]) {
        const records = await (await request(actor, "/goals")).json();
        assert.equal(records.items.length, 1);
        assert.equal(records.items[0].id, body.submissionId);
        assert.equal("reflection" in records.items[0], false);
        assert.equal("evidence" in records.items[0], false);
      }
      for (const actor of ["stranger", "otherEducator"])
        assert.deepEqual(
          (await (await request(actor, "/goals")).json()).items,
          [],
        );
      const failedId = crypto.randomUUID();
      assert.equal(
        (
          await request("learner", "/discoveries", {
            ...body,
            submissionId: failedId,
            observedEntityIds: ["foreign-entity"],
          })
        ).status,
        422,
      );
      assert.equal(await repository.getGoal(failedId), null);
      const stale = { ...body.scene, templateId: "changed-scene" };
      assert.equal(
        (
          await request("learner", "/discoveries", {
            ...body,
            submissionId: failedId,
            scene: stale,
          })
        ).status,
        409,
      );
      assert.equal(await repository.getGoal(failedId), null);
      await db.client`update quests set needs_educator_review=true where id=${fixture.questId}`;
      assert.deepEqual(
        (await (await request("learner", "/quests")).json()).items,
        [],
      );
      assert.deepEqual(
        (await (await request("parent", "/goals")).json()).items,
        [],
      );
      assert.equal(
        (await request("learner", "/discoveries", body)).status,
        409,
      );
      await db.client`update quests set needs_educator_review=false where id=${fixture.questId}`;
      const broken = createLearningService({
        ...repository,
        transaction: (work) =>
          repository.transaction((tx) =>
            work({
              ...tx,
              quests: {
                ...tx.quests,
                logAuditEvent: async () => {
                  throw new Error("share audit failure");
                },
              },
            }),
          ),
      });
      await assert.rejects(
        broken.shareDiscovery(fixture.sessions.learner, {
          ...body,
          submissionId: failedId,
        }),
        /share audit failure/,
      );
      assert.equal(await repository.getGoal(failedId), null);
      assert.equal(
        (await db.client`select count(*)::int as n from mastery_signals`)[0].n,
        0,
      );
    },
  );
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
    "guardian replies are scoped, safe, independent of assessment and immutable under concurrency",
    async () => {
      const body = {
        comment:
          "I enjoyed seeing you try another idea. What might you explore next?",
      };
      for (const actor of [
        "learner",
        "stranger",
        "otherEducator",
        "educator",
        "admin",
      ])
        assert.equal(
          (await request(actor, `${path}/guardian-feedback`, body)).status,
          403,
        );
      for (const forged of [
        { ...body, guardianId: fixture.users.parent.id },
        { ...body, assessment: "demonstrated" },
        { comment: " " },
        { comment: "🙂🙂🙂" },
      ])
        assert.equal(
          (await request("parent", `${path}/guardian-feedback`, forged)).status,
          400,
        );
      assert.equal(
        (
          await request("parent", `${path}/guardian-feedback`, {
            comment: "Please dm me",
          })
        ).status,
        422,
      );
      assert.equal(
        (await request("parent", `${path}/guardian-feedback`, body)).status,
        409,
      );
      const separate = await service.createGoal(fixture.sessions.learner, {
        objective: "Compare two ideas without needing an assessment",
      });
      await service.selectQuest(fixture.sessions.learner, separate.id, {
        questId: fixture.questId,
      });
      await service.submitEvidence(fixture.sessions.learner, separate.id, {
        reflection: "I compared the two objects and tried a new idea.",
        observedEntityIds: [fixture.task.scenePlan.entities[0].id],
      });
      await db.client`update quests set needs_educator_review=true where id=${fixture.questId}`;
      assert.equal(
        (
          await request(
            "parent",
            `/goals/${separate.id}/guardian-feedback`,
            body,
          )
        ).status,
        409,
      );
      await db.client`update quests set needs_educator_review=false where id=${fixture.questId}`;
      const brokenReply = createLearningService({
        ...repository,
        transaction: (work) =>
          repository.transaction((tx) =>
            work({
              ...tx,
              quests: {
                ...tx.quests,
                logAuditEvent: async () => {
                  throw new Error("guardian audit failure");
                },
              },
            }),
          ),
      });
      await assert.rejects(
        brokenReply.submitGuardianFeedback(
          fixture.sessions.parent,
          separate.id,
          body,
        ),
        /guardian audit failure/,
      );
      assert.equal(
        (
          await db.client`select count(*)::int as n from learning_guardian_feedback where goal_id=${separate.id}`
        )[0].n,
        0,
      );
      const replies = await Promise.all([
        request("parent", `/goals/${separate.id}/guardian-feedback`, body),
        request("parent", `/goals/${separate.id}/guardian-feedback`, body),
      ]);
      assert.deepEqual(replies.map((r) => r.status).sort(), [201, 409]);
      for (const actor of ["learner", "parent", "educator"]) {
        const detail = await (
          await request(actor, `/goals/${separate.id}`)
        ).json();
        assert.equal(detail.journey.guardianFeedback.comment, body.comment);
        assert.equal(
          detail.journey.guardianFeedback.guardianId,
          fixture.users.parent.id,
        );
        assert.equal(detail.journey.feedback, null);
        assert.equal(detail.journey.satisfaction, null);
      }
      assert.equal(
        (await db.client`select count(*)::int as n from mastery_signals`)[0].n,
        0,
      );
      assert.equal(
        (
          await request("parent", `/goals/${separate.id}/guardian-feedback`, {
            comment: "Replace the original reply",
          })
        ).status,
        409,
      );
    },
  );
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
      assert.equal(
        (
          await request("parent", `${path}/guardian-feedback`, {
            comment: "This must be refused after unlinking",
          })
        ).status,
        403,
      );
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
    "full bootstrap repairs legacy event constraint and session revocation is immediate",
    async () => {
      await db.client`
      insert into quest_events (quest_id, type, performed_by_user_id, performed_by_role)
      values (${fixture.questId}, 'educator_reviewed', ${fixture.users.educator.id}, 'educator')
    `;
      await createAuthRepository(db.client).revoke(
        fixture.sessions.learner.sessionId,
      );
      assert.equal((await request("learner", path)).status, 401);
    },
  );
});
