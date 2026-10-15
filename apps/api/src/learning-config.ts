import { z } from "zod";

export const learningConfigSchema = z
  .object({
    ENABLE_LEARNING_JOURNEYS: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    API_HOST: z.string().default("127.0.0.1"),
    NODE_ENV: z.string().optional(),
  })
  .superRefine((config, context) => {
    if (
      config.ENABLE_LEARNING_JOURNEYS &&
      (config.NODE_ENV === "production" ||
        !["127.0.0.1", "::1", "localhost"].includes(config.API_HOST))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Learning journeys are a loopback-only, non-production prototype.",
      });
    }
  });

export function learningJourneysEnabled() {
  return learningConfigSchema.parse(process.env).ENABLE_LEARNING_JOURNEYS;
}
