import {
  learningEvidenceInputSchema,
  learningFeedbackInputSchema,
  learningGoalInputSchema,
  learningSatisfactionInputSchema,
  selectLearningQuestSchema,
} from "@headstrong/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { learningJourneysEnabled } from "../learning-config";
import type { AppVariables } from "../lib/context";
import { requireAuth } from "../middleware/auth";
import {
  LearningError,
  createLearningService,
} from "../services/learning-service";

export function createLearningRoutes(
  service = createLearningService(),
  enabled: () => boolean = learningJourneysEnabled,
  authenticate = requireAuth,
) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use("*", async (c, next) => {
    if (!enabled())
      return c.json({ error: "Learning journeys are disabled." }, 404);
    c.header("Cache-Control", "no-store");
    c.header("Referrer-Policy", "no-referrer");
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
  app.onError((error, c) => {
    if (error instanceof LearningError)
      return c.json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return c.json({ error: "Invalid learning record." }, 400);
    // Do not leak private input or database diagnostics.
    return c.json({ error: "Learning request failed." }, 500);
  });
  const idValidator = zValidator("param", z.object({ id: z.string().uuid() }));
  return app
    .post("/goals", zValidator("json", learningGoalInputSchema), async (c) =>
      c.json(await service.createGoal(c.get("user"), c.req.valid("json")), 201),
    )
    .get("/goals/:id", idValidator, async (c) =>
      c.json(await service.getJourney(c.get("user"), c.req.valid("param").id)),
    )
    .post(
      "/goals/:id/quest",
      idValidator,
      zValidator("json", selectLearningQuestSchema),
      async (c) =>
        c.json(
          await service.selectQuest(
            c.get("user"),
            c.req.valid("param").id,
            c.req.valid("json"),
          ),
        ),
    )
    .post(
      "/goals/:id/evidence",
      idValidator,
      zValidator("json", learningEvidenceInputSchema),
      async (c) =>
        c.json(
          await service.submitEvidence(
            c.get("user"),
            c.req.valid("param").id,
            c.req.valid("json"),
          ),
          201,
        ),
    )
    .post(
      "/goals/:id/feedback",
      idValidator,
      zValidator("json", learningFeedbackInputSchema),
      async (c) =>
        c.json(
          await service.submitFeedback(
            c.get("user"),
            c.req.valid("param").id,
            c.req.valid("json"),
          ),
          201,
        ),
    )
    .post(
      "/goals/:id/satisfaction",
      idValidator,
      zValidator("json", learningSatisfactionInputSchema),
      async (c) =>
        c.json(
          await service.submitSatisfaction(
            c.get("user"),
            c.req.valid("param").id,
            c.req.valid("json"),
          ),
          201,
        ),
    );
}
