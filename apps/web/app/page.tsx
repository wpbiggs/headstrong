import { XrCapabilityCard } from "../components/xr-capability-card";
import { env } from "../env";

const roles = ["student", "parent", "educator", "expert", "admin"];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Headstrong + FibonaccNet</p>
        <h1>
          Safety-first learning quests, with XR and distributed compute in view.
        </h1>
        <p>
          This scaffold establishes shared contracts, strict environment
          loading, auth roles, and a browser-ready XR capability check for the
          next phases.
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <p className="eyebrow">Auth Baseline</p>
          <h2>Role-aware foundation</h2>
          <ul>
            {roles.map((role) => (
              <li key={role}>{role}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <p className="eyebrow">Shared Contracts</p>
          <h2>Type-safe domain layer</h2>
          <p>
            Student, parent, educator, quest, lesson, and portfolio artifact
            schemas live in `packages/core` and are reused by both apps.
          </p>
        </article>

        <article className="card">
          <p className="eyebrow">Runtime Env</p>
          <h2>Fail-fast configuration</h2>
          <p>Web app URL: {env.NEXT_PUBLIC_APP_URL}</p>
          <p>API base URL: {env.NEXT_PUBLIC_API_URL}</p>
        </article>

        <XrCapabilityCard />

        <article className="card">
          <p className="eyebrow">Phase 2</p>
          <h2>Try the quest loop</h2>
          <p>
            <a href="/quests/demo-fractions">Open demo quest</a>
          </p>
          <p>
            <a href="/parent">Parent dashboard</a>
          </p>
          <p>
            <a href="/educator">Educator dashboard</a>
          </p>
          <p>
            <a href="/feed">Internal feed</a>
          </p>
          <p>
            <a href="/parent-approvals">Parent approvals</a>
          </p>
          <p>
            <a href="/moderation">Moderation queue</a>
          </p>
        </article>
      </section>
    </main>
  );
}
