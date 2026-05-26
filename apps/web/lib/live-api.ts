import { env } from "../env";

interface SessionBootstrapInput {
  email: string;
  role: "student" | "parent" | "educator" | "expert" | "admin";
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
  role: "student" | "parent" | "educator" | "expert" | "admin";
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
  role: "student" | "parent" | "educator" | "expert" | "admin";
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
  role: "student" | "parent" | "educator" | "expert" | "admin";
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
  role: "student" | "parent" | "educator" | "expert" | "admin";
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
  role: "student" | "parent" | "educator" | "expert" | "admin";
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

export async function createCampaignLive(input: {
  email: string;
  role: "admin";
  educatorUserId: string;
  title: string;
  description: string;
  openingPledgeUsd: number;
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      educatorUserId: input.educatorUserId,
      title: input.title,
      description: input.description,
      openingPledgeUsd: input.openingPledgeUsd,
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to create campaign.");
  }
  return response.json();
}

export async function fetchCampaignDetailLive(input: {
  id: string;
  email: string;
  role: "admin" | "educator" | "parent" | "expert";
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/campaigns/${input.id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Failed to fetch campaign detail.");
  return response.json();
}

export async function fetchCampaignHistoryLive(input: {
  id: string;
  email: string;
  role: "admin" | "educator" | "parent" | "expert";
  cursor?: string;
  limit?: number;
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const url = new URL(
    `${env.NEXT_PUBLIC_API_URL}/campaigns/${input.id}/history`,
  );
  if (input.cursor) url.searchParams.set("cursor", input.cursor);
  if (input.limit) url.searchParams.set("limit", String(input.limit));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to fetch campaign history.");
  return response.json();
}

export async function allocateCampaignLive(input: {
  id: string;
  email: string;
  educatorId: string;
  amount: number;
  note: string;
}) {
  const token = await createToken({ email: input.email, role: "admin" });
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/campaigns/${input.id}/allocate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        educatorId: input.educatorId,
        amount: input.amount,
        note: input.note,
      }),
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to allocate campaign funds.");
  }
  return response.json();
}

export async function publishQuestToLmsLive(input: {
  questId: string;
  email: string;
  role: "educator" | "admin";
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/lms/quests/${input.questId}/publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ provider: "moodle" }),
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to publish quest to LMS.");
  }
  return response.json();
}

export async function recordLmsCompletionLive(input: {
  questId: string;
  email: string;
  role: "educator" | "admin";
  learnerId: string;
  assignmentExternalId: string;
  score: number;
  completedAt: string;
  skillId: string;
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/lms/quests/${input.questId}/completion`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        provider: "moodle",
        learnerId: input.learnerId,
        assignmentExternalId: input.assignmentExternalId,
        score: input.score,
        completedAt: input.completedAt,
        skillId: input.skillId,
      }),
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to record LMS completion.");
  }
  return response.json();
}

export async function scheduleComputeJobLive(input: {
  email: string;
  role: "educator" | "admin";
  type: "inference" | "scoring";
  payload: Record<string, unknown>;
  providerId: string;
  validatorId: string;
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/compute/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      version: "v1",
      type: input.type,
      payload: input.payload,
      providerId: input.providerId,
      validatorId: input.validatorId,
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to schedule compute job.");
  }
  return response.json();
}

export async function fetchComputeJobLive(input: {
  id: string;
  email: string;
  role: "educator" | "admin";
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/compute/jobs/${input.id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Failed to fetch compute job.");
  return response.json();
}

export async function fetchComputeJobsLive(input: {
  email: string;
  role: "educator" | "admin";
  state?: "queued" | "running" | "succeeded" | "failed";
  cursor?: string;
  limit?: number;
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}/compute/jobs`);
  if (input.state) url.searchParams.set("state", input.state);
  if (input.cursor) url.searchParams.set("cursor", input.cursor);
  if (input.limit) url.searchParams.set("limit", String(input.limit));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to fetch compute jobs.");
  return response.json();
}

export async function processNextComputeJobLive(input: {
  email: string;
  role: "educator" | "admin";
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/compute/jobs/process-next`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to process compute queue.");
  }
  return response.json();
}

export async function fetchCommonsAssetsLive(input: {
  cursor?: string;
  subject?: string;
  tag?: string;
  limit?: number;
}) {
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}/commons/assets`);
  if (input.cursor) url.searchParams.set("cursor", input.cursor);
  if (input.subject) url.searchParams.set("subject", input.subject);
  if (input.tag) url.searchParams.set("tag", input.tag);
  if (input.limit) url.searchParams.set("limit", String(input.limit));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch commons assets.");
  return response.json();
}

export async function fetchCommonsAssetDetailLive(input: { id: string }) {
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/commons/assets/${input.id}`,
    {
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Failed to fetch asset detail.");
  return response.json();
}

export async function createCommonsAssetLive(input: {
  email: string;
  role: "educator" | "expert" | "admin";
  title: string;
  slug: string;
  summary: string;
  subject: string;
  gradeBand: string;
  license: string;
  sourceUrl: string;
  tags: string[];
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/commons/assets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to create asset.");
  }
  return response.json();
}

export async function remixCommonsAssetLive(input: {
  assetId: string;
  email: string;
  role: "educator" | "expert" | "admin";
  title: string;
  slug: string;
  summary: string;
  relation: "remixed_from" | "translated_from" | "adapted_from";
}) {
  const token = await createToken({ email: input.email, role: input.role });
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/commons/assets/${input.assetId}/remix`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: input.title,
        slug: input.slug,
        summary: input.summary,
        relation: input.relation,
      }),
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to remix asset.");
  }
  return response.json();
}
