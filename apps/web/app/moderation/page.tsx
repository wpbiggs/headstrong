import Link from "next/link";
import { fetchModerationPostsLive } from "../../lib/live-api";

interface ModerationItem {
  post: {
    id: string;
    title: string;
    state: string;
    moderation: { verdict: string };
  };
  reportsCount: number;
}

const demoQueue = {
  items: [
    {
      post: {
        id: "demo-post-warn",
        title: "Please dm me after class",
        body: "This should be reviewed.",
        state: "live",
        moderation: { verdict: "warn", labels: ["needs_parent_review"] },
        requiresParentApproval: true,
      },
      reportsCount: 1,
    },
  ],
};

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: {
    email?: string;
    role?: "educator" | "admin";
    state?: "warn" | "block" | "reported";
  };
}) {
  const data =
    searchParams.email && searchParams.role
      ? await fetchModerationPostsLive({
          email: searchParams.email,
          role: searchParams.role,
          state: searchParams.state,
        }).catch(() => demoQueue)
      : demoQueue;

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Moderation</p>
        <h1>Reports, warned posts, blocked posts, and removed posts.</h1>
      </section>
      <section className="tabs-row">
        <Link href="/moderation?state=reported">Reports</Link>
        <Link href="/moderation?state=warn">Warned</Link>
        <Link href="/moderation?state=block">Blocked</Link>
        <Link href="/moderation">Removed</Link>
      </section>
      <section className="grid">
        {(data.items as ModerationItem[]).map((item) => (
          <article key={item.post.id} className="card">
            <p className="eyebrow">{item.post.moderation.verdict}</p>
            <h2>{item.post.title}</h2>
            <p>State: {item.post.state}</p>
            <p>Reports: {item.reportsCount}</p>
            <Link
              href={`/posts/${item.post.id}${searchParams.email ? `?email=${encodeURIComponent(searchParams.email)}&role=${searchParams.role}` : ""}`}
            >
              Open detail
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
