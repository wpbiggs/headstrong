import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { awakeningExperience } from "../../web/lib/awakening";
import { verifySession } from "../src/auth";
import { createRequireAuth } from "../src/middleware/auth";
import { runMigrations } from "../src/migrations";
import { createQuestRepository } from "../src/repositories/app-repository";
import { createAuthRepository } from "../src/repositories/auth-repository";
import { createLearningRepository } from "../src/repositories/learning-repository";
import { createLearningRoutes } from "../src/routes/learning";
import { createLearningService } from "../src/services/learning-service";
import { createQuestService } from "../src/services/quest-service";
import {
  createDisposableDatabase,
  seedLearningFixture,
} from "./learning-fixture";

// Test-only server: fixture identities are intentionally public on loopback, never mounted in app.
const db = await createDisposableDatabase();
try {
  await runMigrations(
    db.client,
    fileURLToPath(new URL("../migrations", import.meta.url)),
  );
  const fixture = await seedLearningFixture(db.client);
  // Curated adventure provisioning exists only in this disposable test server.
  // It exercises real approval/session/evidence checks; it is not a hosted seed.
  const questService = createQuestService(createQuestRepository(db.client));
  const adventure = await questService.createDraftQuest(
    fixture.sessions.learner,
    {
      studentId: fixture.users.learner.id,
      parentId: fixture.users.parent.id,
      educatorId: fixture.users.educator.id,
      composition: {
        ...fixture.composition,
        title: "The Awakening",
        summary: awakeningExperience.scene.summary,
        templateId: awakeningExperience.scene.templateId,
        scenePlan: awakeningExperience.scene,
        tasks: [
          {
            ...fixture.composition.tasks[0],
            title: "Try wings and wind",
            summary: awakeningExperience.objective,
            contentRef: "curated/awakening-v1",
            templateId: awakeningExperience.scene.templateId,
            scenePlan: awakeningExperience.scene,
          },
        ],
        contentReferences: [
          { id: "curated/awakening-v1", title: "The Awakening", kind: "scene" },
        ],
      },
    },
  );
  await questService.transitionQuest(
    fixture.sessions.learner,
    adventure.quest.id,
    "submitted_for_approval",
    {},
  );
  await questService.transitionQuest(
    fixture.sessions.parent,
    adventure.quest.id,
    "parent_approved",
    {},
  );
  const learning = createLearningService(createLearningRepository(db.client));
  const adventureGoal = await learning.createGoal(fixture.sessions.learner, {
    objective: awakeningExperience.objective,
  });
  await learning.selectQuest(fixture.sessions.learner, adventureGoal.id, {
    questId: adventure.quest.id,
  });
  const app = new Hono();
  app.use(
    "*",
    cors({ origin: ["http://127.0.0.1:3000", "http://localhost:3000"] }),
  );
  app.route(
    "/learning",
    createLearningRoutes(
      createLearningService(createLearningRepository(db.client)),
      undefined,
      createRequireAuth((token) =>
        verifySession(token, createAuthRepository(db.client)),
      ),
    ),
  );
  app.get("/__fixture", (c) =>
    c.json({
      tokens: fixture.tokens,
      questId: fixture.questId,
      adventureGoalId: adventureGoal.id,
    }),
  );
  const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 4000 });
  console.log(
    "Disposable fixture API ready at http://127.0.0.1:4000; identities at /__fixture",
  );
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    server.close();
    await db.cleanup();
    process.exit(0);
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch (error) {
  await db.cleanup();
  throw error;
}
