import "dotenv/config";
import { createSession } from "../src/auth";
import { getDefaultDatabase } from "../src/db";
import {
  type QuestRepository,
  createQuestRepository,
} from "../src/repositories/app-repository";
import { createQuestService } from "../src/services/quest-service";

async function run() {
  if (process.env.PREVIEW_SYNTHETIC_DATA_ONLY !== "true")
    throw new Error("Explicit PREVIEW_SYNTHETIC_DATA_ONLY=true is required.");
  // Never honor an inherited AI-provider selection for synthetic fixture provisioning.
  process.env.QUEST_COMPOSER_PROVIDER = "stub";
  const { createQuestComposer } = await import("@headstrong/quest-composer");
  const client = getDefaultDatabase();
  const [configuration] =
    await client`select synthetic_only from headstrong_private.preview_configuration where singleton = true`;
  if (!configuration?.synthetic_only)
    throw new Error("Provision preview-security.sql first.");
  const result = await client.begin(async (tx) => {
    // Serialize concurrent provisioning and refuse any existing accounts/data.
    await tx`lock table users in exclusive mode`;
    if ((await tx`select id from users limit 1`).length)
      throw new Error(
        "Synthetic seed requires an empty users table. No existing data was changed.",
      );
    const persistence = createQuestRepository(tx as unknown as typeof client);
    let eventSequence = 0;
    const repo: QuestRepository = {
      ...persistence,
      async insertQuestEvent(input) {
        const event = await persistence.insertQuestEvent(input);
        // now() is fixed for this entire seed transaction. Give replayed events
        // distinct milliseconds rather than falling back to random UUID order.
        await tx`update quest_events set created_at = transaction_timestamp() + ${eventSequence++} * interval '1 millisecond' where id = ${event.id}`;
        return event;
      },
      // All service operations share this outer atomic seed transaction.
      async transaction(work) {
        return work(repo);
      },
    };
    const learner = await repo.createUser(
      "learner@headstrong.example.test",
      "student",
    );
    const parent = await repo.createUser(
      "guardian@headstrong.example.test",
      "parent",
    );
    const educator = await repo.createUser(
      "educator@headstrong.example.test",
      "educator",
    );
    const learnerSession = await createSession(
      learner.id,
      learner.email,
      learner.role,
    );
    const parentSession = await createSession(
      parent.id,
      parent.email,
      parent.role,
    );
    await repo.linkParentToStudent(parent.id, learner.id);
    const composition = await createQuestComposer().compose({
      profile: {
        id: learner.id,
        displayName: "Synthetic learner",
        interests: ["fractions"],
        skillBaselines: {},
        constraints: [],
        safetyPreferences: {
          enableNarration: false,
          enableCaptions: true,
          allowSocialDiscovery: false,
        },
      },
      targets: ["fractions"],
      constraints: [],
    });
    const service = createQuestService(repo);
    const created = await service.createDraftQuest(learnerSession, {
      studentId: learner.id,
      parentId: parent.id,
      educatorId: educator.id,
      composition,
    });
    await service.transitionQuest(
      learnerSession,
      created.quest.id,
      "submitted_for_approval",
      {},
    );
    await service.transitionQuest(
      parentSession,
      created.quest.id,
      "parent_approved",
      {},
    );
    return {
      questId: created.quest.id,
      accounts: [learner, parent, educator].map(({ id, email, role }) => ({
        id,
        email,
        role,
      })),
    };
  });
  console.log(JSON.stringify(result, null, 2));
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => getDefaultDatabase().end());
