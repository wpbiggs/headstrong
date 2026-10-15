import { Hono } from "hono";

// Do not mint real credentials from the unverified LTI scaffold, even when old flags
// accidentally enable it. Verified issuer/JWKS/deployment/state/nonce handling is required.
export const integrationRoutes = new Hono()
  .get("/lti/oidc/login", (c) =>
    c.json({ error: "Verified LTI launches are not implemented." }, 501),
  )
  .get("/lti/oidc/callback", (c) =>
    c.json({ error: "Unverified LTI session handoff is disabled." }, 501),
  )
  .post("/lti/oidc/callback", (c) =>
    c.json({ error: "Unverified LTI session handoff is disabled." }, 501),
  );
