import { createCampaignRequestSchema } from "@headstrong/core";
import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import type { AppVariables } from "../lib/context";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  CampaignServiceError,
  createCampaignService,
} from "../services/campaign-service";

const campaignService = createCampaignService();

function handleCampaignServiceError(
  error: unknown,
  context: Context<{ Variables: AppVariables }>,
) {
  if (error instanceof CampaignServiceError) {
    return context.json({ error: error.message }, error.status as never);
  }
  throw error;
}

export const campaignRoutes: Hono<{ Variables: AppVariables }> = new Hono<{
  Variables: AppVariables;
}>()
  .post(
    "/",
    requireAuth,
    requireRole("admin"),
    zValidator("json", createCampaignRequestSchema),
    async (c) => {
      try {
        return c.json(
          await campaignService.createCampaign(
            c.get("user"),
            c.req.valid("json"),
          ),
          201,
        );
      } catch (error) {
        return handleCampaignServiceError(error, c);
      }
    },
  )
  .get("/:id", requireAuth, async (c) => {
    try {
      return c.json(
        await campaignService.getCampaign(c.get("user"), c.req.param("id")),
      );
    } catch (error) {
      return handleCampaignServiceError(error, c);
    }
  });
