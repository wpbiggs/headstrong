import { ActionPanel } from "../../../components/action-panel";
import { PostDetailCard } from "../../../components/post-detail-card";
import { fetchPostDetailLive } from "../../../lib/live-api";

type ActionRole = "parent" | "educator" | "admin";

const demoPost = {
  post: {
    id: "demo-post-1",
    title: "Why did the fraction shards click for me?",
    body: "Today I realized halves and quarters feel like puzzle pieces, not just numbers.",
    state: "live",
    moderation: { verdict: "pass", labels: [] },
    requiresParentApproval: false,
  },
  reportsCount: 0,
};

export default async function PostPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: {
    email?: string;
    role?: "student" | "parent" | "educator" | "admin";
  };
}) {
  const detail =
    searchParams.email && searchParams.role
      ? await fetchPostDetailLive({
          id: params.id,
          email: searchParams.email,
          role: searchParams.role,
        }).catch(() => demoPost)
      : demoPost;

  const actions =
    searchParams.role === "parent"
      ? [
          { label: "Approve", path: `/posts/${params.id}/approve-parent` },
          { label: "Reject", path: `/posts/${params.id}/reject-parent` },
        ]
      : searchParams.role === "educator" || searchParams.role === "admin"
        ? [
            { label: "Remove", path: `/moderation/posts/${params.id}/remove` },
            {
              label: "Restore",
              path: `/moderation/posts/${params.id}/restore`,
            },
          ]
        : [];

  return (
    <main>
      <PostDetailCard detail={detail} />
      {actions.length &&
      searchParams.role &&
      searchParams.role !== "student" ? (
        <ActionPanel
          actions={actions}
          email={searchParams.email}
          role={searchParams.role as ActionRole}
        />
      ) : null}
    </main>
  );
}
