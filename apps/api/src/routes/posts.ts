import {
  createDiscoveryPostRequestSchema,
  createReactionRequestSchema,
  createReportRequestSchema,
  listDiscoveryFeedRequestSchema,
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

export const postRoutes: Hono<{ Variables: AppVariables }> = new Hono<{
  Variables: AppVariables;
}>()
  .post(
    "/",
    requireAuth,
    zValidator("json", createDiscoveryPostRequestSchema),
    async (c) => {
      try {
        return c.json(
          await socialService.createPost(c.get("user"), c.req.valid("json")),
          201,
        );
      } catch (error) {
        return handleSocialServiceError(error, c);
      }
    },
  )
  .get(
    "/feed",
    requireAuth,
    zValidator("query", listDiscoveryFeedRequestSchema),
    async (c) => {
      try {
        const query = c.req.valid("query");
        return c.json(
          await socialService.listFeed(
            c.get("user"),
            query.cursor,
            query.limit,
            query.topic,
          ),
        );
      } catch (error) {
        return handleSocialServiceError(error, c);
      }
    },
  )
  .get(
    "/parent-approval",
    requireAuth,
    requireRole("parent", "admin"),
    zValidator("query", listDiscoveryFeedRequestSchema),
    async (c) => {
      try {
        const query = c.req.valid("query");
        return c.json(
          await socialService.listParentApprovalQueue(
            c.get("user"),
            query.cursor,
            query.limit,
          ),
        );
      } catch (error) {
        return handleSocialServiceError(error, c);
      }
    },
  )
  .get("/:id", requireAuth, async (c) => {
    try {
      return c.json(
        await socialService.getPostDetail(c.get("user"), c.req.param("id")),
      );
    } catch (error) {
      return handleSocialServiceError(error, c);
    }
  })
  .post(
    "/:id/approve-parent",
    requireAuth,
    requireRole("parent", "admin"),
    zValidator("json", postActionRequestSchema),
    async (c) => {
      try {
        return c.json(
          await socialService.approveParent(
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
    "/:id/reject-parent",
    requireAuth,
    requireRole("parent", "admin"),
    zValidator("json", postActionRequestSchema),
    async (c) => {
      try {
        return c.json(
          await socialService.rejectParent(
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
    "/:id/react",
    requireAuth,
    zValidator("json", createReactionRequestSchema),
    async (c) => {
      try {
        return c.json(
          await socialService.react(
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
    "/:id/report",
    requireAuth,
    zValidator("json", createReportRequestSchema),
    async (c) => {
      try {
        return c.json(
          await socialService.report(
            c.get("user"),
            c.req.param("id"),
            c.req.valid("json"),
          ),
          201,
        );
      } catch (error) {
        return handleSocialServiceError(error, c);
      }
    },
  );
