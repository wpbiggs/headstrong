import { FeedClient } from "../../components/feed-client";
import { fetchFeedLive } from "../../lib/live-api";

const demoFeed = {
  items: [
    {
      post: {
        id: "demo-post-1",
        title: "Why did the fraction shards click for me?",
        excerpt:
          "Today I realized halves and quarters feel like puzzle pieces, not just numbers.",
        moderation: { verdict: "pass" },
        requiresParentApproval: false,
        status: "approved",
        tags: [
          { slug: "fractions", label: "fractions" },
          { slug: "math", label: "math" },
        ],
      },
    },
    {
      post: {
        id: "demo-post-2",
        title: "Cell walls made more sense in the dome",
        excerpt:
          "The biology observatory helped me picture the boundary between cell membrane and wall.",
        moderation: { verdict: "pass" },
        requiresParentApproval: false,
        status: "approved",
        tags: [{ slug: "biology", label: "biology" }],
      },
    },
  ],
  nextCursor: null,
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: {
    email?: string;
    role?: "student" | "parent" | "educator" | "admin";
    cursor?: string;
    topic?: string;
  };
}) {
  const data =
    searchParams.email && searchParams.role
      ? await fetchFeedLive({
          email: searchParams.email,
          role: searchParams.role,
          cursor: searchParams.cursor,
          topic: searchParams.topic,
          limit: 10,
        }).catch(() => demoFeed)
      : demoFeed;

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Internal Discovery Feed</p>
        <h1>Share curiosity across the campus network.</h1>
        <p>
          Internal only. No direct messages. Live write mode requires `?email=`
          and `&role=`.
        </p>
      </section>

      <FeedClient
        initialItems={data.items}
        email={searchParams.email}
        role={searchParams.role}
      />
    </main>
  );
}
