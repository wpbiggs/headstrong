import "dotenv/config";
import { environmentBooleanSchema, readEnv } from "@headstrong/core";
import { z } from "zod";

export const env = readEnv(
  {
    API_HOST: z.string().min(1),
    API_PORT: z.coerce.number().int().positive(),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    REQUIRE_PARENT_APPROVAL_FOR_STUDENT_POSTS:
      environmentBooleanSchema.default(true),
    ENABLE_MOODLE_ADAPTER: environmentBooleanSchema.default(true),
    ENABLE_ERPNEXT_ADAPTER: environmentBooleanSchema.default(true),
    ENABLE_COMPUTE_LEDGER: environmentBooleanSchema.default(true),
    COMPUTE_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
    COMPUTE_RETRY_BASE_MS: z.coerce
      .number()
      .int()
      .positive()
      .max(60000)
      .default(500),
    ENABLE_LTI_PROVIDER: environmentBooleanSchema.default(false),
    ENABLE_LTI_CONSUMER: environmentBooleanSchema.default(false),
    LTI_ISSUER: z.string().url().default("https://platform.example.com"),
    LTI_CLIENT_ID: z.string().min(1).default("headstrong-lti-client"),
    LTI_DEPLOYMENT_ID: z.string().min(1).default("headstrong-deployment"),
    LTI_REDIRECT_URI: z
      .string()
      .url()
      .default("http://localhost:4000/integrations/lti/oidc/callback"),
    ENABLE_CLEVER_ROSTERING: environmentBooleanSchema.default(false),
    CLEVER_CLIENT_ID: z.string().min(1).default("replace-me"),
    CLEVER_CLIENT_SECRET: z.string().min(1).default("replace-me"),
    CLEVER_DISTRICT_ID: z.string().min(1).default("district-1"),
    ENABLE_CLASSLINK_ROSTERING: environmentBooleanSchema.default(false),
    CLASSLINK_CLIENT_ID: z.string().min(1).default("replace-me"),
    CLASSLINK_CLIENT_SECRET: z.string().min(1).default("replace-me"),
    CLASSLINK_TENANT_ID: z.string().min(1).default("tenant-1"),
    ENABLE_GOOGLE_CLASSROOM: environmentBooleanSchema.default(false),
    GOOGLE_CLASSROOM_CLIENT_ID: z.string().min(1).default("replace-me"),
    GOOGLE_CLASSROOM_CLIENT_SECRET: z.string().min(1).default("replace-me"),
    GOOGLE_CLASSROOM_REDIRECT_URI: z
      .string()
      .url()
      .default(
        "http://localhost:4000/integrations/google-classroom/oauth/callback",
      ),
    ENABLE_OPEN_BADGES: environmentBooleanSchema.default(false),
    OPEN_BADGES_ISSUER_URL: z
      .string()
      .url()
      .default("https://badges.example.com"),
    OPEN_BADGES_ISSUER_NAME: z.string().min(1).default("Headstrong"),
  },
  process.env,
);
