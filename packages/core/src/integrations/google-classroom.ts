import { z } from "zod";

export const googleClassroomCourseSyncInputSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  section: z.string().min(1),
});

export const googleClassroomAssignmentSyncInputSchema = z.object({
  courseExternalId: z.string().min(1),
  assignmentExternalId: z.string().min(1),
  title: z.string().min(1),
  instructions: z.string().min(1),
});

export const googleClassroomSyncResultSchema = z.object({
  resourceId: z.string().min(1),
  externalId: z.string().min(1),
  status: z.enum(["disabled", "stubbed"]),
});

export const googleClassroomOauthStartSchema = z.object({
  redirectUrl: z.string().url(),
});

export const googleClassroomOauthTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresIn: z.number().int().positive(),
});

export interface GoogleClassroomConnector {
  syncCourse(
    input: z.infer<typeof googleClassroomCourseSyncInputSchema>,
  ): Promise<z.infer<typeof googleClassroomSyncResultSchema>>;
  syncAssignment(
    input: z.infer<typeof googleClassroomAssignmentSyncInputSchema>,
  ): Promise<z.infer<typeof googleClassroomSyncResultSchema>>;
  buildAuthorizationUrl(
    state: string,
  ): Promise<z.infer<typeof googleClassroomOauthStartSchema>>;
  exchangeAuthorizationCode(
    code: string,
  ): Promise<z.infer<typeof googleClassroomOauthTokenSchema>>;
}
