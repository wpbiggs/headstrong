import "dotenv/config";
import { createQuestRepository } from "../src/repositories/app-repository";

function getFlag(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function ensureUser(
  email: string,
  role: "parent" | "student",
  repository: ReturnType<typeof createQuestRepository>,
) {
  const existing = await repository.findUserByEmail(email);

  if (existing) {
    if (existing.role !== role) {
      throw new Error(`${email} already exists with role ${existing.role}.`);
    }

    return existing;
  }

  return repository.createUser(email, role);
}

async function run() {
  const parentEmail = getFlag("parent-email");
  const studentEmail = getFlag("student-email");

  if (!parentEmail || !studentEmail) {
    throw new Error(
      "Usage: pnpm --filter @headstrong/api seed:parent-student-link -- --parent-email parent@example.com --student-email student@example.com",
    );
  }

  const repository = createQuestRepository();
  const parent = await ensureUser(parentEmail, "parent", repository);
  const student = await ensureUser(studentEmail, "student", repository);
  const linked = (await repository.isParentOf(parent.id, student.id))
    ? (await repository.listParentLinks(parent.id)).find(
        (link) => link.studentId === student.id,
      )
    : await repository.linkParentToStudent(parent.id, student.id);

  if (!linked) {
    throw new Error("Failed to resolve created link.");
  }

  console.log(`Parent user id: ${parent.id}`);
  console.log(`Student user id: ${student.id}`);
  console.log(`Link id: ${linked.linkId}`);
  console.log(
    `Create link payload: {"parentId":"${parent.id}","studentId":"${student.id}"}`,
  );
  console.log(
    `Delete path: /admin/parent-student-links/${encodeURIComponent(linked.linkId)}`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
