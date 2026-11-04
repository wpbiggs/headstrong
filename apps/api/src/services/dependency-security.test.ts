import assert from "node:assert/strict";
import test from "node:test";
import {
  computeInferencePayloadSchema,
  computeJobListRequestSchema,
  createCampaignRequestSchema,
  experienceSpecSchema,
  learningEvidenceInputSchema,
  learningGoalInputSchema,
  learningSatisfactionInputSchema,
  ledgerEntrySchema,
  listCampaignsRequestSchema,
  providerRunSchema,
  scenePlanSchema,
  selectLearningQuestSchema,
  sessionSchema,
} from "@headstrong/core";

// Zod 3 accepted the 8-4-4-4-12 hex shape, without RFC version/variant checks.
// Use guid() in Zod 4 so existing persisted IDs and bearer claims remain valid.
test("Zod migration preserves legacy ID shape without admitting malformed IDs", () => {
  const schemas = [
    sessionSchema.shape.sub,
    sessionSchema.shape.sessionId,
    selectLearningQuestSchema.shape.questId,
    experienceSpecSchema.shape.questId,
    experienceSpecSchema.shape.taskId,
    createCampaignRequestSchema.shape.educatorUserId,
    listCampaignsRequestSchema.shape.educatorUserId.unwrap(),
    providerRunSchema.shape.id,
    providerRunSchema.shape.jobId,
  ];
  for (const schema of schemas) {
    for (const id of [
      "12345678-abcd-0000-0000-123456789abc",
      "12345678-ABCD-FFFF-FFFF-123456789ABC",
      "00000000-0000-0000-0000-000000000000",
      "12345678-abcd-4abc-8abc-123456789abc",
    ]) {
      assert.equal(schema.parse(id), id);
    }
    for (const id of [
      "",
      "not-an-id",
      "g2345678-abcd-0000-0000-123456789abc",
      null,
      42,
    ]) {
      assert.equal(schema.safeParse(id).success, false);
    }
  }
});

test("Zod migration preserves defaults, trimming, stripping and invalid input bounds", () => {
  assert.deepEqual(
    learningGoalInputSchema.parse({
      objective: "  Explore light  ",
      role: "admin",
    }),
    {
      objective: "Explore light",
    },
  );
  assert.deepEqual(
    computeInferencePayloadSchema.parse({ model: "fixture", prompt: "test" }),
    {
      model: "fixture",
      prompt: "test",
      maxTokens: 256,
      aggregateOnly: true,
    },
  );
  assert.deepEqual(computeJobListRequestSchema.parse({ limit: "3" }), {
    limit: 3,
  });
  assert.deepEqual(computeJobListRequestSchema.parse({}), { limit: 20 });
  assert.deepEqual(
    ledgerEntrySchema.parse({
      accountCode: "fixture",
      direction: "debit",
      amount: 1,
      currency: "USD",
    }).metadata,
    {},
  );
  for (const input of [
    undefined,
    null,
    {},
    { objective: "    " },
    { objective: "x".repeat(501) },
  ]) {
    assert.equal(learningGoalInputSchema.safeParse(input).success, false);
  }
  for (const enjoyment of [0, 6, 1.5, "3", null]) {
    assert.equal(
      learningSatisfactionInputSchema.safeParse({
        enjoyment,
        agency: 3,
        challenge: 3,
      }).success,
      false,
    );
  }
  for (const limit of [0, 31, "invalid"]) {
    assert.equal(
      computeJobListRequestSchema.safeParse({ limit }).success,
      false,
    );
  }
  for (const role of ["owner", "Student", "", undefined]) {
    assert.equal(
      sessionSchema.safeParse({
        sub: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        email: "fixture@example.test",
        role,
      }).success,
      false,
    );
  }
});

test("oversized constrained collections fail before validating their elements", () => {
  // The advisory fix must do real work, not just change the audited version.
  // A throwing element proves that oversized input is not traversed or expanded
  // into one issue per element. No huge allocation or timing threshold needed.
  for (const schema of [
    learningEvidenceInputSchema.shape.observedEntityIds,
    scenePlanSchema.shape.entities,
    scenePlanSchema.shape.interactions,
    scenePlanSchema.shape.assets,
  ]) {
    const input = new Array(100_000);
    Object.defineProperty(input, 0, {
      get() {
        throw new Error("oversized collection traversed");
      },
    });
    const result = schema.safeParse(input);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.issues.length, 1);
      assert.equal(result.error.issues[0]?.code, "too_big");
    }
  }
  assert.equal(
    learningEvidenceInputSchema.safeParse({
      reflection: "A valid reflection.",
      observedEntityIds: [""],
    }).success,
    false,
  );
  assert.equal(
    learningEvidenceInputSchema.safeParse({
      reflection: "A valid reflection.",
      observedEntityIds: ["block-1"],
    }).success,
    true,
  );
});
