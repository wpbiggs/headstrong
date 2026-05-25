import {
  composeQuestRequestSchema,
  createQuestRequestSchema,
  listQuestsRequestSchema,
  questTransitionRequestSchema,
} from "@headstrong/core";
import { createQuestComposer } from "@headstrong/quest-composer";
import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import type { AppVariables } from "../lib/context";
import { requireAuth, requireParentOf, requireRole } from "../middleware/auth";
import {
  QuestQueryServiceError,
  createQuestQueryService,
} from "../services/quest-query-service";
import {
  QuestServiceError,
  createQuestService,
} from "../services/quest-service";

const questComposer = createQuestComposer();
const questQueryService = createQuestQueryService();
const questService = createQuestService();

function handleQuestServiceError(
  error: unknown,
  context: Context<{ Variables: AppVariables }>,
) {
  if (error instanceof QuestServiceError) {
    return context.json({ error: error.message }, error.status as never);
  }

  throw error;
}

function handleQuestQueryServiceError(
  error: unknown,
  context: Context<{ Variables: AppVariables }>,
) {
  if (error instanceof QuestQueryServiceError) {
    return context.json({ error: error.message }, error.status as never);
  }

  throw error;
}

export const questRoutes: Hono<{ Variables: AppVariables }> = new Hono<{
  Variables: AppVariables;
}>()
  .get(
    "/",
    requireAuth,
    zValidator("query", listQuestsRequestSchema),
    async (c) => {
      try {
        return c.json(
          await questQueryService.listQuests(
            c.get("user"),
            c.req.valid("query"),
          ),
        );
      } catch (error) {
        return handleQuestQueryServiceError(error, c);
      }
    },
  )
  .post(
    "/compose",
    requireAuth,
    requireRole("student", "parent", "admin"),
    zValidator("json", composeQuestRequestSchema),
    requireParentOf(
      (c) =>
        (
          c.req.valid("json" as never) as {
            profile: { id: string };
          }
        ).profile.id,
    ),
    async (c) => {
      const composition = await questComposer.compose(c.req.valid("json"));
      return c.json(composition);
    },
  )
  .post(
    "/",
    requireAuth,
    requireRole("student", "parent", "admin"),
    zValidator("json", createQuestRequestSchema),
    requireParentOf(
      (c) =>
        (
          c.req.valid("json" as never) as {
            studentId: string;
          }
        ).studentId,
    ),
    async (c) => {
      try {
        const result = await questService.createDraftQuest(
          c.get("user"),
          c.req.valid("json"),
        );
        return c.json(result, 201);
      } catch (error) {
        return handleQuestServiceError(error, c);
      }
    },
  )
  .post(
    "/:questId/submit",
    requireAuth,
    requireRole("student", "parent", "admin"),
    zValidator("json", questTransitionRequestSchema),
    async (c) => {
      try {
        return c.json(
          await questService.transitionQuest(
            c.get("user"),
            c.req.param("questId"),
            "submitted_for_approval",
            c.req.valid("json"),
          ),
        );
      } catch (error) {
        return handleQuestServiceError(error, c);
      }
    },
  )
  .post(
    "/:questId/approve-parent",
    requireAuth,
    requireRole("parent", "admin"),
    zValidator("json", questTransitionRequestSchema),
    async (c) => {
      try {
        return c.json(
          await questService.transitionQuest(
            c.get("user"),
            c.req.param("questId"),
            "parent_approved",
            c.req.valid("json"),
          ),
        );
      } catch (error) {
        return handleQuestServiceError(error, c);
      }
    },
  )
  .post(
    "/:questId/intervene",
    requireAuth,
    requireRole("educator", "admin"),
    zValidator("json", questTransitionRequestSchema),
    async (c) => {
      try {
        return c.json(
          await questService.transitionQuest(
            c.get("user"),
            c.req.param("questId"),
            "educator_intervened",
            c.req.valid("json"),
          ),
        );
      } catch (error) {
        return handleQuestServiceError(error, c);
      }
    },
  )
  .post(
    "/:questId/review",
    requireAuth,
    requireRole("educator", "admin"),
    zValidator("json", questTransitionRequestSchema),
    async (c) => {
      try {
        return c.json(
          await questService.reviewQuest(
            c.get("user"),
            c.req.param("questId"),
            c.req.valid("json"),
          ),
        );
      } catch (error) {
        return handleQuestServiceError(error, c);
      }
    },
  )
  .post(
    "/:questId/complete",
    requireAuth,
    requireRole("student", "educator", "admin"),
    zValidator("json", questTransitionRequestSchema),
    async (c) => {
      try {
        return c.json(
          await questService.transitionQuest(
            c.get("user"),
            c.req.param("questId"),
            "completed",
            c.req.valid("json"),
          ),
        );
      } catch (error) {
        return handleQuestServiceError(error, c);
      }
    },
  )
  .get("/:questId", requireAuth, async (c) => {
    try {
      return c.json(
        await questQueryService.getQuest(c.get("user"), c.req.param("questId")),
      );
    } catch (error) {
      return handleQuestQueryServiceError(error, c);
    }
  })
  .get(
    "/:questId/audit",
    requireAuth,
    requireRole("parent", "educator", "admin"),
    async (c) => {
      try {
        return c.json(
          await questService.getQuestAudit(
            c.get("user"),
            c.req.param("questId"),
          ),
        );
      } catch (error) {
        return handleQuestServiceError(error, c);
      }
    },
  );
