import {
  type ComposeQuestRequest,
  type ScenePlan,
  scenePlanSchema,
} from "@headstrong/core";

export interface ScenePlanner {
  plan(request: ComposeQuestRequest): {
    templateId: string;
    scenePlan: ScenePlan;
    taskPlans: Array<{
      templateId: string;
      scenePlan: ScenePlan;
    }>;
  };
}

function buildTemplate(
  templateId: string,
  title: string,
  summary: string,
): ScenePlan {
  return scenePlanSchema.parse({
    id: `${templateId}-scene`,
    templateId,
    title,
    summary,
    timeboxMinutes: 15,
    entities: [
      {
        id: `${templateId}-guide`,
        type: "character",
        label: "Guide",
        assetRef: `${templateId}-guide-asset`,
        position: { x: 0, y: 1.5, z: -2 },
      },
      {
        id: `${templateId}-focus`,
        type: "object",
        label: "Focus Object",
        assetRef: `${templateId}-focus-asset`,
        position: { x: 0, y: 1, z: -1 },
      },
    ],
    interactions: [
      {
        id: `${templateId}-inspect`,
        type: "inspect",
        prompt: `Investigate the ${title.toLowerCase()} scene.`,
        targetEntityId: `${templateId}-focus`,
        successSignal: "inspection-complete",
      },
    ],
    assets: [
      {
        id: `${templateId}-panel`,
        kind: "text",
        uri: `${templateId}-instruction-card`,
      },
    ],
    accessibility: {
      keyboardNavigation: true,
      captions: true,
      narration: true,
      contrastMode: true,
    },
  });
}

function chooseTemplate(targets: string[]) {
  const haystack = targets.join(" ").toLowerCase();

  if (haystack.includes("fraction")) {
    return {
      templateId: "fractions-lab",
      title: "Fractions Lab",
      summary: "Manipulate fraction shards to compare and combine values.",
    };
  }

  if (haystack.includes("essay") || haystack.includes("writing")) {
    return {
      templateId: "writing-studio",
      title: "Writing Studio",
      summary: "Arrange claims, evidence, and conclusions inside a story room.",
    };
  }

  if (haystack.includes("biology")) {
    return {
      templateId: "biology-observatory",
      title: "Biology Observatory",
      summary: "Explore cell structures and habitats in a guided dome.",
    };
  }

  return {
    templateId: "curiosity-room",
    title: "Curiosity Room",
    summary: "A flexible practice room for guided quests.",
  };
}

class StubScenePlanner implements ScenePlanner {
  plan(request: ComposeQuestRequest) {
    const template = chooseTemplate(request.targets);
    const scenePlan = buildTemplate(
      template.templateId,
      template.title,
      template.summary,
    );

    return {
      templateId: template.templateId,
      scenePlan,
      taskPlans: request.targets.map((target, index) => ({
        templateId: `${template.templateId}-task-${index + 1}`,
        scenePlan: buildTemplate(
          `${template.templateId}-task-${index + 1}`,
          `${template.title} ${index + 1}`,
          `Practice ${target} in a focused scene.`,
        ),
      })),
    };
  }
}

export function createScenePlanner(): ScenePlanner {
  return new StubScenePlanner();
}
