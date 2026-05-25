import type {
  ComposeQuestRequest,
  ComposeQuestResponse,
  ScenePlan,
} from "@headstrong/core";
import { moderateQuestDraft } from "@headstrong/moderation";
import { createScenePlanner } from "@headstrong/scene-planner";

export interface DemoQuestDetail {
  quest: {
    id: string;
    studentId: string;
    parentId: string;
    name: string;
    summary: string;
    moderation: ComposeQuestResponse["moderation"];
    needsEducatorReview: boolean;
  };
  currentState:
    | "draft"
    | "awaiting_approval"
    | "live"
    | "completed"
    | "rejected"
    | "deleted";
  lastUpdated: string;
  createdAt: string;
  assignedEducator: { id: string; email: string } | null;
  tasks: Array<{
    id: string;
    title: string;
    kind: "lesson" | "exercise" | "scene";
    summary: string;
    contentRef: string;
    templateId: string;
    scenePlan: ScenePlan;
    position: number;
    estimatedMinutes: number;
  }>;
}

function buildDemoQuest(
  id: string,
  request: ComposeQuestRequest,
  educatorEmail: string | null,
  needsEducatorReview: boolean,
): DemoQuestDetail {
  const planner = createScenePlanner();
  const planned = planner.plan(request);
  const moderation = moderateQuestDraft(
    `${request.profile.displayName} quest`,
    request.constraints.join(" ") || request.targets.join(" "),
  );
  const assignedEducator = educatorEmail
    ? { id: `${id}-educator`, email: educatorEmail }
    : null;

  return {
    quest: {
      id,
      studentId: request.profile.id,
      parentId: `${request.profile.id}-parent`,
      name: `${request.profile.displayName} quest`,
      summary: `Explore ${request.targets.join(", ")} with a guided ${planned.templateId} template.`,
      moderation,
      needsEducatorReview,
    },
    currentState: needsEducatorReview ? "awaiting_approval" : "live",
    lastUpdated: "2026-05-25T12:00:00.000Z",
    createdAt: "2026-05-25T10:00:00.000Z",
    assignedEducator,
    tasks: request.targets.map((target, index) => ({
      id: `${id}-task-${index + 1}`,
      title: `${target} mission`,
      kind: index === 0 ? "scene" : "lesson",
      summary: `Practice ${target} inside the ${planned.templateId} environment.`,
      contentRef: `${planned.templateId}-asset-${index + 1}`,
      templateId: planned.taskPlans[index]?.templateId ?? planned.templateId,
      scenePlan: planned.taskPlans[index]?.scenePlan ?? planned.scenePlan,
      position: index,
      estimatedMinutes: 15,
    })),
  };
}

const demoQuestMap = new Map<string, DemoQuestDetail>([
  [
    "demo-fractions",
    buildDemoQuest(
      "demo-fractions",
      {
        profile: {
          id: "11111111-1111-4111-8111-111111111111",
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
        targets: ["fractions", "comparisons"],
        constraints: [],
      },
      "mentor@headstrong.test",
      false,
    ),
  ],
  [
    "demo-writing",
    buildDemoQuest(
      "demo-writing",
      {
        profile: {
          id: "22222222-2222-4222-8222-222222222222",
          displayName: "Mina",
          interests: ["writing"],
          skillBaselines: {},
          constraints: ["dm me after class"],
          safetyPreferences: {
            enableNarration: true,
            enableCaptions: true,
            allowSocialDiscovery: false,
          },
        },
        targets: ["essay structure"],
        constraints: ["dm me after class"],
      },
      "reviewer@headstrong.test",
      true,
    ),
  ],
  [
    "demo-biology",
    buildDemoQuest(
      "demo-biology",
      {
        profile: {
          id: "33333333-3333-4333-8333-333333333333",
          displayName: "Noah",
          interests: ["biology"],
          skillBaselines: {},
          constraints: [],
          safetyPreferences: {
            enableNarration: true,
            enableCaptions: true,
            allowSocialDiscovery: false,
          },
        },
        targets: ["basic biology", "cell parts"],
        constraints: [],
      },
      null,
      false,
    ),
  ],
]);

export function getDemoQuest(id: string) {
  return demoQuestMap.get(id) ?? null;
}

export function listDemoQuests(
  role: "parent" | "educator",
  cursor?: string,
  limit = 2,
) {
  const all = [...demoQuestMap.values()].filter((quest) => {
    if (role === "parent") {
      return true;
    }

    return quest.quest.needsEducatorReview || Boolean(quest.assignedEducator);
  });
  const start = cursor ? Number(cursor.replace("demo:", "")) : 0;
  const items = all.slice(start, start + limit);
  const nextCursor =
    all.length > start + limit ? `demo:${start + limit}` : null;

  return { items, nextCursor };
}
