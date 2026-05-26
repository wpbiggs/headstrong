import { createHash } from "node:crypto";
import { readEnv } from "@headstrong/core";
import {
  type GoogleClassroomConnector,
  googleClassroomAssignmentSyncInputSchema,
  googleClassroomCourseSyncInputSchema,
  googleClassroomSyncResultSchema,
} from "@headstrong/core/integrations";
import { z } from "zod";

const env = readEnv(
  {
    ENABLE_GOOGLE_CLASSROOM: z.coerce.boolean().default(false),
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

function makeId(prefix: string, externalId: string) {
  return `${prefix}_${createHash("sha1").update(externalId).digest("hex").slice(0, 12)}`;
}

class StubGoogleClassroomConnector implements GoogleClassroomConnector {
  async syncCourse(
    input: z.infer<typeof googleClassroomCourseSyncInputSchema>,
  ) {
    const parsed = googleClassroomCourseSyncInputSchema.parse(input);
    return googleClassroomSyncResultSchema.parse({
      resourceId: makeId("course", parsed.externalId),
      externalId: parsed.externalId,
      status: env.ENABLE_GOOGLE_CLASSROOM ? "stubbed" : "disabled",
    });
  }

  async syncAssignment(
    input: z.infer<typeof googleClassroomAssignmentSyncInputSchema>,
  ) {
    const parsed = googleClassroomAssignmentSyncInputSchema.parse(input);
    return googleClassroomSyncResultSchema.parse({
      resourceId: makeId("assignment", parsed.assignmentExternalId),
      externalId: parsed.assignmentExternalId,
      status: env.ENABLE_GOOGLE_CLASSROOM ? "stubbed" : "disabled",
    });
  }
}

export function createGoogleClassroomConnector() {
  return new StubGoogleClassroomConnector();
}
