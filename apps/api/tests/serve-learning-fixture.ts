import { readFile } from "node:fs/promises";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createLearningRepository } from "../src/repositories/learning-repository";
import { createLearningRoutes } from "../src/routes/learning";
import { createLearningService } from "../src/services/learning-service";
import {
  createDisposableDatabase,
  seedLearningFixture,
} from "./learning-fixture";

// Test-only server: fixture identities are intentionally public on loopback, never mounted in app.
const db = await createDisposableDatabase();
try {
  const connection = await db.client.reserve();
  try {
    for (const file of [
      "0001_init.sql",
      "0002_phase1_quests.sql",
      "0003_quest_moderation.sql",
      "0004_quest_review_and_scene_plan.sql",
      "0012_learning_journeys.sql",
    ]) {
      await connection.unsafe(
        await readFile(
          new URL(`../migrations/${file}`, import.meta.url),
          "utf8",
        ),
      );
    }
  } finally {
    connection.release();
  }
  const fixture = await seedLearningFixture(db.client);
  const app = new Hono();
  app.use(
    "*",
    cors({ origin: ["http://127.0.0.1:3000", "http://localhost:3000"] }),
  );
  app.route(
    "/learning",
    createLearningRoutes(
      createLearningService(createLearningRepository(db.client)),
    ),
  );
  app.get("/__fixture", (c) =>
    c.json({ tokens: fixture.tokens, questId: fixture.questId }),
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
