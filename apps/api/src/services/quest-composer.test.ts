import assert from "node:assert/strict";
import test from "node:test";
import { createQuestComposer } from "@headstrong/quest-composer";

test("quest composer attaches pass moderation to safe content", async () => {
  const composer = createQuestComposer();
  const result = await composer.compose({
    profile: {
      id: crypto.randomUUID(),
      displayName: "Ari",
      interests: ["fractions"],
      skillBaselines: {},
      constraints: [],
      safetyPreferences: {
        enableNarration: true,
        enableCaptions: true,
        allowSocialDiscovery: false,
      },
    },
    targets: ["fractions"],
    constraints: [],
  });

  assert.equal(result.version, "v3");
  assert.equal(result.moderation.verdict, "pass");
  assert.equal(result.templateId, "fractions-lab");
  assert.equal(result.tasks[0]?.scenePlan.templateId, "fractions-lab-task-1");
});

test("moderation heuristics warn on social contact language", async () => {
  const composer = createQuestComposer();
  const result = await composer.compose({
    profile: {
      id: crypto.randomUUID(),
      displayName: "DM me learner",
      interests: ["messages"],
      skillBaselines: {},
      constraints: ["dm me after class"],
      safetyPreferences: {
        enableNarration: true,
        enableCaptions: true,
        allowSocialDiscovery: false,
      },
    },
    targets: ["private chat etiquette"],
    constraints: ["dm me privately"],
  });

  assert.equal(result.moderation.verdict, "warn");
  assert.ok(result.moderation.labels.includes("needs_parent_review"));
});
