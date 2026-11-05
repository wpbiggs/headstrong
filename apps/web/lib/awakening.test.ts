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
  skyProjection,
} from "./awakening";
import { discoverySummary, isAwakeningRecord } from "./awakening-discovery";
import { sampleExperience } from "./sample-experience";
import { newSeedGarden, seedGardenReducer, seedTrial } from "./seedwind";
import { bedResponse, routeWater } from "./waterworks";
import { layoutWorldMarkers } from "./world-wayfinding";

test("projected landmark touch targets stay bounded and separated at phone and desktop sizes", () => {
  for (const width of [150, 358, 900]) {
    const points = layoutWorldMarkers(
      [
        { location: "workshop", x: width / 2, y: 100 },
        { location: "garden", x: width / 2, y: 100 },
        { location: "observatory", x: width / 2, y: 100 },
      ],
      width,
      340,
    );
    assert.equal(points.length, 3);
    for (const point of points) {
      assert.ok(
        (point.x * width) / 100 >= 58 && (point.x * width) / 100 <= width - 58,
      );
      assert.ok((point.y * 340) / 100 >= 28 && (point.y * 340) / 100 <= 312);
    }
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++)
        assert.ok(Math.abs(points[i].y - points[j].y) * 3.4 >= 51.9);
  }
  assert.deepEqual(
    layoutWorldMarkers(
      [
        { location: "workshop", x: Number.NaN, y: 100 },
        { location: "garden", x: -10, y: 100 },
        { location: "observatory", x: 20, y: 400 },
      ],
      358,
      340,
    ),
    [],
  );
  assert.deepEqual(layoutWorldMarkers([], 0, 340), []);
  assert.deepEqual(layoutWorldMarkers([], 358, Number.POSITIVE_INFINITY), []);
});

test("water routing conserves one cup, interacts with seeds and never becomes a care timer", () => {
  for (const gate of ["cove", "slope", "terrace", "split"] as const) {
    const flow = routeWater(gate);
    assert.equal(
      Object.values(flow).reduce((a, b) => a + b, 0),
      3,
    );
    assert.deepEqual(
      flow,
      gate === "split"
        ? { cove: 1, slope: 1, terrace: 1 }
        : {
            cove: gate === "cove" ? 3 : 0,
            slope: gate === "slope" ? 3 : 0,
            terrace: gate === "terrace" ? 3 : 0,
          },
    );
  }
  let state = newIsland();
  assert.equal(islandReducer(state, { type: "pour-water" }), state);
  state = islandReducer(state, { type: "visit", location: "garden" });
  const original = state;
  state = islandReducer(state, { type: "pour-water" });
  assert.deepEqual(state.waterworks.flow, { cove: 3, slope: 0, terrace: 0 });
  assert.deepEqual(state.garden, original.garden);
  assert.match(bedResponse(0, 3), /Ripples/);
  state = islandReducer(state, { type: "sow-seed" });
  assert.match(
    bedResponse(state.garden.beds.cove, state.waterworks.flow.cove),
    /tall golden/,
  );
  state = islandReducer(state, { type: "water-gate", gate: "split" });
  assert.deepEqual(
    state.waterworks.flow,
    { cove: 3, slope: 0, terrace: 0 },
    "gate is only a preview",
  );
  state = islandReducer(state, { type: "pour-water" });
  assert.deepEqual(state.waterworks.flow, { cove: 1, slope: 1, terrace: 1 });
  assert.match(bedResponse(1, 1), /low, wide/);
  assert.match(bedResponse(1, 0), /safe, not failing/);
  for (let i = 0; i < 30; i++)
    state = islandReducer(state, { type: "pour-water" });
  assert.equal(state.waterworks.pours.length, 4);
  assert.deepEqual(
    state.waterworks.flow,
    { cove: 1, slope: 1, terrace: 1 },
    "no accumulation",
  );
  const paused = islandReducer(state, { type: "pause" });
  assert.equal(islandReducer(paused, { type: "pour-water" }), paused);
  assert.equal(
    islandReducer(paused, { type: "water-gate", gate: "cove" }),
    paused,
  );
  const workshop = islandReducer(state, {
    type: "visit",
    location: "workshop",
  });
  assert.deepEqual(
    islandReducer(finish(workshop), { type: "retry" }).waterworks,
    state.waterworks,
  );
  assert.deepEqual(islandReducer(state, { type: "reset" }), newIsland());
});

test("trail preserves unfinished flights, scopes experiments and never gates the observatory", () => {
  let state = islandReducer(newIsland(), { type: "launch" });
  state = islandReducer(state, { type: "tick" });
  const flight = state.flight;
  state = islandReducer(state, { type: "visit", location: "observatory" });
  assert.equal(state.restored, false);
  assert.equal(islandReducer(state, { type: "tick" }), state);
  assert.equal(islandReducer(state, { type: "steer", lane: 1 }), state);
  assert.equal(islandReducer(state, { type: "sow-seed" }), state);
  state = islandReducer(state, { type: "lens", lens: "close" });
  assert.equal(skyProjection(state.sky)[0][0], -3.2);
  state = islandReducer(state, {
    type: "constellation",
    constellation: "kite",
  });
  assert.deepEqual(skyProjection(state.sky)[0], [0, 3.2]);
  state = islandReducer(state, { type: "pause" });
  assert.equal(
    islandReducer(state, { type: "visit", location: "garden" }),
    state,
  );
  assert.equal(islandReducer(state, { type: "lens", lens: "wide" }), state);
  state = islandReducer(state, { type: "resume" });
  state = islandReducer(state, { type: "visit", location: "garden" });
  state = islandReducer(state, { type: "sow-seed" });
  assert.equal(state.garden.trials.length, 1);
  assert.deepEqual(state.flight, flight);
  state = islandReducer(state, { type: "visit", location: "workshop" });
  assert.equal(
    islandReducer(state, { type: "tick" }).flight.ticks,
    flight.ticks + 1,
  );
  assert.deepEqual(islandReducer(state, { type: "reset" }), newIsland());
});

test("seed shape and wind independently change dispersal, every bed can grow without a flight", () => {
  assert.deepEqual(seedTrial("round", "shelter"), {
    shape: "round",
    breeze: "shelter",
    distance: 2,
    bed: "cove",
  });
  assert.equal(seedTrial("round", "ridge").distance, 5);
  assert.equal(seedTrial("feathered", "shelter").distance, 6);
  assert.equal(seedTrial("feathered", "ridge").distance, 14);
  let island = newIsland();
  island = islandReducer(island, { type: "visit", location: "garden" });
  island = islandReducer(island, { type: "sow-seed" });
  assert.equal(island.garden.beds.cove, 1);
  island = islandReducer(island, { type: "seed-shape", shape: "feathered" });
  island = islandReducer(island, { type: "sow-seed" });
  assert.equal(island.garden.beds.slope, 1);
  island = islandReducer(island, { type: "seed-breeze", breeze: "ridge" });
  island = islandReducer(island, { type: "sow-seed" });
  assert.equal(island.garden.beds.terrace, 1);
  assert.equal(island.restored, false);
  assert.equal(island.flight.phase, "ready");
  assert.deepEqual(island.attempts, []);
});

test("seed garden is bounded, paused atomically, persistent across flight retries and cleared by reset", () => {
  let garden = newSeedGarden();
  for (let i = 0; i < 100; i++)
    garden = seedGardenReducer(garden, { type: "sow-seed" });
  assert.equal(garden.beds.cove, 3);
  assert.equal(garden.trials.length, 4);
  const paused = { ...newIsland(), garden, paused: true };
  for (const action of [
    { type: "seed-shape", shape: "feathered" },
    { type: "seed-breeze", breeze: "ridge" },
    { type: "sow-seed" },
  ] as const)
    assert.equal(islandReducer(paused, action), paused);
  const flown = finish({ ...paused, paused: false });
  assert.deepEqual(islandReducer(flown, { type: "retry" }).garden, garden);
  assert.deepEqual(
    islandReducer(paused, { type: "reset" }).garden,
    newSeedGarden(),
  );
});

test("garden sharing is separate opt-in, excludes unselected notes/flights and fits evidence bounds", () => {
  const seeds = Array.from({ length: 4 }, () =>
    seedTrial("feathered", "ridge"),
  );
  assert.equal(
    discoverySummary([], "private note", false, false, seeds, false),
    "",
  );
  const chosen = discoverySummary(
    finish(newIsland()).attempts,
    "private note",
    false,
    false,
    seeds,
    true,
  );
  assert.match(chosen, /Selected seed releases/);
  assert.match(chosen, /14 m · terrace bed/);
  assert.doesNotMatch(chosen, /private note|Selected flights/);
  const maximal = discoverySummary(
    Array(6).fill(finish(newIsland()).attempts[0]),
    "x".repeat(500),
    true,
    true,
    seeds,
    true,
  );
  assert.equal(
    learningEvidenceInputSchema.safeParse({
      reflection: maximal,
      observedEntityIds: ["workshop"],
    }).success,
    true,
  );
});

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
