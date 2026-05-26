import {
  questLmsCompletionRequestSchema,
  questLmsPublishRequestSchema,
} from "@headstrong/core";
import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import type { AppVariables } from "../lib/context";
import { requireAuth, requireRole } from "../middleware/auth";
import { LmsServiceError, createLmsService } from "../services/lms-service";

const lmsService = createLmsService();

function handleLmsServiceError(
  error: unknown,
  context: Context<{ Variables: AppVariables }>,
) {
  if (error instanceof LmsServiceError) {
    return context.json({ error: error.message }, error.status as never);
  }
  throw error;
}

export const lmsRoutes: Hono<{ Variables: AppVariables }> = new Hono<{
  Variables: AppVariables;
}>()
  .post(
    "/quests/:questId/publish",
    requireAuth,
    requireRole("educator", "admin"),
    zValidator("json", questLmsPublishRequestSchema),
    async (c) => {
      try {
        return c.json(
          await lmsService.publishQuest(
            c.get("user"),
            c.req.param("questId"),
            c.req.valid("json"),
          ),
        );
      } catch (error) {
        return handleLmsServiceError(error, c);
      }
    },
  )
  .post(
    "/quests/:questId/completion",
    requireAuth,
    requireRole("educator", "admin"),
    zValidator("json", questLmsCompletionRequestSchema),
    async (c) => {
      try {
        return c.json(
          await lmsService.recordCompletion(
            c.get("user"),
            c.req.param("questId"),
            c.req.valid("json"),
          ),
        );
      } catch (error) {
        return handleLmsServiceError(error, c);
      }
    },
  );
