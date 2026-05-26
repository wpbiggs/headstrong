import { ltiOidcLoginRequestSchema } from "@headstrong/core/integrations";
import { createLtiProvider } from "@headstrong/integration-lti";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

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
    return c.json(context);
  });
