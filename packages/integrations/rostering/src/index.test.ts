import assert from "node:assert/strict";
import test from "node:test";
import {
  createClassLinkRosterConnector,
  createCleverRosterConnector,
} from "./index";

test("clever roster connector returns disabled or stubbed shape", async () => {
  const connector = createCleverRosterConnector();
  const result = await connector.syncDistrictRoster("district-1");
  assert.equal(result.provider, "clever");
  assert.equal(
    result.status,
    process.env.ENABLE_CLEVER_ROSTERING === "true" ? "stubbed" : "disabled",
  );
});

test("classlink roster connector returns disabled or stubbed shape", async () => {
  const connector = createClassLinkRosterConnector();
  const result = await connector.syncEnrollments();
  assert.equal(result.provider, "classlink");
  assert.equal(
    result.status,
    process.env.ENABLE_CLASSLINK_ROSTERING === "true" ? "stubbed" : "disabled",
  );
});
