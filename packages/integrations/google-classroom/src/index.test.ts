import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleClassroomConnector } from "./index";

test("google classroom connector returns typed course sync result", async () => {
  const connector = createGoogleClassroomConnector();
  const result = await connector.syncCourse({
    externalId: "course-1",
    title: "Course",
    section: "A",
  });
  assert.ok(result.resourceId.length > 0);
});

test("disabled Google OAuth rejects both paths without network access", async (t) => {
  const original = process.env.ENABLE_GOOGLE_CLASSROOM;
  t.after(() => {
    if (original === undefined)
      Reflect.deleteProperty(process.env, "ENABLE_GOOGLE_CLASSROOM");
    else process.env.ENABLE_GOOGLE_CLASSROOM = original;
  });
  process.env.ENABLE_GOOGLE_CLASSROOM = "false";
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("unexpected network");
  });
  const connector = createGoogleClassroomConnector();
  assert.equal(
    (
      await connector.syncCourse({
        externalId: "synthetic",
        title: "Synthetic",
        section: "A",
      })
    ).status,
    "disabled",
  );
  await assert.rejects(
    () => connector.buildAuthorizationUrl("s".repeat(32)),
    /disabled/,
  );
  await assert.rejects(
    () => connector.exchangeAuthorizationCode("synthetic"),
    /disabled/,
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("Google OAuth validates configuration/input and bounds a mocked token exchange", async (t) => {
  const keys = [
    "ENABLE_GOOGLE_CLASSROOM",
    "GOOGLE_CLASSROOM_CLIENT_ID",
    "GOOGLE_CLASSROOM_CLIENT_SECRET",
    "GOOGLE_CLASSROOM_REDIRECT_URI",
  ];
  const original = keys.map((key) => process.env[key]);
  t.after(() =>
    keys.forEach((key, index) => {
      if (original[index] === undefined)
        Reflect.deleteProperty(process.env, key);
      else process.env[key] = original[index];
    }),
  );
  process.env.ENABLE_GOOGLE_CLASSROOM = "true";
  process.env.GOOGLE_CLASSROOM_CLIENT_ID = "replace-me";
  await assert.rejects(
    () =>
      createGoogleClassroomConnector().buildAuthorizationUrl("s".repeat(32)),
    /credentials/,
  );
  process.env.GOOGLE_CLASSROOM_CLIENT_ID = "synthetic-client";
  process.env.GOOGLE_CLASSROOM_CLIENT_SECRET = "synthetic-secret";
  process.env.GOOGLE_CLASSROOM_REDIRECT_URI =
    "http://untrusted.example/callback";
  await assert.rejects(
    () =>
      createGoogleClassroomConnector().buildAuthorizationUrl("s".repeat(32)),
    /HTTPS/,
  );
  process.env.GOOGLE_CLASSROOM_REDIRECT_URI = "http://localhost:4567/callback";
  const connector = createGoogleClassroomConnector();
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init?: RequestInit) => {
      assert.equal(init?.redirect, "error");
      assert.ok(init?.signal instanceof AbortSignal);
      assert.equal(init?.method, "POST");
      return Response.json({
        access_token: "synthetic-token",
        expires_in: 3600,
      });
    },
  );
  await assert.rejects(() => connector.buildAuthorizationUrl("short"));
  await assert.rejects(() => connector.exchangeAuthorizationCode(" "));
  assert.equal(fetchMock.mock.callCount(), 0);
  const start = await connector.buildAuthorizationUrl("s".repeat(32));
  assert.equal(
    new URL(start.redirectUrl).searchParams.get("state"),
    "s".repeat(32),
  );
  assert.equal(
    (await connector.exchangeAuthorizationCode("synthetic-code")).accessToken,
    "synthetic-token",
  );
  fetchMock.mock.mockImplementation(async () =>
    Response.json({ error: "invalid_grant" }, { status: 400 }),
  );
  await assert.rejects(
    () => connector.exchangeAuthorizationCode("synthetic-code"),
    /Failed to exchange/,
  );
  fetchMock.mock.mockImplementation(async () =>
    Response.json({ access_token: "", expires_in: -1 }),
  );
  await assert.rejects(() =>
    connector.exchangeAuthorizationCode("synthetic-code"),
  );
});
