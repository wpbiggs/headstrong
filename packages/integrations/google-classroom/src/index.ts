import { createHash } from "node:crypto";
import { environmentBooleanSchema, readEnv } from "@headstrong/core";
import {
  type GoogleClassroomConnector,
  googleClassroomAssignmentSyncInputSchema,
  googleClassroomCourseSyncInputSchema,
  googleClassroomOauthStartSchema,
  googleClassroomOauthTokenSchema,
  googleClassroomSyncResultSchema,
} from "@headstrong/core/integrations";
import { z } from "zod";

function readConfiguration() {
  return readEnv(
    {
      ENABLE_GOOGLE_CLASSROOM: environmentBooleanSchema.default(false),
      GOOGLE_CLASSROOM_CLIENT_ID: z.string().min(1).default("replace-me"),
      GOOGLE_CLASSROOM_CLIENT_SECRET: z.string().min(1).default("replace-me"),
      GOOGLE_CLASSROOM_REDIRECT_URI: z
        .string()
        .url()
        .default(
          "http://localhost:4000/integrations/google-classroom/oauth/callback",
        ),
    },
    process.env,
  );
}

function makeId(prefix: string, externalId: string) {
  return `${prefix}_${createHash("sha1").update(externalId).digest("hex").slice(0, 12)}`;
}

class StubGoogleClassroomConnector implements GoogleClassroomConnector {
  constructor(private readonly env = readConfiguration()) {}

  private requireOauthConfiguration() {
    const env = this.env;
    if (!env.ENABLE_GOOGLE_CLASSROOM)
      throw new Error("Google Classroom integration is disabled.");
    if (
      env.GOOGLE_CLASSROOM_CLIENT_ID === "replace-me" ||
      env.GOOGLE_CLASSROOM_CLIENT_SECRET === "replace-me"
    ) {
      throw new Error("Google Classroom OAuth credentials are not configured.");
    }
    const redirect = new URL(env.GOOGLE_CLASSROOM_REDIRECT_URI);
    if (
      redirect.protocol !== "https:" &&
      !(
        redirect.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(redirect.hostname)
      )
    ) {
      throw new Error(
        "Google Classroom redirect must use HTTPS or loopback HTTP.",
      );
    }
  }

  async buildAuthorizationUrl(state: string) {
    this.requireOauthConfiguration();
    z.string().trim().min(32).max(512).parse(state);
    const env = this.env;
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", env.GOOGLE_CLASSROOM_CLIENT_ID);
    url.searchParams.set("redirect_uri", env.GOOGLE_CLASSROOM_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/classroom.courses https://www.googleapis.com/auth/classroom.coursework.students",
    );
    url.searchParams.set("state", state);
    return googleClassroomOauthStartSchema.parse({
      redirectUrl: url.toString(),
    });
  }

  async exchangeAuthorizationCode(code: string) {
    this.requireOauthConfiguration();
    z.string().trim().min(1).max(4096).parse(code);
    const env = this.env;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLASSROOM_CLIENT_ID,
        client_secret: env.GOOGLE_CLASSROOM_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CLASSROOM_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    if (!response.ok) {
      throw new Error(
        "Failed to exchange Google Classroom authorization code.",
      );
    }
    const payload = await response.json();
    return googleClassroomOauthTokenSchema.parse({
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresIn: payload.expires_in,
    });
  }

  async syncCourse(
    input: z.infer<typeof googleClassroomCourseSyncInputSchema>,
  ) {
    const parsed = googleClassroomCourseSyncInputSchema.parse(input);
    return googleClassroomSyncResultSchema.parse({
      resourceId: makeId("course", parsed.externalId),
      externalId: parsed.externalId,
      status: this.env.ENABLE_GOOGLE_CLASSROOM ? "stubbed" : "disabled",
    });
  }

  async syncAssignment(
    input: z.infer<typeof googleClassroomAssignmentSyncInputSchema>,
  ) {
    const parsed = googleClassroomAssignmentSyncInputSchema.parse(input);
    return googleClassroomSyncResultSchema.parse({
      resourceId: makeId("assignment", parsed.assignmentExternalId),
      externalId: parsed.assignmentExternalId,
      status: this.env.ENABLE_GOOGLE_CLASSROOM ? "stubbed" : "disabled",
    });
  }
}

export function createGoogleClassroomConnector() {
  return new StubGoogleClassroomConnector();
}
