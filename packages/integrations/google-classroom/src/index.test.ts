import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleClassroomConnector } from "./index";

test("google classroom connector returns typed course sync result", async () => {
  const connector = createGoogleClassroomConnector();
  const result = await connector.syncCourse({
    externalId: "course-1",
    title: "Course",
    section: "A",
  });
  assert.ok(result.resourceId.length > 0);
});
