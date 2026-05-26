import {
  listModerationPostsRequestSchema,
  postActionRequestSchema,
} from "@headstrong/core";
import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import type { AppVariables } from "../lib/context";
import { requireAuth, requireRole } from "../middleware/auth";
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

export const moderationRoutes: Hono<{ Variables: AppVariables }> = new Hono<{
  Variables: AppVariables;
}>()
  .get(
    "/posts",
    requireAuth,
    requireRole("admin", "educator"),
    zValidator("query", listModerationPostsRequestSchema),
    async (c) => {
      try {
        return c.json(
          await socialService.listModerationPosts(
            c.get("user"),
            c.req.valid("query"),
          ),
        );
      } catch (error) {
        return handleSocialServiceError(error, c);
      }
    },
  )
  .post(
    "/posts/:id/remove",
    requireAuth,
    requireRole("admin", "educator"),
    zValidator("json", postActionRequestSchema),
    async (c) => {
      try {
        return c.json(
          await socialService.removePost(
            c.get("user"),
            c.req.param("id"),
            c.req.valid("json"),
          ),
        );
      } catch (error) {
        return handleSocialServiceError(error, c);
      }
    },
  )
  .post(
    "/posts/:id/restore",
    requireAuth,
    requireRole("admin", "educator"),
    zValidator("json", postActionRequestSchema),
    async (c) => {
      try {
        return c.json(
          await socialService.restorePost(
            c.get("user"),
            c.req.param("id"),
            c.req.valid("json"),
          ),
        );
      } catch (error) {
        return handleSocialServiceError(error, c);
      }
    },
  );
