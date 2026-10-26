import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createTestHarness } from "wrangler";

test("built web Worker gates HTML and static assets before rendering in workerd", async () => {
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
      services: [], // denial tests must never contact the real API
      vars: { ...source.vars, PREVIEW_SYNTHETIC_DATA_ONLY: "true" },
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
  } finally {
    await server.close();
    await rm(temporary, { recursive: true, force: true });
  }
});
