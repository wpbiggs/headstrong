import { z } from "zod";

export const portfolioArtifactSchema = z.object({
  id: z.string().guid(),
  questId: z.string().guid(),
  kind: z.enum(["text", "image", "video", "scene", "link"]),
  url: z.string().url(),
  submittedAt: z.string().datetime(),
});
