import assert from "node:assert/strict";
import test from "node:test";
import {
  learningGoalInputSchema,
  learningSatisfactionInputSchema,
} from "@headstrong/core";
import { learningConfigSchema } from "../learning-config";

test("learning flags fail closed and prohibit remote/production enablement", () => {
  assert.equal(learningConfigSchema.parse({}).ENABLE_LEARNING_JOURNEYS, false);
  assert.equal(
    learningConfigSchema.parse({ ENABLE_LEARNING_JOURNEYS: "false" })
      .ENABLE_LEARNING_JOURNEYS,
    false,
  );
  assert.equal(
    learningConfigSchema.parse({ ENABLE_LEARNING_JOURNEYS: "true" })
      .ENABLE_LEARNING_JOURNEYS,
    true,
  );
  for (const value of ["yes", "0", "FALSE", ""]) {
    assert.equal(
      learningConfigSchema.safeParse({ ENABLE_LEARNING_JOURNEYS: value })
        .success,
      false,
    );
  }
  for (const override of [
    { API_HOST: "0.0.0.0" },
    { NODE_ENV: "production" },
  ]) {
    assert.equal(
      learningConfigSchema.safeParse({
        ENABLE_LEARNING_JOURNEYS: "true",
        ...override,
      }).success,
      false,
    );
  }
});

test("learning contracts bound private input and satisfaction scale", () => {
  assert.equal(
    learningGoalInputSchema.safeParse({ objective: "   " }).success,
    false,
  );
  assert.equal(
    learningGoalInputSchema.safeParse({ objective: "a".repeat(501) }).success,
    false,
  );
  for (const value of [0, 6, 1.5, "5"]) {
    assert.equal(
      learningSatisfactionInputSchema.safeParse({
        enjoyment: value,
        agency: 3,
        challenge: 3,
      }).success,
      false,
    );
  }
});
