import { loginRequestSchema, loginResponseSchema } from "@headstrong/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createSession, signSession } from "../auth";
import { createQuestRepository } from "../repositories/app-repository";

export const authRoutes = new Hono().post(
  "/login",
  zValidator("json", loginRequestSchema),
  async (c) => {
    const { email, role } = c.req.valid("json");
    const repository = createQuestRepository();
    const existingUser = await repository.findUserByEmail(email);

    if (existingUser && existingUser.role !== role) {
      return c.json({ error: "User role mismatch." }, 409);
    }

    const user = existingUser ?? (await repository.createUser(email, role));
    const session = await createSession(user.id, email, role);
    const token = await signSession(session);

    return c.json(loginResponseSchema.parse({ token, session }));
  },
);
