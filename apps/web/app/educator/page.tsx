import Link from "next/link";
import type { DemoQuestDetail } from "../../lib/demo-quests";
import { listDemoQuests } from "../../lib/demo-quests";
import { fetchQuestListLive } from "../../lib/live-api";

export default async function EducatorDashboardPage({
  searchParams,
}: {
  searchParams: {
    cursor?: string;
    state?: string;
    email?: string;
  };
}) {
  const data = searchParams.email
    ? await fetchQuestListLive({
        email: searchParams.email,
        role: "educator",
        cursor: searchParams.cursor,
        state: searchParams.state,
        limit: 2,
      }).catch(() => null)
    : listDemoQuests("educator", searchParams.cursor, 2);

  const items = (data?.items ?? []) as DemoQuestDetail[];

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Educator Inbox</p>
        <h1>Warned quests and assigned quests in one place.</h1>
        <p>
          Append `?email=reviewer@example.com` to switch from demo mode to live
          API mode.
        </p>
      </section>

      <section className="grid">
        {items.map((item) => (
          <article key={item.quest.id} className="card">
            <p className="eyebrow">{item.currentState}</p>
            <h2>{item.quest.name}</h2>
            <p>{item.quest.summary}</p>
            <p>Moderation: {item.quest.moderation.verdict}</p>
            <p>Needs review: {item.quest.needsEducatorReview ? "yes" : "no"}</p>
            <Link
              href={`/quests/${item.quest.id}${searchParams.email ? `?email=${encodeURIComponent(searchParams.email)}&role=educator` : ""}`}
            >
              Review quest
            </Link>
          </article>
        ))}
      </section>

      {data?.nextCursor ? (
        <p>
          <Link
            href={`/educator?cursor=${encodeURIComponent(data.nextCursor)}${searchParams.email ? `&email=${encodeURIComponent(searchParams.email)}` : ""}`}
          >
            Next page
          </Link>
        </p>
      ) : null}

      {!items.length ? (
        <section className="card">
          <h2>No inbox items found</h2>
        </section>
      ) : null}
    </main>
  );
}
