import { healthResponseSchema } from "@headstrong/core";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import type { AppVariables } from "./lib/context";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { guildRoutes } from "./routes/guilds";
import { moderationRoutes } from "./routes/moderation";
import { postRoutes } from "./routes/posts";
import { questRoutes } from "./routes/quest";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", cors());

app.get("/health", (c) =>
  c.json(healthResponseSchema.parse({ ok: true, service: "api" })),
);
app.route("/admin", adminRoutes);
app.route("/auth", authRoutes);
app.route("/posts", postRoutes);
app.route("/guilds", guildRoutes);
app.route("/moderation", moderationRoutes);
app.route("/quests", questRoutes);

serve(
  {
    fetch: app.fetch,
    hostname: env.API_HOST,
    port: env.API_PORT,
  },
  (info) => {
    console.log(`API listening on http://${info.address}:${info.port}`);
  },
);
