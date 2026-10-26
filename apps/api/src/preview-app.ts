import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { verifySession } from "./auth";
import type { DatabaseClient } from "./db";
import type { AppVariables } from "./lib/context";
import { createRequireAuth } from "./middleware/auth";
import { createAuthRepository } from "./repositories/auth-repository";
import { createLearningRepository } from "./repositories/learning-repository";
import { createLearningRoutes } from "./routes/learning";
import { createLearningService } from "./services/learning-service";

export function createPreviewApp(
  client: DatabaseClient,
  secret: string,
  limit: (key: string) => Promise<{ success: boolean }>,
) {
  const app = new Hono<{ Variables: AppVariables }>();
  const repository = createAuthRepository(client);
  const authenticate = createRequireAuth((token) =>
    verifySession(token, repository, secret),
  );
  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("Referrer-Policy", "no-referrer");
    c.header("X-Content-Type-Options", "nosniff");
    await next();
  });
  app.use(
    "*",
    bodyLimit({
      maxSize: 16_384,
      onError: (c) => c.json({ error: "Request body too large." }, 413),
    }),
  );
  app.use("*", authenticate);
  app.use("*", async (c, next) => {
    if (!(await limit(c.get("user").sub)).success)
      return c.json({ error: "Too many requests." }, 429);
    await next();
  });
  app.route(
    "/learning",
    createLearningRoutes(
      createLearningService(createLearningRepository(client)),
      () => true,
      authenticate,
    ),
  );
  app.post("/auth/logout", async (c) => {
    await repository.revoke(c.get("user").sessionId);
    return c.body(null, 204);
  });
  app.onError((_, c) => c.json({ error: "Preview request failed." }, 500));
  return app;
}
