"use client";

import { useState } from "react";

interface FeedItem {
  post: {
    id: string;
    title: string;
    excerpt: string;
    moderation: { verdict: string };
    requiresParentApproval: boolean;
    status: string;
    tags: Array<{ slug: string; label: string }>;
  };
}

export function FeedClient({
  initialItems,
  email,
  role,
}: {
  initialItems: FeedItem[];
  email?: string;
  role?: "student" | "parent" | "educator" | "admin";
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email || !role) {
      setMessage(
        "Live write mode requires ?email=...&role=student|parent|educator|admin.",
      );
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const { createPostLive } = await import("../lib/live-api");
      const post = await createPostLive({
        email,
        role,
        title,
        body,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      console.log("feed_post_created", {
        postId: post.id,
        status: post.status,
      });
      setMessage(`Post created with status: ${post.status}`);
      setTitle("");
      setBody("");
      setTags("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to create post.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid">
      <form className="card" onSubmit={onSubmit}>
        <p className="eyebrow">Post Composer</p>
        <h2>What excited you today?</h2>
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="A short discovery title"
        />
        <textarea
          className="input textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Share the idea, experiment, or question that pulled you in."
        />
        <input
          className="input"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="fractions, biology, writing"
        />
        <button
          className="button"
          disabled={submitting || !title || !body}
          type="submit"
        >
          {submitting ? "Posting..." : "Share discovery"}
        </button>
        {message ? <p>{message}</p> : null}
      </form>

      {initialItems.map((item) => (
        <article key={item.post.id} className="card">
          <p className="eyebrow">{item.post.moderation.verdict}</p>
          <h2>{item.post.title}</h2>
          <p>{item.post.excerpt}</p>
          <p>Status: {item.post.status}</p>
          <p>
            Tags: {item.post.tags.map((tag) => tag.label).join(", ") || "none"}
          </p>
          <p>
            Parent approval required:{" "}
            {item.post.requiresParentApproval ? "yes" : "no"}
          </p>
        </article>
      ))}
    </div>
  );
}
