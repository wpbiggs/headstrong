import { LearningStudio } from "../../components/learning-studio";
import "./learn.css";

export default function LearnPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS !== "true") {
    return (
      <main>
        <h1>Learning prototype is disabled</h1>
      </main>
    );
  }
  return <LearningStudio />;
}
