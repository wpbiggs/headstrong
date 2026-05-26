import assert from "node:assert/strict";
import test from "node:test";
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
