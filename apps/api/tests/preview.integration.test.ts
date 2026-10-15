import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import postgres from "postgres";
import { createTestHarness } from "wrangler";
import { z } from "zod";
import { createSession, signSession } from "../src/auth";
import { runMigrations } from "../src/migrations";
import { createPreviewApp } from "../src/preview-app";
import { createAuthRepository } from "../src/repositories/auth-repository";
import {
  createDisposableDatabase,
  seedLearningFixture,
} from "./learning-fixture";

test("preview DB role, RLS and API preserve the learning loop without browser database access", async (t) => {
  const db = await createDisposableDatabase();
  const roleExists =
    (
      await db.client`select 1 from pg_roles where rolname = 'headstrong_preview_api'`
    ).length > 0;
  const roleUrl = new URL(db.url);
  roleUrl.username = "headstrong_preview_api";
  roleUrl.password = "unused-local-trust-fixture";
  const client = postgres(roleUrl.toString(), { max: 2, fetch_types: false });
  const browserRole = `headstrong_browser_${randomUUID().replaceAll("-", "")}`;
  let browserCreated = false;
  t.after(async () => {
    await client.end();
    if (browserCreated) {
      await db.client`drop owned by ${db.client(browserRole)}`;
      await db.client`drop role ${db.client(browserRole)}`;
    }
    if (!roleExists) {
      await db.client`drop owned by headstrong_preview_api`;
      await db.client`drop role if exists headstrong_preview_api`;
    }
    await db.cleanup();
  });
  await runMigrations(
    db.client,
    fileURLToPath(new URL("../migrations", import.meta.url)),
  );
  const security = await readFile(
    new URL("../../../infra/supabase/preview-security.sql", import.meta.url),
    "utf8",
  );
  const provisioner = await db.client.reserve();
  try {
    await provisioner.unsafe(security);
    await provisioner.unsafe(security); // repeatable provisioning
  } finally {
    provisioner.release();
  }
  const exec = promisify(execFile);
  const seedOptions = {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: {
      ...process.env,
      DATABASE_URL: db.url,
      PREVIEW_SYNTHETIC_DATA_ONLY: "true",
      QUEST_COMPOSER_PROVIDER: "ai",
    },
  };
  const seeded = await exec(
    process.execPath,
    ["--import", "tsx", "scripts/seed-preview.ts"],
    seedOptions,
  );
  assert.equal(JSON.parse(seeded.stdout).accounts.length, 3);
  await assert.rejects(
    exec(
      process.execPath,
      ["--import", "tsx", "scripts/seed-preview.ts"],
      seedOptions,
    ),
    /empty users table/,
  );
  assert.equal((await db.client`select * from users`).length, 3);
  const fixture = await seedLearningFixture(db.client);
  await db.client`create role ${db.client(browserRole)} nologin`;
  browserCreated = true;
  await db.client`grant usage on schema public to ${db.client(browserRole)}`;
  await db.client`grant select on users to ${db.client(browserRole)}`;
  await db.client.begin(async (tx) => {
    await tx`set local role ${tx(browserRole)}`;
    assert.equal((await tx`select count(*)::int as n from users`)[0].n, 0);
  });
  const app = createPreviewApp(
    client,
    process.env.JWT_SECRET ?? "",
    async () => ({ success: true }),
  );
  const headers = {
    Authorization: `Bearer ${fixture.tokens.learner}`,
    "Content-Type": "application/json",
  };
  assert.equal(
    (await app.request("/learning/goals", { method: "POST" })).status,
    401,
  );
  assert.equal((await app.request("/admin/users", { headers })).status, 404);
  assert.equal(
    (await app.request("/auth/login", { method: "POST", headers })).status,
    404,
  );
  const created = await app.request("/learning/goals", {
    method: "POST",
    headers,
    body: JSON.stringify({
      objective: "Explore fractions in a private preview",
    }),
  });
  assert.equal(created.status, 201);
  const goal = await created.json();
  const path = `/learning/goals/${goal.id}`;
  const selected = await app.request(`${path}/quest`, {
    method: "POST",
    headers,
    body: JSON.stringify({ questId: fixture.questId }),
  });
  assert.equal(selected.status, 200);
  const evidence = await app.request(`${path}/evidence`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      reflection: "Two equal halves combine into one whole.",
      observedEntityIds: [fixture.task.scenePlan?.entities[0].id],
    }),
  });
  assert.equal(evidence.status, 201);
  assert.equal(
    (
      await app.request(`${path}/feedback`, {
        method: "POST",
        headers: {
          ...headers,
          Authorization: `Bearer ${fixture.tokens.educator}`,
        },
        body: JSON.stringify({
          assessment: "demonstrated",
          comment: "You explained equal halves clearly.",
        }),
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await app.request(`${path}/satisfaction`, {
        method: "POST",
        headers,
        body: JSON.stringify({ enjoyment: 5, agency: 4, challenge: 3 }),
      })
    ).status,
    201,
  );
  const rateLimited = createPreviewApp(
    client,
    process.env.JWT_SECRET ?? "",
    async () => ({ success: false }),
  );
  assert.equal((await rateLimited.request(path, { headers })).status, 429);
  assert.equal(
    (await app.request("/auth/logout", { method: "POST", headers })).status,
    204,
  );
  assert.equal((await app.request(path, { headers })).status, 401);
  await assert.rejects(client`select * from audit_events`, /permission denied/);
  await assert.rejects(
    client`update users set role = 'admin'`,
    /permission denied/,
  );
  await assert.rejects(
    client`update quests set parent_approved_at = now()`,
    /permission denied|does not exist/,
  );
  const tables =
    await db.client`select tablename from pg_tables where schemaname = 'public'`;
  for (const { tablename } of tables) {
    assert.equal(
      (
        await db.client`select relrowsecurity from pg_class where oid = ${`public.${tablename}`}::regclass`
      )[0].relrowsecurity,
      true,
    );
  }
  // Run the actual deployed entry in workerd against the same disposable DB.
  // A temporary local config supplies ONLY a loopback Hyperdrive origin, never remote bindings.
  const temporary = await mkdtemp(
    nodePath.join(tmpdir(), "headstrong-worker-test-"),
  );
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const workerPath = fileURLToPath(
    new URL("../src/worker.ts", import.meta.url),
  );
  const config = nodePath.join(temporary, "wrangler.json");
  const source = JSON.parse(
    await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
  );
  await writeFile(
    config,
    JSON.stringify({
      ...source,
      main: workerPath,
      secrets: { required: [] },
      vars: {
        PREVIEW_SYNTHETIC_DATA_ONLY: "true",
        JWT_SECRET: process.env.JWT_SECRET,
      },
      hyperdrive: [
        {
          binding: "HYPERDRIVE",
          id: "00000000000000000000000000000000",
          localConnectionString: roleUrl.toString(),
        },
      ],
      observability: { enabled: false },
    }),
  );
  const worker = createTestHarness({ workers: [{ configPath: config }] });
  try {
    await worker.listen();
    const token = await signSession(
      await createSession(
        fixture.users.learner.id,
        fixture.users.learner.email,
        "student",
      ),
      createAuthRepository(db.client),
    );
    const runtimeHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const response = await worker.fetch("/learning/goals", {
      method: "POST",
      headers: runtimeHeaders,
      body: JSON.stringify({
        objective: "A goal created inside the Workers runtime",
      }),
    });
    assert.equal(response.status, 201, await response.clone().text());
    const runtimeGoal = z
      .object({ id: z.string().uuid() })
      .parse(await response.json());
    assert.equal(
      (
        await worker.fetch(`/learning/goals/${runtimeGoal.id}`, {
          headers: runtimeHeaders,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await worker.fetch("/auth/logout", {
          method: "POST",
          headers: runtimeHeaders,
        })
      ).status,
      204,
    );
    assert.equal(
      (
        await worker.fetch(`/learning/goals/${runtimeGoal.id}`, {
          headers: runtimeHeaders,
        })
      ).status,
      401,
    );
  } finally {
    await worker.close();
  }
});
