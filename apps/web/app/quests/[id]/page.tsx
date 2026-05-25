import { SceneRunner } from "../../../components/scene-runner";
import { getDemoQuest } from "../../../lib/demo-quests";
import { fetchQuestDetailLive } from "../../../lib/live-api";

export default async function QuestPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: {
    email?: string;
    role?: "parent" | "educator" | "admin";
  };
}) {
  const quest =
    searchParams.email && searchParams.role
      ? await fetchQuestDetailLive({
          questId: params.id,
          email: searchParams.email,
          role: searchParams.role,
        }).catch(() => null)
      : getDemoQuest(params.id);

  if (!quest) {
    return (
      <main>
        <section className="card">
          <h1>Quest not found</h1>
          <p>
            Use a demo quest id like `demo-fractions` or provide a live quest
            id.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Quest Experience</p>
        <h1>{quest.quest.name}</h1>
        <p>{quest.quest.summary}</p>
        <div
          className="status"
          data-unsupported={quest.quest.needsEducatorReview}
        >
          <span>
            Moderation: {quest.quest.moderation.verdict}
            {quest.quest.needsEducatorReview
              ? " | educator review required"
              : ""}
          </span>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <p className="eyebrow">Scene Template</p>
          <h2>{quest.tasks[0]?.templateId ?? "No template"}</h2>
          <p>
            Accessibility: captions, narration, keyboard navigation, high
            contrast.
          </p>
        </article>

        <article className="card">
          <p className="eyebrow">Moderation Hints</p>
          <h2>Safety context</h2>
          <p>Labels: {quest.quest.moderation.labels.join(", ") || "none"}</p>
        </article>
      </section>

      {quest.tasks[0] ? (
        <SceneRunner scenePlan={quest.tasks[0].scenePlan} />
      ) : null}
    </main>
  );
}
