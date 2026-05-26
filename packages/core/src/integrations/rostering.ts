import { z } from "zod";

export const rosteringProviderSchema = z.enum(["clever", "classlink"]);

export const districtRosterSyncResultSchema = z.object({
  provider: rosteringProviderSchema,
  districtId: z.string().min(1),
  syncedUsers: z.number().int().nonnegative(),
  syncedSections: z.number().int().nonnegative(),
  status: z.enum(["disabled", "stubbed"]),
});

export const enrollmentSyncResultSchema = z.object({
  provider: rosteringProviderSchema,
  syncedEnrollments: z.number().int().nonnegative(),
  status: z.enum(["disabled", "stubbed"]),
});

export interface RosterConnector {
  syncDistrictRoster(
    districtId: string,
  ): Promise<z.infer<typeof districtRosterSyncResultSchema>>;
  syncEnrollments(
    sectionId?: string,
  ): Promise<z.infer<typeof enrollmentSyncResultSchema>>;
}
