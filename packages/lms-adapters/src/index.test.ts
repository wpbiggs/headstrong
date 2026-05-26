import assert from "node:assert/strict";
import test from "node:test";
import {
  createErpNextAdapter,
  createMoodleAdapter,
  mapQuestToMoodleActivity,
  openCurriculumSeed,
} from "./index";

test("moodle adapter creates stable course and assignment refs", async () => {
  const adapter = createMoodleAdapter();
  const course = await adapter.createCourse({
    externalId: "quest:abc",
    title: "Quest",
    summary: "Summary",
  });
  const assignment = await adapter.createAssignment({
    courseId: course.resourceId,
    externalId: "task:abc",
    title: "Task",
    instructions: "Do it",
  });
  assert.equal(course.provider, "moodle");
  assert.equal(assignment.provider, "moodle");
});

test("quest mapping produces idempotent publish key and assignments", async () => {
  const result = await mapQuestToMoodleActivity({
    questId: "quest-123",
    title: "Fractions Quest",
    summary: "Map to Moodle",
    assignments: [
      {
        externalId: "quest-123:task-1",
        title: "Task 1",
        instructions: "Do task 1",
      },
    ],
  });
  assert.equal(result.idempotencyKey, "quest:quest-123:moodle");
  assert.equal(result.assignments.length, 1);
});

test("erpnext adapter stubs enrollment and attendance sync", async () => {
  const adapter = createErpNextAdapter();
  const enrollment = await adapter.syncEnrollment({
    studentId: "student-1",
    classId: "class-1",
  });
  const attendance = await adapter.syncAttendance({
    studentId: "student-1",
    classId: "class-1",
    attendedOn: "2026-05-25",
    present: true,
  });
  assert.ok(enrollment.externalId.length > 0);
  assert.ok(attendance.externalId.length > 0);
});

test("open curriculum seed exposes reusable OER assets", () => {
  assert.ok(openCurriculumSeed.length >= 2);
  assert.equal(openCurriculumSeed[0]?.subject, "math");
});
