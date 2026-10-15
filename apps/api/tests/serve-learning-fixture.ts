import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
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

// Test-only server: fixture identities are intentionally public on loopback, never mounted in app.
const db = await createDisposableDatabase();
try {
  await runMigrations(
    db.client,
    fileURLToPath(new URL("../migrations", import.meta.url)),
  );
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
      undefined,
      createRequireAuth((token) =>
        verifySession(token, createAuthRepository(db.client)),
      ),
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
