import assert from "node:assert/strict";
import test from "node:test";
import { createSession, signSession } from "../auth";
import { createLearningRoutes } from "./learning";

test("disabled learning routes do not expose data or require a session", async () => {
  const app = createLearningRoutes(undefined, () => false);
  const response = await app.request("/goals/not-an-id");
  assert.equal(response.status, 404);
});

test("enabled routes require auth, validate IDs and bound bodies before service calls", async () => {
  const app = createLearningRoutes(undefined, () => true);
  assert.equal((await app.request("/goals/not-an-id")).status, 401);
  const token = await signSession(
    await createSession(crypto.randomUUID(), "fixture@example.test", "student"),
  );
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  assert.equal(
    (await app.request("/goals/not-an-id", { headers })).status,
    400,
  );
  assert.equal(
    (
      await app.request("/goals", {
        method: "POST",
        headers,
        body: JSON.stringify({ objective: "short".repeat(5000) }),
      })
    ).status,
    413,
  );
  assert.equal(
    (
      await app.request("/goals", {
        method: "POST",
        headers,
        body: JSON.stringify({ objective: "" }),
      })
    ).status,
    400,
  );
});
