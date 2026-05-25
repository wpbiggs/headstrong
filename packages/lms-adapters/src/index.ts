import { readEnv } from "@headstrong/core";
import { z } from "zod";

const lmsEnv = readEnv(
  {
    MOODLE_BASE_URL: z.string().url(),
    MOODLE_TOKEN: z.string().min(1),
    ERPNEXT_BASE_URL: z.string().url(),
    ERPNEXT_API_KEY: z.string().min(1),
    ERPNEXT_API_SECRET: z.string().min(1),
  },
  process.env,
);

export async function syncStudentToMoodle(studentId: string) {
  return {
    provider: "moodle",
    studentId,
    baseUrl: lmsEnv.MOODLE_BASE_URL,
    status: "stubbed",
  } as const;
}

export async function syncEducatorToErpNext(educatorId: string) {
  return {
    provider: "erpnext",
    educatorId,
    baseUrl: lmsEnv.ERPNEXT_BASE_URL,
    status: "stubbed",
  } as const;
}
