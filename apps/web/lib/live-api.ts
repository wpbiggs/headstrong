import { env } from "../env";

interface SessionBootstrapInput {
  email: string;
  role: "parent" | "educator" | "admin";
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
  role: "parent" | "educator" | "admin";
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
  role: "parent" | "educator" | "admin";
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
