import { randomUUID } from "node:crypto";
import {
  type ComposeQuestRequest,
  type ComposeQuestResponse,
  composeQuestResponseSchema,
  readEnv,
} from "@headstrong/core";
import { moderateQuestDraft } from "@headstrong/moderation";
import { createScenePlanner } from "@headstrong/scene-planner";
import { z } from "zod";

const env = readEnv(
  {
    QUEST_COMPOSER_PROVIDER: z.enum(["stub", "ai"]).default("stub"),
    QUEST_COMPOSER_MODEL: z
      .string()
      .min(1)
      .default("headstrong-quest-composer"),
  },
  process.env,
);

export interface QuestComposer {
  compose(request: ComposeQuestRequest): Promise<ComposeQuestResponse>;
}

class StubQuestComposer implements QuestComposer {
  async compose(request: ComposeQuestRequest) {
    const scenePlanner = createScenePlanner();
    const plannedScenes = scenePlanner.plan(request);
    const tasks = request.targets.map((target, index) => ({
      title: `${target} challenge ${index + 1}`,
      kind: index === 0 ? "lesson" : index % 2 === 0 ? "scene" : "exercise",
      summary: `Guide ${request.profile.displayName} through ${target} using ${request.profile.interests[0] || "guided practice"}.`,
      contentRef: `asset-${index + 1}`,
      templateId:
        plannedScenes.taskPlans[index]?.templateId ?? plannedScenes.templateId,
      scenePlan:
        plannedScenes.taskPlans[index]?.scenePlan ?? plannedScenes.scenePlan,
      estimatedMinutes: 15,
    }));

    const draft = {
      version: "v3",
      state: "preview-only",
      title: `${request.profile.displayName} quest`,
      summary: `A guided plan covering ${request.targets.join(", ")} with ${request.constraints.length} active constraints.`,
      templateId: plannedScenes.templateId,
      scenePlan: plannedScenes.scenePlan,
      highLevelPlan: request.targets.map(
        (target, index) => `Step ${index + 1}: build confidence in ${target}.`,
      ),
      tasks,
      contentReferences: tasks.map((task) => ({
        id: `${task.contentRef}-${randomUUID()}`,
        title: task.title,
        kind: task.kind === "scene" ? "scene" : "lesson",
      })),
      estimatedMinutes: tasks.reduce(
        (total, task) => total + task.estimatedMinutes,
        0,
      ),
      requiredApprovals: ["parent"],
    };

    const response = {
      ...draft,
      moderation: moderateQuestDraft(draft.title, draft.summary),
    };

    return composeQuestResponseSchema.parse(response);
  }
}

class AiQuestComposer implements QuestComposer {
  async compose(request: ComposeQuestRequest) {
    const { createChatCompletion } = await import("@headstrong/ai-gateway");
    const completion = await createChatCompletion({
      model: env.QUEST_COMPOSER_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Return only JSON matching the Headstrong compose quest contract version v3.",
        },
        {
          role: "user",
          content: JSON.stringify(request),
        },
      ],
    });

    const rawContent = completion.choices?.[0]?.message?.content;

    if (typeof rawContent !== "string") {
      throw new Error("Quest composer AI response was empty.");
    }

    const parsed = composeQuestResponseSchema.parse(JSON.parse(rawContent));

    return composeQuestResponseSchema.parse({
      ...parsed,
      version: "v3",
      moderation: moderateQuestDraft(parsed.title, parsed.summary),
    });
  }
}

export function createQuestComposer(): QuestComposer {
  return env.QUEST_COMPOSER_PROVIDER === "ai"
    ? new AiQuestComposer()
    : new StubQuestComposer();
}
