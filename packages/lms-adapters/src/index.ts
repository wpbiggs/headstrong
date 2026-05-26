import { createHash } from "node:crypto";
import {
  type CurriculumAsset,
  type lmsAssignmentInputSchema,
  type lmsCompletionInputSchema,
  type lmsCourseInputSchema,
  lmsGradeSchema,
  lmsResourceRefSchema,
  questLmsPublishResultSchema,
  readEnv,
} from "@headstrong/core";
import { z } from "zod";

const lmsEnv = readEnv(
  {
    ENABLE_MOODLE_ADAPTER: z.coerce.boolean().default(true),
    ENABLE_ERPNEXT_ADAPTER: z.coerce.boolean().default(true),
    MOODLE_BASE_URL: z.string().url(),
    MOODLE_TOKEN: z.string().min(1),
    ERPNEXT_BASE_URL: z.string().url(),
    ERPNEXT_API_KEY: z.string().min(1),
    ERPNEXT_API_SECRET: z.string().min(1),
  },
  process.env,
);

function makeId(prefix: string, externalId: string) {
  return `${prefix}_${createHash("sha1").update(externalId).digest("hex").slice(0, 12)}`;
}

export interface MoodleAdapter {
  createCourse(
    input: z.infer<typeof lmsCourseInputSchema>,
  ): Promise<z.infer<typeof lmsResourceRefSchema>>;
  createAssignment(
    input: z.infer<typeof lmsAssignmentInputSchema>,
  ): Promise<z.infer<typeof lmsResourceRefSchema>>;
  recordCompletion(
    input: z.infer<typeof lmsCompletionInputSchema>,
  ): Promise<z.infer<typeof lmsGradeSchema>>;
  fetchGrades(courseId: string): Promise<Array<z.infer<typeof lmsGradeSchema>>>;
}

export interface ErpNextAdapter {
  syncEnrollment(input: { studentId: string; classId: string }): Promise<{
    status: "stubbed" | "synced";
    externalId: string;
  }>;
  syncClassAssignment(input: { educatorId: string; classId: string }): Promise<{
    status: "stubbed" | "synced";
    externalId: string;
  }>;
  syncAttendance(input: {
    studentId: string;
    classId: string;
    attendedOn: string;
    present: boolean;
  }): Promise<{ status: "stubbed" | "synced"; externalId: string }>;
}

class StubMoodleAdapter implements MoodleAdapter {
  async createCourse(input: z.infer<typeof lmsCourseInputSchema>) {
    return lmsResourceRefSchema.parse({
      provider: "moodle",
      resourceId: makeId("course", input.externalId),
      externalId: input.externalId,
      status: lmsEnv.ENABLE_MOODLE_ADAPTER ? "created" : "stubbed",
    });
  }

  async createAssignment(input: z.infer<typeof lmsAssignmentInputSchema>) {
    return lmsResourceRefSchema.parse({
      provider: "moodle",
      resourceId: makeId("assignment", input.externalId),
      externalId: input.externalId,
      status: lmsEnv.ENABLE_MOODLE_ADAPTER ? "created" : "stubbed",
    });
  }

  async recordCompletion(input: z.infer<typeof lmsCompletionInputSchema>) {
    return lmsGradeSchema.parse({
      assignmentId: input.assignmentId,
      learnerId: input.learnerId,
      score: input.score,
      recordedAt: input.completedAt,
    });
  }

  async fetchGrades() {
    return [];
  }
}

class StubErpNextAdapter implements ErpNextAdapter {
  async syncEnrollment(input: { studentId: string; classId: string }) {
    return {
      status: lmsEnv.ENABLE_ERPNEXT_ADAPTER ? "synced" : "stubbed",
      externalId: makeId("enrollment", `${input.studentId}:${input.classId}`),
    } as const;
  }

  async syncClassAssignment(input: { educatorId: string; classId: string }) {
    return {
      status: lmsEnv.ENABLE_ERPNEXT_ADAPTER ? "synced" : "stubbed",
      externalId: makeId(
        "class-assignment",
        `${input.educatorId}:${input.classId}`,
      ),
    } as const;
  }

  async syncAttendance(input: {
    studentId: string;
    classId: string;
    attendedOn: string;
    present: boolean;
  }) {
    return {
      status: lmsEnv.ENABLE_ERPNEXT_ADAPTER ? "synced" : "stubbed",
      externalId: makeId(
        "attendance",
        `${input.studentId}:${input.classId}:${input.attendedOn}:${input.present}`,
      ),
    } as const;
  }
}

export const openCurriculumSeed: CurriculumAsset[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "oer-fractions-101",
    title: "OER Fractions Intro",
    summary: "Open educational fractions introduction for elementary learners.",
    subject: "math",
    gradeBand: "3-5",
    license: "CC BY 4.0",
    sourceUrl: "https://example.com/oer/fractions-intro",
    tags: ["fractions", "oer"],
    contributorUserId: "00000000-0000-4000-8000-000000000001",
    contributionType: "original",
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "oer-biology-cells",
    title: "OER Cell Structures",
    summary: "Open educational biology asset covering cell structures.",
    subject: "biology",
    gradeBand: "6-8",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://example.com/oer/cell-structures",
    tags: ["biology", "cells", "oer"],
    contributorUserId: "00000000-0000-4000-8000-000000000002",
    contributionType: "original",
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function createMoodleAdapter(): MoodleAdapter {
  return new StubMoodleAdapter();
}

export function createErpNextAdapter(): ErpNextAdapter {
  return new StubErpNextAdapter();
}

export async function mapQuestToMoodleActivity(input: {
  questId: string;
  title: string;
  summary: string;
  assignments: Array<{
    externalId: string;
    title: string;
    instructions: string;
  }>;
}) {
  const adapter = createMoodleAdapter();
  const course = await adapter.createCourse({
    externalId: `quest:${input.questId}`,
    title: input.title,
    summary: input.summary,
  });
  const assignmentRefs = [] as Array<z.infer<typeof lmsResourceRefSchema>>;
  for (const assignment of input.assignments) {
    assignmentRefs.push(
      await adapter.createAssignment({
        courseId: course.resourceId,
        externalId: assignment.externalId,
        title: assignment.title,
        instructions: assignment.instructions,
      }),
    );
  }

  return questLmsPublishResultSchema.parse({
    provider: "moodle",
    course,
    assignments: assignmentRefs,
    idempotencyKey: `quest:${input.questId}:moodle`,
  });
}
