import { createGuildRequestSchema } from "@headstrong/core";
import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import type { AppVariables } from "../lib/context";
import { requireAuth } from "../middleware/auth";
import {
  SocialServiceError,
  createSocialService,
} from "../services/social-service";

const socialService = createSocialService();

function handleSocialServiceError(
  error: unknown,
  context: Context<{ Variables: AppVariables }>,
) {
  if (error instanceof SocialServiceError) {
    return context.json({ error: error.message }, error.status as never);
  }

  throw error;
}

export const guildRoutes: Hono<{ Variables: AppVariables }> = new Hono<{
  Variables: AppVariables;
}>()
  .post(
    "/",
    requireAuth,
    zValidator("json", createGuildRequestSchema),
    async (c) => {
      try {
        return c.json(
          await socialService.createGuild(c.get("user"), c.req.valid("json")),
          201,
        );
      } catch (error) {
        return handleSocialServiceError(error, c);
      }
    },
  )
  .post("/:id/join", requireAuth, async (c) => {
    try {
      return c.json(
        await socialService.joinGuild(c.get("user"), c.req.param("id")),
      );
    } catch (error) {
      return handleSocialServiceError(error, c);
    }
  })
  .post("/:id/leave", requireAuth, async (c) => {
    try {
      await socialService.leaveGuild(c.get("user"), c.req.param("id"));
      return c.body(null, 204);
    } catch (error) {
      return handleSocialServiceError(error, c);
    }
  })
  .get("/:id/feed", requireAuth, async (c) => {
    try {
      return c.json(
        await socialService.listGuildFeed(
          c.get("user"),
          c.req.param("id"),
          c.req.query("cursor") ?? undefined,
          c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
        ),
      );
    } catch (error) {
      return handleSocialServiceError(error, c);
    }
  });
