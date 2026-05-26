import assert from "node:assert/strict";
import test from "node:test";
import { createOpenBadgesIssuer } from "./index";

test("open badges issuer gating is enforced", async () => {
  const issuer = createOpenBadgesIssuer();
  await assert.rejects(() =>
    issuer.issueAssertion({
      recipientEmail: "learner@example.com",
      badgeUrl: "https://badges.example.com/badge/1",
      assertionUrl: "https://badges.example.com/assertion/1",
    }),
  );
});
