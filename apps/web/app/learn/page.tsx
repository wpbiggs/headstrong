import { LearningJourneyPanel } from "../../components/learning-journey-panel";

export default function LearnPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS !== "true") {
    return (
      <main>
        <h1>Learning prototype is disabled</h1>
      </main>
    );
  }
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Local prototype · not for real learner data</p>
        <h1>Your goal, your learning journey</h1>
        <p>
          Choose an approved quest, explore, reflect, and receive educator
          feedback.
        </p>
        <p>
          Only you, the assigned educator and linked guardian can view this
          record. You can stop at any time. Satisfaction is optional and never
          affects assessment.
        </p>
      </section>
      <LearningJourneyPanel />
    </main>
  );
}
