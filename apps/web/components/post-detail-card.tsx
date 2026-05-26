import type { DemoQuestDetail } from "../lib/demo-quests";

export interface DemoPostDetail {
  post: {
    id: string;
    title: string;
    body: string;
    state: string;
    moderation: { verdict: string; labels: string[] };
    moderationState?: string;
    requiresParentApproval: boolean;
  };
  reportsCount?: number;
}

export function PostDetailCard({ detail }: { detail: DemoPostDetail }) {
  return (
    <section className="card">
      <p className="eyebrow">Post Detail</p>
      <h1>{detail.post.title}</h1>
      <p>{detail.post.body}</p>
      <p>State: {detail.post.state}</p>
      <p>Moderation verdict: {detail.post.moderation.verdict}</p>
      <p>Labels: {detail.post.moderation.labels.join(", ") || "none"}</p>
      <p>
        Parent approval required:{" "}
        {detail.post.requiresParentApproval ? "yes" : "no"}
      </p>
      <p>Reports: {detail.reportsCount ?? 0}</p>
    </section>
  );
}
