import { z } from "zod";

export const moderationLabelSchema = z.enum([
  "safe",
  "needs_parent_review",
  "needs_educator_review",
  "blocked",
]);

export const moderationResultSchema = z.object({
  label: moderationLabelSchema,
  reasons: z.array(z.string()),
});

export const moderationVerdictSchema = z.enum(["pass", "warn", "block"]);

export const questModerationMetadataSchema = z.object({
  labels: z.array(moderationLabelSchema),
  verdict: moderationVerdictSchema,
});

export function moderateText(input: string) {
  const lowered = input.toLowerCase();
  const reasons: string[] = [];

  if (/(self-harm|suicide|weapon)/.test(lowered)) {
    reasons.push("Contains disallowed safety-sensitive language.");
    return { label: "blocked", reasons } as const;
  }

  if (/(dm me|private chat|meet alone)/.test(lowered)) {
    reasons.push("Contains social contact language requiring adult review.");
    return { label: "needs_parent_review", reasons } as const;
  }

  return { label: "safe", reasons } as const;
}

export function moderateQuestDraft(title: string, summary: string) {
  const results = [moderateText(title), moderateText(summary)];
  const labels = [...new Set(results.map((result) => result.label))].filter(
    (label) => label !== "safe",
  );

  const verdict = results.some((result) => result.label === "blocked")
    ? "block"
    : labels.length > 0
      ? "warn"
      : "pass";

  return questModerationMetadataSchema.parse({
    labels,
    verdict,
  });
}
