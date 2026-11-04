import { AwakeningAdventure } from "../../components/awakening-adventure";
import "./learn.css";
import "./awakening.css";

export default function LearnPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS !== "true") {
    return (
      <main>
        <h1>Learning prototype is disabled</h1>
      </main>
    );
  }
  return <AwakeningAdventure />;
}
