import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { verifyAccessClaims, verifyPreviewAccess } from "./access";
import { type PreviewGateway, previewGateway } from "./gateway";

test("Access claims require verified RS256, issuer, audience, expiry and subject", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const keys = createLocalJWKSet({ keys: [await exportJWK(publicKey)] });
  const issuer = "https://fixture.cloudflareaccess.com";
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(issuer)
    .setAudience("preview")
    .setSubject("operator")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  assert.equal(
    await verifyAccessClaims(token, issuer, "preview", keys),
    "operator",
  );
  await assert.rejects(
    verifyAccessClaims(
      token,
      "https://attacker.cloudflareaccess.com",
      "preview",
      keys,
    ),
  );
  await assert.rejects(verifyAccessClaims(token, issuer, "other-app", keys));
  const expired = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(issuer)
    .setAudience("preview")
    .setSubject("operator")
    .setIssuedAt()
    .setExpirationTime(1)
    .sign(privateKey);
  await assert.rejects(verifyAccessClaims(expired, issuer, "preview", keys));
  const noSubject = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(issuer)
    .setAudience("preview")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  await assert.rejects(verifyAccessClaims(noSubject, issuer, "preview", keys));
  const hmac = await new SignJWT({ sub: "operator" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience("preview")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode("a".repeat(32)));
  await assert.rejects(verifyAccessClaims(hmac, issuer, "preview", keys));
  await assert.rejects(
    verifyPreviewAccess(
      new Request("https://preview.example.test/learn"),
      issuer,
      "preview",
    ),
  );
  await assert.rejects(
    verifyPreviewAccess(
      new Request("https://preview.example.test/learn"),
      "https://attacker.test",
      "preview",
    ),
  );
});

test("preview gateway fails closed and limits routes, methods, origins and credential forwarding", async () => {
  let apiCalls = 0;
  const options: PreviewGateway = {
    enabled: true,
    verify: async () => "verified-operator",
    limit: async () => ({ success: true }),
    api: async (request) => {
      apiCalls++;
      assert.equal(request.url, "https://private-api/learning/goals");
      assert.equal(
        request.headers.get("authorization"),
        "Bearer learner-token",
      );
      assert.equal(request.headers.get("cookie"), null);
      assert.equal(request.headers.get("Cf-Access-Jwt-Assertion"), null);
      assert.equal(new URL(request.url).search, "");
      return Response.json({ id: "fixture" });
    },
    web: async () => new Response("learner interface"),
  };
  const url = "https://preview.example.test";
  const read = new Request(`${url}/api/learning/goals?token=never-forward`, {
    headers: {
      authorization: "Bearer learner-token",
      cookie: "CF_Authorization=secret",
      "Cf-Access-Jwt-Assertion": "assertion",
    },
  });
  assert.equal(
    (await previewGateway(read, { ...options, enabled: false })).status,
    503,
  );
  assert.equal(
    (
      await previewGateway(read, {
        ...options,
        verify: async () => {
          throw new Error("invalid");
        },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await previewGateway(read, {
        ...options,
        limit: async () => ({ success: false }),
      })
    ).status,
    429,
  );
  assert.equal(apiCalls, 0);
  const response = await previewGateway(read, options);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(apiCalls, 1);
  const posted = await previewGateway(
    new Request(`${url}/api/learning/goals`, {
      method: "POST",
      headers: {
        Origin: url,
        Authorization: "Bearer learner-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ objective: "A streamed goal" }),
    }),
    {
      ...options,
      api: async (request) => {
        assert.equal(request.method, "POST");
        assert.equal(request.headers.get("origin"), null);
        assert.deepEqual(await request.json(), {
          objective: "A streamed goal",
        });
        return Response.json({ id: "fixture" }, { status: 201 });
      },
    },
  );
  assert.equal(posted.status, 201);
  for (const path of [
    "/api/admin/users",
    "/api/auth/login",
    "/api/integrations/lti/oidc/callback",
    "/admin",
    "/compute",
    "/__fixture",
  ]) {
    assert.equal(
      (await previewGateway(new Request(url + path), options)).status,
      404,
    );
  }
  assert.equal(
    (
      await previewGateway(
        new Request(`${url}/api/learning/goals`, {
          method: "POST",
          headers: { Origin: "https://attacker.test" },
          body: "{}",
        }),
        options,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await previewGateway(
        new Request(`${url}/api/learning/goals`, { method: "DELETE" }),
        options,
      )
    ).status,
    405,
  );
  assert.equal(
    (
      await previewGateway(
        new Request(`${url}/learn`, { method: "POST" }),
        options,
      )
    ).status,
    405,
  );
  const page = await previewGateway(new Request(`${url}/learn`), options);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("X-Frame-Options"), "DENY");
  assert.equal(
    (
      await previewGateway(
        new Request(`${url}/_next/static/chunks/client.js`),
        options,
      )
    ).status,
    200,
  );
});
