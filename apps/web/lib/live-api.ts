import { env } from "../env";

interface SessionBootstrapInput {
  email: string;
  role: "student" | "parent" | "educator" | "admin";
}

async function createToken(input: SessionBootstrapInput) {
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to create session for ${input.email}.`);
  }

  const payload = await response.json();
  return payload.token as string;
}

export async function fetchQuestListLive(input: {
  email: string;
  role: "student" | "parent" | "educator" | "admin";
  cursor?: string;
  state?: string;
  limit?: number;
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}/quests`);
  url.searchParams.set("role", input.role);
  if (input.cursor) {
    url.searchParams.set("cursor", input.cursor);
  }
  if (input.state) {
    url.searchParams.set("state", input.state);
  }
  if (input.limit) {
    url.searchParams.set("limit", String(input.limit));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch quests for role ${input.role}.`);
  }

  return response.json();
}

export async function fetchQuestDetailLive(input: {
  questId: string;
  email: string;
  role: "student" | "parent" | "educator" | "admin";
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/quests/${input.questId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch quest ${input.questId}.`);
  }

  return response.json();
}

export async function fetchFeedLive(input: {
  email: string;
  role: "student" | "parent" | "educator" | "admin";
  cursor?: string;
  topic?: string;
  limit?: number;
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}/posts/feed`);
  if (input.cursor) {
    url.searchParams.set("cursor", input.cursor);
  }
  if (input.topic) {
    url.searchParams.set("topic", input.topic);
  }
  if (input.limit) {
    url.searchParams.set("limit", String(input.limit));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch internal feed.");
  }

  return response.json();
}

export async function fetchPostDetailLive(input: {
  id: string;
  email: string;
  role: "student" | "parent" | "educator" | "admin";
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/posts/${input.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to fetch post detail.");
  return response.json();
}

export async function fetchParentApprovalQueueLive(input: {
  email: string;
  role: "parent" | "admin";
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/posts/parent-approval`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Failed to fetch parent approval queue.");
  return response.json();
}

export async function fetchModerationPostsLive(input: {
  email: string;
  role: "educator" | "admin";
  state?: "warn" | "block" | "reported";
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}/moderation/posts`);
  if (input.state) url.searchParams.set("state", input.state);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to fetch moderation queue.");
  return response.json();
}

export async function postActionLive(input: {
  path: string;
  email: string;
  role: "parent" | "educator" | "admin";
  notes?: string;
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${input.path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ notes: input.notes }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Action failed.");
  }
  return response.status === 204 ? null : response.json();
}

export async function createPostLive(input: {
  email: string;
  role: "student" | "parent" | "educator" | "admin";
  title: string;
  body: string;
  tags: string[];
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      tags: input.tags,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to create post.");
  }

  return response.json();
}
