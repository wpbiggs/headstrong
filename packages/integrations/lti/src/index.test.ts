import assert from "node:assert/strict";
import test from "node:test";
import { environmentBooleanSchema } from "@headstrong/core";
import { createLtiConsumer, createLtiProvider } from "./index";

test("lti provider gating is enforced", async () => {
  const provider = createLtiProvider();
  await assert.rejects(() =>
    provider.initiateLogin({
      login_hint: "user-1",
      target_link_uri: "https://example.com/launch",
      issuer: "https://platform.example.com",
    }),
  );
});

test("lti consumer gating is enforced", async () => {
  const consumer = createLtiConsumer();
  await assert.rejects(() =>
    consumer.createLaunchRequest({
      version: "v1",
      issuer: "https://platform.example.com",
      clientId: "client",
      deploymentId: "deployment",
      subject: "subject",
      messageType: "LtiResourceLinkRequest",
      targetLinkUri: "https://example.com/launch",
      roles: ["Learner"],
    }),
  );
});

test("lti callback rejects unverified launch parameters", async () => {
  const provider = createLtiProvider();
  await assert.rejects(() =>
    provider.handleCallback(
      new URLSearchParams({
        issuer: "https://platform.example.com",
        login_hint: "user-1",
        target_link_uri: "https://example.com/launch",
      }),
    ),
  );
});

test("environment flags parse false strictly and reject ambiguous values", () => {
  assert.equal(environmentBooleanSchema.parse("false"), false);
  assert.equal(environmentBooleanSchema.parse("true"), true);
  for (const value of ["0", "1", "yes", "", "FALSE"])
    assert.equal(environmentBooleanSchema.safeParse(value).success, false);
});

test("LTI remains fail-closed even when enabled, with no issuer discovery or launch", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("unexpected network");
  });
  const original = process.env.ENABLE_LTI_PROVIDER;
  t.after(() => {
    if (original === undefined)
      Reflect.deleteProperty(process.env, "ENABLE_LTI_PROVIDER");
    else process.env.ENABLE_LTI_PROVIDER = original;
  });
  for (const flag of ["false", "true"]) {
    process.env.ENABLE_LTI_PROVIDER = flag;
    const provider = createLtiProvider();
    for (const issuer of [
      "http://127.0.0.1/admin",
      "http://169.254.169.254/latest/meta-data",
      "https://platform.example.com",
    ]) {
      await assert.rejects(
        () => provider.discoverPlatform(issuer),
        /unavailable/,
      );
      await assert.rejects(
        () =>
          provider.initiateLogin({
            issuer,
            login_hint: "synthetic",
            target_link_uri: "https://example.com/launch",
          }),
        /disabled|unavailable/,
      );
    }
    for (let replay = 0; replay < 2; replay++)
      await assert.rejects(
        () =>
          provider.handleCallback(
            new URLSearchParams({ state: "forged", id_token: "unsigned" }),
          ),
        /disabled|unavailable/,
      );
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});
