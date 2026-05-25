import { createParentStudentLinksRequestSchema } from "@headstrong/core";
import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import type { AppVariables } from "../lib/context";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  AdminServiceError,
  createAdminService,
} from "../services/admin-service";

const adminService = createAdminService();

function handleAdminServiceError(
  error: unknown,
  context: Context<{ Variables: AppVariables }>,
) {
  if (error instanceof AdminServiceError) {
    return context.json({ error: error.message }, error.status as never);
  }

  throw error;
}

export const adminRoutes: Hono<{ Variables: AppVariables }> = new Hono<{
  Variables: AppVariables;
}>()
  .post(
    "/parent-student-links",
    requireAuth,
    requireRole("admin"),
    zValidator("json", createParentStudentLinksRequestSchema),
    async (c) => {
      try {
        return c.json(
          await adminService.linkParentStudents(
            c.get("user"),
            c.req.valid("json").links,
          ),
          201,
        );
      } catch (error) {
        return handleAdminServiceError(error, c);
      }
    },
  )
  .delete(
    "/parent-student-links/:linkId",
    requireAuth,
    requireRole("admin"),
    async (c) => {
      try {
        await adminService.unlinkParentStudent(
          c.get("user"),
          c.req.param("linkId"),
        );
        return c.body(null, 204);
      } catch (error) {
        return handleAdminServiceError(error, c);
      }
    },
  );
