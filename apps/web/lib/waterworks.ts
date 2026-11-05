import type { GardenBed } from "./seedwind";

// A routing toy, not hydrology, plant care advice, or a mastery signal.
// Every pour replaces the previous cup: no hidden clock, depletion or decay.
export type WaterGate = GardenBed | "split";
export type WaterFlow = Record<GardenBed, number>;
export type Waterworks = {
  gate: WaterGate;
  flow: WaterFlow;
  pours: WaterGate[];
};
export type WaterAction =
  | { type: "water-gate"; gate: WaterGate }
  | { type: "pour-water" };

export const newWaterworks = (): Waterworks => ({
  gate: "cove",
  flow: { cove: 0, slope: 0, terrace: 0 },
  pours: [],
});
export function routeWater(gate: WaterGate): WaterFlow {
  return gate === "split"
    ? { cove: 1, slope: 1, terrace: 1 }
    : {
        cove: gate === "cove" ? 3 : 0,
        slope: gate === "slope" ? 3 : 0,
        terrace: gate === "terrace" ? 3 : 0,
      };
}
export function waterworksReducer(
  state: Waterworks,
  action: WaterAction,
): Waterworks {
  return action.type === "water-gate"
    ? { ...state, gate: action.gate }
    : {
        ...state,
        flow: routeWater(state.gate),
        pours: [...state.pours.slice(-3), state.gate],
      };
}
export function bedResponse(seeds: number, drops: number): string {
  if (!seeds)
    return drops
      ? "Ripples cross the empty soil; no seed is needed to try a channel."
      : "An empty, quiet bed.";
  return drops === 3
    ? "The focused stream lifts tall golden blossoms."
    : drops === 1
      ? "A shared trickle opens low, wide leaves."
      : "The seedlings rest with folded leaves; they are safe, not failing.";
}
