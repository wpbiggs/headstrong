import assert from "node:assert/strict";
import { test } from "node:test";
import { experienceSpecSchema } from "@headstrong/core";
import {
  learningEvidenceInputSchema,
  learningJourneyDetailSchema,
} from "@headstrong/core";
import {
  type Island,
  awakeningExperience,
  islandReducer,
  newIsland,
} from "./awakening";
import { discoverySummary, isAwakeningRecord } from "./awakening-discovery";
import { sampleExperience } from "./sample-experience";

test("discovery selection is explicit, bounded and not an assessment", () => {
  const attempts = finish(newIsland()).attempts;
  assert.equal(
    discoverySummary(attempts, "private unsent note", false, false),
    "",
  );
  const flights = discoverySummary(
    attempts,
    "private unsent note",
    true,
    false,
  );
  assert.match(flights, /70 m/);
  assert.match(flights, /not proof of mastery/);
  assert.doesNotMatch(flights, /private unsent note/);
  const note = discoverySummary(attempts, "I noticed the wind.", false, true);
  assert.doesNotMatch(note, /Selected flights/);
  assert.match(note, /I noticed the wind/);
  assert.equal(discoverySummary([], "   ", true, true), "");
  const maximal = discoverySummary(
    Array(6).fill(attempts[0]),
    "x".repeat(500),
    true,
    true,
  );
  assert.ok(
    learningEvidenceInputSchema.safeParse({
      reflection: maximal,
      observedEntityIds: ["workshop"],
    }).success,
  );
});

test("discovery bridge requires the exact current curated scene and quest binding", () => {
  const detail = learningJourneyDetailSchema.parse({
    journey: {
      id: awakeningExperience.taskId,
      learnerId: awakeningExperience.questId,
      objective: awakeningExperience.objective,
      questId: awakeningExperience.questId,
      createdAt: "2026-11-04T00:00:00Z",
      evidence: null,
      feedback: null,
      satisfaction: null,
    },
    experience: awakeningExperience,
  });
  assert.equal(isAwakeningRecord(detail), true);
  assert.equal(isAwakeningRecord({ ...detail, experience: null }), false);
  assert.equal(
    isAwakeningRecord({ ...detail, experience: sampleExperience }),
    false,
  );
  assert.equal(
    isAwakeningRecord({
      ...detail,
      experience: {
        ...awakeningExperience,
        scene: {
          ...awakeningExperience.scene,
          summary: "Changed content needs review",
        },
      },
    }),
    false,
  );
  assert.equal(
    isAwakeningRecord({
      ...detail,
      journey: { ...detail.journey, questId: null },
    }),
    false,
  );
});

function finish(state: Island) {
  let next = islandReducer(state, { type: "launch" });
  for (let i = 0; i < 110; i++) next = islandReducer(next, { type: "tick" });
  return next;
}

test("v1 curated and inherited sample contracts remain compatible; invalid input rejected", () => {
  assert.equal(
    experienceSpecSchema.safeParse(awakeningExperience).success,
    true,
  );
  assert.equal(experienceSpecSchema.safeParse(sampleExperience).success, true);
  assert.equal(
    experienceSpecSchema.safeParse({ ...awakeningExperience, version: "v2" })
      .success,
    false,
  );
  assert.equal(
    experienceSpecSchema.safeParse({
      ...awakeningExperience,
      scene: { ...awakeningExperience.scene, entities: [] },
    }).success,
    false,
  );
  assert.deepEqual(awakeningExperience.scene.assets, []);
});

test("two reproducible experiments have different visible consequences; either wing can work", () => {
  const wide = finish(newIsland());
  const sweptShelter = finish(
    islandReducer(newIsland(), { type: "wing", wing: "swept" }),
  );
  const sweptRidge = finish(
    islandReducer(islandReducer(newIsland(), { type: "wing", wing: "swept" }), {
      type: "steer",
      lane: 1,
    }),
  );
  assert.equal(wide.restored, true);
  assert.equal(wide.flight.distance, 70);
  assert.equal(sweptShelter.restored, false);
  assert.equal(Math.round(sweptShelter.flight.distance), 35);
  assert.equal(sweptRidge.restored, true);
  assert.deepEqual(finish(newIsland()), wide);
  assert.equal(wide.flight.phase, "landed");
  assert.deepEqual(islandReducer(wide, { type: "tick" }), wide);
});

test("steering changes flight outcome, mid-flight wing changes cannot bypass experiment", () => {
  let flight = islandReducer(newIsland(), { type: "launch" });
  assert.deepEqual(
    islandReducer(flight, { type: "wing", wing: "swept" }),
    flight,
  );
  flight = islandReducer(flight, { type: "steer", lane: 1 });
  for (let i = 0; i < 100; i++)
    flight = islandReducer(flight, { type: "tick" });
  assert.equal(flight.restored, false);
});

test("pause freezes controls/ticks; retry retains world, reset clears every session fact; history bounded", () => {
  let state = islandReducer(islandReducer(newIsland(), { type: "launch" }), {
    type: "pause",
  });
  for (const action of [
    { type: "tick" },
    { type: "launch" },
    { type: "steer", lane: 1 },
  ] as const)
    assert.deepEqual(islandReducer(state, action), state);
  state = finish(islandReducer(state, { type: "resume" }));
  for (let i = 0; i < 10; i++)
    state = finish(islandReducer(state, { type: "retry" }));
  assert.equal(state.attempts.length, 6);
  assert.equal(islandReducer(state, { type: "retry" }).restored, true);
  assert.deepEqual(
    islandReducer(
      { ...state, paused: true, wind: true, creature: true },
      { type: "reset" },
    ),
    newIsland(),
  );
});
