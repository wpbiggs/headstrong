import { readEnv } from "@headstrong/core";
import { z } from "zod";

const aiGatewayEnv = readEnv(
  {
    OPENAI_BASE_URL: z.string().url(),
    OPENAI_API_KEY: z.string().min(1),
  },
  process.env,
);

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
}

export async function createChatCompletion(request: ChatCompletionRequest) {
  const response = await fetch(
    `${aiGatewayEnv.OPENAI_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiGatewayEnv.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(`AI gateway request failed with status ${response.status}`);
  }

  return response.json();
}
