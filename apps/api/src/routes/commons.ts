import {
  createCurriculumAssetRequestSchema,
  listCurriculumAssetsRequestSchema,
  recordCurriculumImpactRequestSchema,
  remixCurriculumAssetRequestSchema,
} from "@headstrong/core";
import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import type { AppVariables } from "../lib/context";
import { requireAuth } from "../middleware/auth";
import {
  CommonsServiceError,
  createCommonsService,
} from "../services/commons-service";

const commonsService = createCommonsService();

function handleCommonsServiceError(
  error: unknown,
  context: Context<{ Variables: AppVariables }>,
) {
  if (error instanceof CommonsServiceError) {
    return context.json({ error: error.message }, error.status as never);
  }
  throw error;
}

export const commonsRoutes: Hono<{ Variables: AppVariables }> = new Hono<{
  Variables: AppVariables;
}>()
  .post(
    "/assets",
    requireAuth,
    zValidator("json", createCurriculumAssetRequestSchema),
    async (c) => {
      try {
        return c.json(
          await commonsService.createAsset(c.get("user"), c.req.valid("json")),
          201,
        );
      } catch (error) {
        return handleCommonsServiceError(error, c);
      }
    },
  )
  .get(
    "/assets",
    zValidator("query", listCurriculumAssetsRequestSchema),
    async (c) => {
      try {
        return c.json(await commonsService.listAssets(c.req.valid("query")));
      } catch (error) {
        return handleCommonsServiceError(error, c);
      }
    },
  )
  .get("/assets/:id", async (c) => {
    try {
      return c.json(await commonsService.getAsset(c.req.param("id")));
    } catch (error) {
      return handleCommonsServiceError(error, c);
    }
  })
  .post(
    "/assets/:id/remix",
    requireAuth,
    zValidator("json", remixCurriculumAssetRequestSchema),
    async (c) => {
      try {
        return c.json(
          await commonsService.remixAsset(
            c.get("user"),
            c.req.param("id"),
            c.req.valid("json"),
          ),
          201,
        );
      } catch (error) {
        return handleCommonsServiceError(error, c);
      }
    },
  )
  .post(
    "/assets/:id/impact",
    requireAuth,
    zValidator("json", recordCurriculumImpactRequestSchema),
    async (c) => {
      try {
        return c.json(
          await commonsService.recordImpact(
            c.get("user"),
            c.req.param("id"),
            c.req.valid("json"),
          ),
        );
      } catch (error) {
        return handleCommonsServiceError(error, c);
      }
    },
  );
