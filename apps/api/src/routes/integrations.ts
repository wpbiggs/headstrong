import {
  ltiOidcLoginRequestSchema,
  ltiSessionHandoffSchema,
} from "@headstrong/core/integrations";
import { createLtiProvider } from "@headstrong/integration-lti";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createSession, signSession } from "../auth";
import { createQuestRepository } from "../repositories/app-repository";

const ltiProvider = createLtiProvider();

export const integrationRoutes = new Hono()
  .get(
    "/lti/oidc/login",
    zValidator("query", ltiOidcLoginRequestSchema),
    async (c) => {
      const response = await ltiProvider.initiateLogin(c.req.valid("query"));
      return c.json(response);
    },
  )
  .get("/lti/oidc/callback", async (c) => {
    const context = await ltiProvider.handleCallback(
      new URL(c.req.url).searchParams,
    );
    const repository = createQuestRepository();
    const email = `${context.subject}@lti.local`;
    const inferredRole = context.roles.some((role) =>
      /Instructor|Teacher/i.test(role),
    )
      ? "educator"
      : "student";
    const existingUser = await repository.findUserByEmail(email);

    if (existingUser && existingUser.role !== inferredRole) {
      return c.json({ error: "LTI user role mismatch." }, 409);
    }

    const user =
      existingUser ?? (await repository.createUser(email, inferredRole));
    const session = await createSession(user.id, email, inferredRole);
    const token = await signSession(session);

    return c.json(
      ltiSessionHandoffSchema.parse({
        launch: context,
        session,
        token,
      }),
    );
  });
