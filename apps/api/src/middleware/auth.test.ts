import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@headstrong/core";
import { Hono } from "hono";
import type { AppVariables } from "../lib/context";
import { canAccessStudentScope } from "./auth";
import { requireRole } from "./auth";

function createSessionFixture(overrides: Partial<Session>): Session {
  return {
    sub: overrides.sub ?? crypto.randomUUID(),
    email: overrides.email ?? "test@example.com",
    role: overrides.role ?? "student",
    sessionId: overrides.sessionId ?? crypto.randomUUID(),
  };
}

test("student scope access matrix matches expected roles", async () => {
  const studentId = crypto.randomUUID();
  const parentId = crypto.randomUUID();
  const parentLookup = async (
    candidateParentId: string,
    candidateStudentId: string,
  ) => candidateParentId === parentId && candidateStudentId === studentId;

  const matrix = [
    {
      label: "student self",
      session: createSessionFixture({ role: "student", sub: studentId }),
      expected: true,
    },
    {
      label: "student other",
      session: createSessionFixture({ role: "student" }),
      expected: false,
    },
    {
      label: "linked parent",
      session: createSessionFixture({ role: "parent", sub: parentId }),
      expected: true,
    },
    {
      label: "educator",
      session: createSessionFixture({ role: "educator" }),
      expected: false,
    },
    {
      label: "admin",
      session: createSessionFixture({ role: "admin" }),
      expected: true,
    },
  ];

  const results = [] as Array<{ label: string; allowed: boolean }>;

  for (const entry of matrix) {
    results.push({
      label: entry.label,
      allowed: await canAccessStudentScope(
        entry.session,
        studentId,
        parentLookup,
      ),
    });
  }

  assert.deepEqual(results, [
    { label: "student self", allowed: true },
    { label: "student other", allowed: false },
    { label: "linked parent", allowed: true },
    { label: "educator", allowed: false },
    { label: "admin", allowed: true },
  ]);
});

test("admin enforcement middleware blocks non-admin users", async () => {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use("/admin-test", async (c, next) => {
    c.set("user", createSessionFixture({ role: "parent" }));
    await next();
  });
  app.get("/admin-test", requireRole("admin"), (c) => c.json({ ok: true }));

  const response = await app.request("http://local/admin-test");
  assert.equal(response.status, 403);
});

test("admin enforcement middleware allows admin users", async () => {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use("/admin-test", async (c, next) => {
    c.set("user", createSessionFixture({ role: "admin" }));
    await next();
  });
  app.get("/admin-test", requireRole("admin"), (c) => c.json({ ok: true }));

  const response = await app.request("http://local/admin-test");
  assert.equal(response.status, 200);
});
