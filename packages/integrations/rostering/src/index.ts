import { readEnv } from "@headstrong/core";
import {
  type RosterConnector,
  districtRosterSyncResultSchema,
  enrollmentSyncResultSchema,
} from "@headstrong/core/integrations";
import { z } from "zod";

const env = readEnv(
  {
    ENABLE_CLEVER_ROSTERING: z.coerce.boolean().default(false),
    CLEVER_CLIENT_ID: z.string().min(1).default("replace-me"),
    CLEVER_CLIENT_SECRET: z.string().min(1).default("replace-me"),
    CLEVER_DISTRICT_ID: z.string().min(1).default("district-1"),
    ENABLE_CLASSLINK_ROSTERING: z.coerce.boolean().default(false),
    CLASSLINK_CLIENT_ID: z.string().min(1).default("replace-me"),
    CLASSLINK_CLIENT_SECRET: z.string().min(1).default("replace-me"),
    CLASSLINK_TENANT_ID: z.string().min(1).default("tenant-1"),
  },
  process.env,
);

class CleverRosterConnector implements RosterConnector {
  async syncDistrictRoster(districtId: string) {
    return districtRosterSyncResultSchema.parse({
      provider: "clever",
      districtId,
      syncedUsers: 0,
      syncedSections: 0,
      status: env.ENABLE_CLEVER_ROSTERING ? "stubbed" : "disabled",
    });
  }

  async syncEnrollments() {
    return enrollmentSyncResultSchema.parse({
      provider: "clever",
      syncedEnrollments: 0,
      status: env.ENABLE_CLEVER_ROSTERING ? "stubbed" : "disabled",
    });
  }
}

class ClassLinkRosterConnector implements RosterConnector {
  async syncDistrictRoster(districtId: string) {
    return districtRosterSyncResultSchema.parse({
      provider: "classlink",
      districtId,
      syncedUsers: 0,
      syncedSections: 0,
      status: env.ENABLE_CLASSLINK_ROSTERING ? "stubbed" : "disabled",
    });
  }

  async syncEnrollments() {
    return enrollmentSyncResultSchema.parse({
      provider: "classlink",
      syncedEnrollments: 0,
      status: env.ENABLE_CLASSLINK_ROSTERING ? "stubbed" : "disabled",
    });
  }
}

export function createCleverRosterConnector() {
  return new CleverRosterConnector();
}

export function createClassLinkRosterConnector() {
  return new ClassLinkRosterConnector();
}
