import {
  type ParentStudentLink,
  type Session,
  createParentStudentLinksResponseSchema,
} from "@headstrong/core";
import {
  type QuestRepository,
  createQuestRepository,
} from "../repositories/app-repository";

export class AdminServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function assertAdmin(user: Session) {
  if (user.role !== "admin") {
    throw new AdminServiceError("Forbidden.", 403);
  }
}

function parseLinkId(linkId: string) {
  const [parentId, studentId, ...rest] = linkId.split(":");

  if (!parentId || !studentId || rest.length > 0) {
    throw new AdminServiceError("Invalid link id.", 400);
  }

  return { parentId, studentId };
}

export function createAdminService(
  repository: QuestRepository = createQuestRepository(),
) {
  return {
    async linkParentStudents(
      user: Session,
      input: Array<{ parentId: string; studentId: string }>,
    ) {
      assertAdmin(user);

      const createdLinks = [] as ParentStudentLink[];

      try {
        await repository.transaction(async (transaction) => {
          for (const link of input) {
            const [parent, student, duplicate] = await Promise.all([
              transaction.getUserById(link.parentId),
              transaction.getUserById(link.studentId),
              transaction.isParentOf(link.parentId, link.studentId),
            ]);

            if (!parent || parent.role !== "parent") {
              throw new AdminServiceError(
                "Parent user must exist with role parent.",
                422,
              );
            }

            if (!student || student.role !== "student") {
              throw new AdminServiceError(
                "Student user must exist with role student.",
                422,
              );
            }

            if (duplicate) {
              throw new AdminServiceError(
                "Parent-student link already exists.",
                409,
              );
            }

            const created = await transaction.linkParentToStudent(
              link.parentId,
              link.studentId,
            );
            createdLinks.push(created);
            await transaction.logAuditEvent({
              actorUserId: user.sub,
              action: "parent_student_link_created",
              entityType: "parent_student_link",
              entityId: created.linkId,
              payload: created,
            });
          }
        });
      } catch (error) {
        await repository.logAuditEvent({
          actorUserId: user.sub,
          action: "parent_student_link_create_failed",
          entityType: "parent_student_link",
          entityId: input
            .map((link) => `${link.parentId}:${link.studentId}`)
            .join(","),
          payload: {
            links: input,
            reason: error instanceof Error ? error.message : "Unknown error",
          },
        });

        throw error;
      }

      return createParentStudentLinksResponseSchema.parse({
        links: createdLinks,
      });
    },

    async unlinkParentStudent(user: Session, linkId: string) {
      assertAdmin(user);
      const { parentId, studentId } = parseLinkId(linkId);

      try {
        const removed = await repository.unlinkParentFromStudent(
          parentId,
          studentId,
        );

        if (!removed) {
          throw new AdminServiceError("Parent-student link not found.", 404);
        }

        await repository.logAuditEvent({
          actorUserId: user.sub,
          action: "parent_student_link_deleted",
          entityType: "parent_student_link",
          entityId: linkId,
          payload: { parentId, studentId },
        });
      } catch (error) {
        await repository.logAuditEvent({
          actorUserId: user.sub,
          action: "parent_student_link_delete_failed",
          entityType: "parent_student_link",
          entityId: linkId,
          payload: {
            parentId,
            studentId,
            reason: error instanceof Error ? error.message : "Unknown error",
          },
        });

        throw error;
      }
    },

    parseLinkId,
  };
}
