import "dotenv/config";
import { readEnv } from "@headstrong/core";
import { z } from "zod";

export const env = readEnv(
  {
    API_HOST: z.string().min(1),
    API_PORT: z.coerce.number().int().positive(),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    REQUIRE_PARENT_APPROVAL_FOR_STUDENT_POSTS: z.coerce.boolean().default(true),
    ENABLE_MOODLE_ADAPTER: z.coerce.boolean().default(true),
    ENABLE_ERPNEXT_ADAPTER: z.coerce.boolean().default(true),
    ENABLE_COMPUTE_LEDGER: z.coerce.boolean().default(true),
    ENABLE_LTI_PROVIDER: z.coerce.boolean().default(false),
    ENABLE_LTI_CONSUMER: z.coerce.boolean().default(false),
    LTI_ISSUER: z.string().url().default("https://platform.example.com"),
    LTI_CLIENT_ID: z.string().min(1).default("headstrong-lti-client"),
    LTI_DEPLOYMENT_ID: z.string().min(1).default("headstrong-deployment"),
    LTI_REDIRECT_URI: z
      .string()
      .url()
      .default("http://localhost:4000/integrations/lti/oidc/callback"),
    ENABLE_CLEVER_ROSTERING: z.coerce.boolean().default(false),
    CLEVER_CLIENT_ID: z.string().min(1).default("replace-me"),
    CLEVER_CLIENT_SECRET: z.string().min(1).default("replace-me"),
    CLEVER_DISTRICT_ID: z.string().min(1).default("district-1"),
    ENABLE_CLASSLINK_ROSTERING: z.coerce.boolean().default(false),
    CLASSLINK_CLIENT_ID: z.string().min(1).default("replace-me"),
    CLASSLINK_CLIENT_SECRET: z.string().min(1).default("replace-me"),
    CLASSLINK_TENANT_ID: z.string().min(1).default("tenant-1"),
    ENABLE_GOOGLE_CLASSROOM: z.coerce.boolean().default(false),
    GOOGLE_CLASSROOM_CLIENT_ID: z.string().min(1).default("replace-me"),
    GOOGLE_CLASSROOM_CLIENT_SECRET: z.string().min(1).default("replace-me"),
    GOOGLE_CLASSROOM_REDIRECT_URI: z
      .string()
      .url()
      .default(
        "http://localhost:4000/integrations/google-classroom/oauth/callback",
      ),
    ENABLE_OPEN_BADGES: z.coerce.boolean().default(false),
    OPEN_BADGES_ISSUER_URL: z
      .string()
      .url()
      .default("https://badges.example.com"),
    OPEN_BADGES_ISSUER_NAME: z.string().min(1).default("Headstrong"),
  },
  process.env,
);
