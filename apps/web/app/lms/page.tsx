import { OperatorPanel } from "../../components/operator-panel";

export default function LmsPage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">LMS Operator</p>
        <h1>
          Publish quests to Moodle and ingest completion into mastery signals.
        </h1>
      </section>
      <section className="grid">
        <OperatorPanel
          title="Publish quest"
          description="Minimal quest to Moodle activity mapping."
          submitLabel="Publish to Moodle"
          mode="lmsPublish"
          fields={[
            { name: "email", placeholder: "educator email" },
            { name: "questId", placeholder: "quest uuid" },
          ]}
        />
        <OperatorPanel
          title="Record completion"
          description="Feed Moodle completion back into mastery signals."
          submitLabel="Record completion"
          mode="lmsCompletion"
          fields={[
            { name: "email", placeholder: "educator email" },
            { name: "questId", placeholder: "quest uuid" },
            { name: "learnerId", placeholder: "learner uuid" },
            {
              name: "assignmentExternalId",
              placeholder: "quest:task external id",
            },
            { name: "score", placeholder: "0.8" },
            {
              name: "completedAt",
              placeholder: new Date().toISOString(),
              defaultValue: new Date().toISOString(),
            },
            { name: "skillId", placeholder: "skill uuid" },
          ]}
        />
      </section>
    </main>
  );
}
