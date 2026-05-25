import type { Session } from "@headstrong/core";
import type { MiddlewareHandler } from "hono";
import { createFactory } from "hono/factory";
import { verifySession } from "../auth";
import type { AppVariables } from "../lib/context";
import { createQuestRepository } from "../repositories/app-repository";

const factory = createFactory<{ Variables: AppVariables }>();

export function getAuthenticatedUser(session: Session) {
  return session;
}

export const requireAuth: MiddlewareHandler<{ Variables: AppVariables }> =
  factory.createMiddleware(async (c, next) => {
    const authorization = c.req.header("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return c.json({ error: "Missing bearer token." }, 401);
    }

    try {
      const token = authorization.slice("Bearer ".length);
      const session = await verifySession(token);
      c.set("user", getAuthenticatedUser(session));
      await next();
    } catch {
      return c.json({ error: "Invalid session." }, 401);
    }
  });

export function requireRole(...roles: Session["role"][]) {
  return factory.createMiddleware(async (c, next) => {
    const user = c.get("user");

    if (!roles.includes(user.role)) {
      return c.json({ error: "Forbidden." }, 403);
    }

    await next();
  });
}

export async function canAccessStudentScope(
  user: Session,
  studentId: string,
  isParentOf: (parentId: string, childId: string) => Promise<boolean>,
) {
  if (user.role === "admin") {
    return true;
  }

  if (user.role === "student") {
    return user.sub === studentId;
  }

  if (user.role === "parent") {
    return isParentOf(user.sub, studentId);
  }

  return false;
}

export function requireParentOf(
  resolveStudentId: (
    context: Parameters<MiddlewareHandler<{ Variables: AppVariables }>>[0],
  ) => string,
) {
  return factory.createMiddleware(async (c, next) => {
    const studentId = resolveStudentId(c);
    const user = c.get("user");
    const repository = createQuestRepository();
    const allowed = await canAccessStudentScope(
      user,
      studentId,
      repository.isParentOf,
    );

    if (!allowed) {
      return c.json({ error: "Student scope access denied." }, 403);
    }

    await next();
  });
}
