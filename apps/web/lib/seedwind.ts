// A bounded toy dispersal model for play, not a botany or mastery assessment.
export type SeedShape = "round" | "feathered";
export type SeedBreeze = "shelter" | "ridge";
export type GardenBed = "cove" | "slope" | "terrace";
export type SeedTrial = {
  shape: SeedShape;
  breeze: SeedBreeze;
  distance: number;
  bed: GardenBed;
};
export type SeedGarden = {
  shape: SeedShape;
  breeze: SeedBreeze;
  trials: SeedTrial[];
  beds: Record<GardenBed, number>;
};
export type SeedAction =
  | { type: "seed-shape"; shape: SeedShape }
  | { type: "seed-breeze"; breeze: SeedBreeze }
  | { type: "sow-seed" };

export const newSeedGarden = (): SeedGarden => ({
  shape: "round",
  breeze: "shelter",
  trials: [],
  beds: { cove: 0, slope: 0, terrace: 0 },
});

export function seedTrial(shape: SeedShape, breeze: SeedBreeze): SeedTrial {
  const distance =
    shape === "round"
      ? breeze === "shelter"
        ? 2
        : 5
      : breeze === "shelter"
        ? 6
        : 14;
  return {
    shape,
    breeze,
    distance,
    bed: distance <= 3 ? "cove" : distance <= 8 ? "slope" : "terrace",
  };
}

export function seedGardenReducer(
  garden: SeedGarden,
  action: SeedAction,
): SeedGarden {
  if (action.type === "seed-shape") return { ...garden, shape: action.shape };
  if (action.type === "seed-breeze")
    return { ...garden, breeze: action.breeze };
  const trial = seedTrial(garden.shape, garden.breeze);
  return {
    ...garden,
    trials: [...garden.trials.slice(-3), trial],
    beds: {
      ...garden.beds,
      [trial.bed]: Math.min(3, garden.beds[trial.bed] + 1),
    },
  };
}
