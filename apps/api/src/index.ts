import { healthResponseSchema } from "@headstrong/core";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import type { AppVariables } from "./lib/context";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { campaignRoutes } from "./routes/campaigns";
import { commonsRoutes } from "./routes/commons";
import { computeRoutes } from "./routes/compute";
import { guildRoutes } from "./routes/guilds";
import { integrationRoutes } from "./routes/integrations";
import { lmsRoutes } from "./routes/lms";
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
app.route("/campaigns", campaignRoutes);
app.route("/commons", commonsRoutes);
app.route("/compute", computeRoutes);
app.route("/posts", postRoutes);
app.route("/guilds", guildRoutes);
app.route("/integrations", integrationRoutes);
app.route("/lms", lmsRoutes);
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
