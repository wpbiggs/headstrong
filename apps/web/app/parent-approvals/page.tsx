import Link from "next/link";
import { fetchParentApprovalQueueLive } from "../../lib/live-api";

interface ParentApprovalItem {
  post: {
    id: string;
    title: string;
    body: string;
    state: string;
  };
}

const demoQueue = {
  items: [
    {
      post: {
        id: "demo-pending-post",
        title: "My quest reflection",
        body: "Awaiting parent approval.",
        state: "pending_parent_approval",
        moderation: { verdict: "pass", labels: [] },
        requiresParentApproval: true,
      },
      authorStudentId: "11111111-1111-4111-8111-111111111111",
    },
  ],
};

export default async function ParentApprovalsPage({
  searchParams,
}: { searchParams: { email?: string; role?: "parent" | "admin" } }) {
  const data =
    searchParams.email && searchParams.role
      ? await fetchParentApprovalQueueLive({
          email: searchParams.email,
          role: searchParams.role,
        }).catch(() => demoQueue)
      : demoQueue;

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Parent Approval Queue</p>
        <h1>Approve or reject linked students' pending discovery posts.</h1>
      </section>
      <section className="grid">
        {(data.items as ParentApprovalItem[]).map((item) => (
          <article key={item.post.id} className="card">
            <p className="eyebrow">{item.post.state}</p>
            <h2>{item.post.title}</h2>
            <p>{item.post.body}</p>
            <Link
              href={`/posts/${item.post.id}${searchParams.email ? `?email=${encodeURIComponent(searchParams.email)}&role=${searchParams.role}` : ""}`}
            >
              Review post
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
