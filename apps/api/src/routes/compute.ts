import { computeJobRequestSchema } from "@headstrong/core";
import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import type { AppVariables } from "../lib/context";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  ComputeServiceError,
  createComputeService,
} from "../services/compute-service";

const computeService = createComputeService();

function handleComputeServiceError(
  error: unknown,
  context: Context<{ Variables: AppVariables }>,
) {
  if (error instanceof ComputeServiceError) {
    return context.json({ error: error.message }, error.status as never);
  }
  throw error;
}

export const computeRoutes: Hono<{ Variables: AppVariables }> = new Hono<{
  Variables: AppVariables;
}>()
  .post(
    "/jobs",
    requireAuth,
    requireRole("admin", "educator"),
    zValidator("json", computeJobRequestSchema),
    async (c) => {
      try {
        return c.json(
          await computeService.scheduleJob(c.get("user"), c.req.valid("json")),
          201,
        );
      } catch (error) {
        return handleComputeServiceError(error, c);
      }
    },
  )
  .get(
    "/jobs/:id",
    requireAuth,
    requireRole("admin", "educator"),
    async (c) => {
      try {
        return c.json(
          await computeService.getJob(c.get("user"), c.req.param("id")),
        );
      } catch (error) {
        return handleComputeServiceError(error, c);
      }
    },
  );
