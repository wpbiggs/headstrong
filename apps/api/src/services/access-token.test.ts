import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { SignJWT, decodeJwt } from "jose";
import { memoryAuthRepository } from "../../tests/memory-auth";
import { createSession, signSession, verifySession } from "../auth";
import { env } from "../env";
import { createRequireAuth } from "../middleware/auth";
import { createAuthRoutes } from "../routes/auth";
import { integrationRoutes } from "../routes/integrations";

test("provisioned tokens are bounded, issuer/audience checked and revocable", async () => {
  const repo = memoryAuthRepository();
  const session = await createSession(
    crypto.randomUUID(),
    "fixture@example.test",
    "student",
  );
  const token = await signSession(session, repo);
  assert.deepEqual(await verifySession(token, repo), session);
  const claims = decodeJwt(token);
  assert.equal(claims.iss, "headstrong");
  assert.equal(claims.aud, "headstrong-api");
  assert.ok((claims.exp ?? 0) - (claims.iat ?? 0) <= 3600);
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  for (const forged of [
    await new SignJWT(session)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret),
    await new SignJWT(session)
      .setProtectedHeader({ alg: "HS384" })
      .setIssuer("headstrong")
      .setAudience("headstrong-api")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret),
    await new SignJWT(session)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("headstrong")
      .setAudience("headstrong-api")
      .setIssuedAt()
      .setExpirationTime(1)
      .sign(secret),
    `${token.slice(0, -10)}aaaaaaaaaa`,
  ])
    await assert.rejects(verifySession(forged, repo));
  await repo.revoke(session.sessionId);
  await assert.rejects(verifySession(token, repo), /revoked/);
});

test("removed login and LTI scaffold cannot mint real sessions", async () => {
  assert.equal(
    (
      await createAuthRoutes().request("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "attacker@example.test", role: "admin" }),
      })
    ).status,
    410,
  );
  for (const [path, method] of [
    ["/lti/oidc/login", "GET"],
    ["/lti/oidc/callback?login_hint=admin", "GET"],
    ["/lti/oidc/callback", "POST"],
  ]) {
    assert.equal(
      (await integrationRoutes.request(path, { method })).status,
      501,
    );
  }
});

test("logout invalidates its token and downstream errors are not mislabeled as bad credentials", async () => {
  const repo = memoryAuthRepository();
  const token = await signSession(
    await createSession(crypto.randomUUID(), "fixture@example.test", "student"),
    repo,
  );
  const authenticate = createRequireAuth((value) => verifySession(value, repo));
  const headers = { Authorization: `Bearer ${token}` };
  const errors = new Hono().use("*", authenticate).get("/", () => {
    throw new Error("fixture downstream error");
  });
  errors.onError((_, c) => c.json({ error: "fixture" }, 500));
  assert.equal((await errors.request("/", { headers })).status, 500);
  const auth = createAuthRoutes(repo, authenticate);
  assert.equal(
    (await auth.request("/logout", { method: "POST", headers })).status,
    204,
  );
  assert.equal(
    (await auth.request("/logout", { method: "POST", headers })).status,
    401,
  );
});
