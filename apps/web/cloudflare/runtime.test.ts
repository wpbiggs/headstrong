import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { createTestHarness } from "wrangler";

test("built web Worker authenticates HTML and assets and fails closed in workerd", async (t) => {
  const issuer = "https://runtime-fixture.cloudflareaccess.com";
  const audience = "runtime-preview";
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "runtime-key" };
  const sign = (aud = audience, expiration: string | number = "5m") =>
    new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
      .setIssuer(issuer)
      .setAudience(aud)
      .setSubject("synthetic-preview-user")
      .setIssuedAt()
      .setExpirationTime(expiration)
      .sign(privateKey);
  const outbound: string[] = [];
  // Supported harness egress interception, not a replacement auth verifier:
  // https://developers.cloudflare.com/workers/testing/test-harness/prepare-test-state/#mock-outbound-requests
  const fetchMock = t.mock.method(globalThis, "fetch", async (input, init) => {
    const request = new Request(input, init);
    outbound.push(request.url);
    assert.equal(request.url, `${issuer}/cdn-cgi/access/certs`);
    assert.equal(request.method, "GET");
    return Response.json({ keys: [jwk] });
  });
  const directory = fileURLToPath(new URL("../dist/server/", import.meta.url));
  const source = JSON.parse(
    await readFile(path.join(directory, "wrangler.json"), "utf8"),
  );
  const temporary = await mkdtemp(
    path.join(tmpdir(), "headstrong-web-worker-test-"),
  );
  const config = path.join(temporary, "wrangler.json");
  const {
    configPath: _configPath,
    userConfigPath: _userConfigPath,
    ...settings
  } = source;
  await writeFile(
    config,
    JSON.stringify({
      ...settings,
      main: path.join(directory, source.main),
      assets: {
        ...source.assets,
        directory: path.resolve(directory, source.assets.directory),
      },
      services: [], // no request may contact the real API
      vars: {
        PREVIEW_SYNTHETIC_DATA_ONLY: "true",
        ACCESS_ISSUER: issuer,
        ACCESS_AUDIENCE: audience,
      },
      observability: { enabled: false },
    }),
  );
  const server = createTestHarness({ workers: [{ configPath: config }] });
  try {
    await server.listen();
    for (const target of [
      "/learn",
      "/api/learning/goals",
      "/_next/static/chunks/client.js",
      "/admin",
    ]) {
      const response = await server.fetch(target);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
    const forged = await server.fetch("/learn", {
      headers: {
        "Cf-Access-Jwt-Assertion": "forged",
        "Cf-Access-Authenticated-User-Email": "admin@example.test",
      },
    });
    assert.equal(forged.status, 401);
    const headers = { "Cf-Access-Jwt-Assertion": await sign() };
    const entry = await server.fetch("/", { headers, redirect: "manual" });
    assert.equal(entry.status, 302);
    assert.equal(
      new URL(entry.headers.get("location") ?? "").pathname,
      "/learn",
    );
    const page = await server.fetch("/learn", { headers });
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type") ?? "", /text\/html/);
    assert.equal(page.headers.get("cache-control"), "no-store");
    assert.equal(page.headers.get("x-frame-options"), "DENY");
    const html = await page.text();
    // Assert a real rendered heading without coupling this gate to journey copy.
    assert.match(html, /<h1\b[^>]*>\s*[^<\s][\s\S]*?<\/h1>/);
    assert.doesNotMatch(html, /Learning prototype is disabled/);
    const asset = html.match(
      /(?:src|href)="((?:\/assets\/|\/_next\/static\/)[^"?]+\.(?:js|css))"/,
    )?.[1];
    assert.ok(asset, "rendered HTML must reference a built JS or CSS asset");
    const assetResponse = await server.fetch(asset, { headers });
    assert.equal(assetResponse.status, 200);
    assert.match(
      assetResponse.headers.get("content-type") ?? "",
      /(?:javascript|text\/css)/,
    );
    assert.equal(assetResponse.headers.get("cache-control"), "no-store");
    assert.equal(
      await assetResponse.text(),
      await readFile(
        path.join(directory, source.assets.directory, asset),
        "utf8",
      ),
      "asset dispatch must serve the actual built file, not HTML fallback",
    );
    assert.equal((await server.fetch(asset)).status, 401);
    for (const token of [
      await sign("wrong-audience"),
      await sign(audience, 1),
    ]) {
      const denied = await server.fetch("/learn", {
        headers: { "Cf-Access-Jwt-Assertion": token },
      });
      assert.equal(denied.status, 401);
      assert.equal(denied.headers.get("cache-control"), "no-store");
    }
    for (const target of [
      "/admin",
      "/compute",
      "/api/admin/users",
      "/api/auth/login",
      "/api/integrations/lti/oidc/callback",
      "/__fixture",
    ]) {
      const denied = await server.fetch(target, { headers });
      assert.equal(denied.status, 404);
      assert.equal(denied.headers.get("cache-control"), "no-store");
    }
    const unavailable = await server.fetch("/api/learning/goals", { headers });
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get("cache-control"), "no-store");
    assert.deepEqual(await unavailable.json(), {
      error: "Preview unavailable.",
    });
    assert.ok(outbound.length > 0, "production verifier must retrieve JWKS");
    assert.ok(
      outbound.every((url) => url === `${issuer}/cdn-cgi/access/certs`),
    );
  } finally {
    await server.close();
    fetchMock.mock.restore();
    await rm(temporary, { recursive: true, force: true });
  }
});
