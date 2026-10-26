import { Hono } from "hono";
import type { AppVariables } from "../lib/context";
import { requireAuth } from "../middleware/auth";
import { createAuthRepository } from "../repositories/auth-repository";

export function createAuthRoutes(
  repository = createAuthRepository(),
  authenticate = requireAuth,
) {
  return new Hono<{ Variables: AppVariables }>()
    .post("/login", (c) =>
      c.json(
        {
          error:
            "Email/role login has been removed. Use an operator-provisioned access token.",
        },
        410,
      ),
    )
    .post("/logout", authenticate, async (c) => {
      await repository.revoke(c.get("user").sessionId);
      c.header("Cache-Control", "no-store");
      return c.body(null, 204);
    });
}

export const authRoutes = createAuthRoutes();
