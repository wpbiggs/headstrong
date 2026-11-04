import assert from "node:assert/strict";
import { test } from "node:test";
import { experienceSpecSchema } from "@headstrong/core";
import {
  type Island,
  awakeningExperience,
  islandReducer,
  newIsland,
} from "./awakening";
import { sampleExperience } from "./sample-experience";

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
