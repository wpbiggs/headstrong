import type {
  ComposeQuestResponse,
  MasterySignal,
  ParentStudentLink,
  Quest,
  QuestEvent,
  QuestEventType,
  QuestState,
  QuestTask,
  Role,
} from "@headstrong/core";
import {
  questDashboardDetailSchema,
  questDashboardItemSchema,
  questEventSchema,
  questSchema,
  questTaskSchema,
} from "@headstrong/core";
import type { DatabaseClient } from "../db";
import { sql } from "../db";

export interface DbUser {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface CreateQuestRecordInput {
  id: string;
  studentId: string;
  name: string;
  summary: string;
  moderation: ComposeQuestResponse["moderation"];
  needsEducatorReview: boolean;
  currentState: QuestState;
  parentId: string;
  educatorId: string | null;
}

export interface CreateQuestTaskRecordInput {
  questId: string;
  title: string;
  kind: "lesson" | "exercise" | "scene";
  summary: string;
  contentRef: string;
  templateId: string;
  scenePlan: ComposeQuestResponse["scenePlan"];
  position: number;
  estimatedMinutes: number;
}

export interface CreateQuestEventRecordInput {
  questId: string;
  type: QuestEventType;
  performedByUserId: string;
  performedByRole: Role;
  metadata: Record<string, unknown>;
}

function toLinkId(parentId: string, studentId: string) {
  return `${parentId}:${studentId}`;
}

function mapParentStudentLinkRow(row: Record<string, unknown>) {
  return {
    linkId: toLinkId(String(row.parent_id), String(row.student_id)),
    parentId: String(row.parent_id),
    studentId: String(row.student_id),
    createdAt: new Date(String(row.created_at)).toISOString(),
  } satisfies ParentStudentLink;
}

function mapQuestRow(row: Record<string, unknown>) {
  return questSchema.parse({
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    summary: row.summary,
    moderation: row.moderation,
    needsEducatorReview: row.needs_educator_review,
    currentState: row.current_state,
    parentId: row.parent_id,
    educatorId: row.educator_id,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  });
}

function mapQuestEventRow(row: Record<string, unknown>) {
  return questEventSchema.parse({
    id: row.id,
    questId: row.quest_id,
    type: row.type,
    performedByUserId: row.performed_by_user_id,
    performedByRole: row.performed_by_role,
    metadata: row.metadata ?? {},
    createdAt: new Date(String(row.created_at)).toISOString(),
  });
}

function mapQuestTaskRow(row: Record<string, unknown>) {
  return questTaskSchema.parse({
    id: row.id,
    questId: row.quest_id,
    title: row.title,
    kind: row.kind,
    summary: row.summary,
    contentRef: row.content_ref,
    templateId: row.template_id,
    scenePlan: row.scene_plan,
    position: row.position,
    estimatedMinutes: row.estimated_minutes,
    createdAt: new Date(String(row.created_at)).toISOString(),
  });
}

function mapQuestDashboardItemRow(row: Record<string, unknown>) {
  return questDashboardItemSchema.parse({
    quest: {
      id: row.id,
      studentId: row.student_id,
      parentId: row.parent_id,
      name: row.name,
      summary: row.summary,
      moderation: row.moderation,
      needsEducatorReview: row.needs_educator_review,
    },
    currentState: row.current_state,
    lastUpdated: new Date(String(row.updated_at)).toISOString(),
    assignedEducator: row.educator_id
      ? {
          id: String(row.educator_id),
          email: String(row.educator_email),
        }
      : null,
  });
}

function mapQuestDashboardDetailRow(
  questRow: Record<string, unknown>,
  taskRows: Record<string, unknown>[],
) {
  const item = mapQuestDashboardItemRow(questRow);

  return questDashboardDetailSchema.parse({
    ...item,
    createdAt: new Date(String(questRow.created_at)).toISOString(),
    tasks: taskRows.map((row) => ({
      id: row.id,
      title: row.title,
      kind: row.kind,
      summary: row.summary,
      contentRef: row.content_ref,
      templateId: row.template_id,
      scenePlan: row.scene_plan,
      position: row.position,
      estimatedMinutes: row.estimated_minutes,
    })),
  });
}

export interface ListQuestDashboardItemsInput {
  actorUserId: string;
  role: "parent" | "educator" | "admin";
  state?: QuestState;
  cursor?: string;
  limit: number;
}

export interface QuestListResult {
  items: Array<ReturnType<typeof questDashboardItemSchema.parse>>;
  nextCursor: string | null;
}

function decodeCursor(cursor?: string) {
  if (!cursor) {
    return null;
  }

  const [timestamp, questId] = Buffer.from(cursor, "base64url")
    .toString("utf8")
    .split("|");

  if (!timestamp || !questId) {
    throw new Error("Invalid cursor.");
  }

  return { timestamp, questId };
}

function encodeCursor(updatedAt: string, questId: string) {
  return Buffer.from(`${updatedAt}|${questId}`, "utf8").toString("base64url");
}

export interface QuestRepository {
  transaction<T>(
    callback: (repository: QuestRepository) => Promise<T>,
  ): Promise<T>;
  findUserByEmail(email: string): Promise<DbUser | null>;
  createUser(email: string, role: Role): Promise<DbUser>;
  getUserById(id: string): Promise<DbUser | null>;
  isParentOf(parentId: string, studentId: string): Promise<boolean>;
  linkParentToStudent(
    parentId: string,
    studentId: string,
  ): Promise<ParentStudentLink>;
  unlinkParentFromStudent(
    parentId: string,
    studentId: string,
  ): Promise<boolean>;
  listParentLinks(parentId: string): Promise<ParentStudentLink[]>;
  listStudentParents(studentId: string): Promise<ParentStudentLink[]>;
  getQuestDashboardItemById(
    questId: string,
  ): Promise<ReturnType<typeof questDashboardItemSchema.parse> | null>;
  getQuestDashboardDetailById(
    questId: string,
  ): Promise<ReturnType<typeof questDashboardDetailSchema.parse> | null>;
  listQuestDashboardItems(
    input: ListQuestDashboardItemsInput,
  ): Promise<QuestListResult>;
  updateQuestReviewFlag(
    questId: string,
    needsEducatorReview: boolean,
  ): Promise<Quest>;
  createQuest(input: CreateQuestRecordInput): Promise<Quest>;
  insertQuestTasks(input: CreateQuestTaskRecordInput[]): Promise<QuestTask[]>;
  insertQuestEvent(input: CreateQuestEventRecordInput): Promise<QuestEvent>;
  updateQuestState(questId: string, nextState: QuestState): Promise<Quest>;
  getQuestById(questId: string): Promise<Quest | null>;
  getQuestEvents(questId: string): Promise<QuestEvent[]>;
  getQuestTasks(questId: string): Promise<QuestTask[]>;
  getMasterySignal(
    learnerId: string,
    skillId: string,
  ): Promise<MasterySignal | null>;
  upsertMasterySignal(input: {
    learnerId: string;
    skillId: string;
    score: number;
    evidenceCount: number;
  }): Promise<MasterySignal>;
  createLmsSyncEvent(input: {
    provider: "moodle" | "erpnext" | "gibbon";
    questId: string | null;
    learnerId: string | null;
    assignmentExternalId: string | null;
    idempotencyKey: string;
    payload: Record<string, unknown>;
  }): Promise<boolean>;
  logAuditEvent(input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

function toUser(row: Record<string, unknown>): DbUser {
  return {
    id: String(row.id),
    email: String(row.email),
    role: row.role as Role,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export function createQuestRepository(
  client: DatabaseClient = sql,
): QuestRepository {
  return {
    async transaction<T>(
      callback: (repository: QuestRepository) => Promise<T>,
    ) {
      return client.begin(async (transactionClient): Promise<T> => {
        const repository = createQuestRepository(
          transactionClient as unknown as DatabaseClient,
        );
        return callback(repository);
      }) as Promise<T>;
    },

    async findUserByEmail(email) {
      const [row] = await client`
        select id, email, role, created_at
        from users
        where email = ${email}
      `;

      return row ? toUser(row) : null;
    },

    async createUser(email, role) {
      const [row] = await client`
        insert into users (email, role)
        values (${email}, ${role})
        returning id, email, role, created_at
      `;

      return toUser(row);
    },

    async getUserById(id) {
      const [row] = await client`
        select id, email, role, created_at
        from users
        where id = ${id}
      `;

      return row ? toUser(row) : null;
    },

    async isParentOf(parentId, studentId) {
      const [row] = await client`
        select 1
        from parent_student_links
        where parent_id = ${parentId} and student_id = ${studentId}
      `;

      return Boolean(row);
    },

    async linkParentToStudent(parentId, studentId) {
      const [row] = await client`
        insert into parent_student_links (parent_id, student_id)
        values (${parentId}, ${studentId})
        returning parent_id, student_id, created_at
      `;

      return mapParentStudentLinkRow(row);
    },

    async unlinkParentFromStudent(parentId, studentId) {
      const rows = await client`
        delete from parent_student_links
        where parent_id = ${parentId} and student_id = ${studentId}
        returning parent_id
      `;

      return rows.length > 0;
    },

    async listParentLinks(parentId) {
      const rows = await client`
        select parent_id, student_id, created_at
        from parent_student_links
        where parent_id = ${parentId}
        order by created_at asc
      `;

      return rows.map(mapParentStudentLinkRow);
    },

    async listStudentParents(studentId) {
      const rows = await client`
        select parent_id, student_id, created_at
        from parent_student_links
        where student_id = ${studentId}
        order by created_at asc
      `;

      return rows.map(mapParentStudentLinkRow);
    },

    async getQuestDashboardItemById(questId) {
      const [row] = await client`
        select quests.*, educator.email as educator_email
        from quests
        left join users as educator on educator.id = quests.educator_id
        where quests.id = ${questId}
      `;

      return row ? mapQuestDashboardItemRow(row) : null;
    },

    async getQuestDashboardDetailById(questId) {
      const [questRow, taskRows] = await Promise.all([
        client`
          select quests.*, educator.email as educator_email
          from quests
          left join users as educator on educator.id = quests.educator_id
          where quests.id = ${questId}
        `,
        client`
          select id, title, kind, summary, content_ref, template_id, scene_plan, position, estimated_minutes
          from quest_tasks
          where quest_id = ${questId}
          order by position asc, created_at asc
        `,
      ]);

      return questRow[0]
        ? mapQuestDashboardDetailRow(questRow[0], taskRows)
        : null;
    },

    async listQuestDashboardItems(input) {
      const cursor = decodeCursor(input.cursor);
      const cursorFilter = cursor
        ? client`and (quests.updated_at, quests.id) < (${cursor.timestamp}::timestamptz, ${cursor.questId}::uuid)`
        : client``;
      const stateFilter = input.state
        ? client`and quests.current_state = ${input.state}`
        : client``;

      let rows: Array<Record<string, unknown>> = [];

      if (input.role === "parent") {
        rows = await client`
          select quests.*, educator.email as educator_email
          from quests
          inner join parent_student_links on parent_student_links.student_id = quests.student_id
          left join users as educator on educator.id = quests.educator_id
          where parent_student_links.parent_id = ${input.actorUserId}
          ${stateFilter}
          ${cursorFilter}
          order by quests.updated_at desc, quests.id desc
          limit ${input.limit + 1}
        `;
      } else if (input.role === "educator") {
        rows = await client`
          select quests.*, educator.email as educator_email
          from quests
          left join users as educator on educator.id = quests.educator_id
          where (
            quests.educator_id = ${input.actorUserId}
            or (
              quests.needs_educator_review = true
              and quests.current_state in ('draft', 'awaiting_approval', 'live', 'completed', 'rejected')
            )
            or (
              quests.current_state = 'awaiting_approval'
              and (quests.educator_id is null or quests.educator_id = ${input.actorUserId})
            )
          )
          ${stateFilter}
          ${cursorFilter}
          order by quests.updated_at desc, quests.id desc
          limit ${input.limit + 1}
        `;
      } else {
        rows = await client`
          select quests.*, educator.email as educator_email
          from quests
          left join users as educator on educator.id = quests.educator_id
          where true
          ${stateFilter}
          ${cursorFilter}
          order by quests.updated_at desc, quests.id desc
          limit ${input.limit + 1}
        `;
      }

      const hasMore = rows.length > input.limit;
      const sliced = rows.slice(0, input.limit);
      const items = sliced.map(mapQuestDashboardItemRow);
      const lastRow = sliced.at(-1);

      return {
        items,
        nextCursor:
          hasMore && lastRow
            ? encodeCursor(
                new Date(String(lastRow.updated_at)).toISOString(),
                String(lastRow.id),
              )
            : null,
      };
    },

    async createQuest(input) {
      const [row] = await client`
        insert into quests (
          id,
          student_id,
          name,
          summary,
          moderation,
          needs_educator_review,
          current_state,
          parent_id,
          educator_id
        )
        values (
          ${input.id},
          ${input.studentId},
          ${input.name},
          ${input.summary},
          ${JSON.stringify(input.moderation)}::jsonb,
          ${input.needsEducatorReview},
          ${input.currentState},
          ${input.parentId},
          ${input.educatorId}
        )
        returning *
      `;

      return mapQuestRow(row);
    },

    async insertQuestTasks(tasks) {
      if (tasks.length === 0) {
        return [];
      }

      const rows = [] as QuestTask[];

      for (const task of tasks) {
        const [row] = await client`
          insert into quest_tasks (
            quest_id,
            title,
            kind,
            summary,
            content_ref,
            template_id,
            scene_plan,
            position,
            estimated_minutes
          )
          values (
            ${task.questId},
            ${task.title},
            ${task.kind},
            ${task.summary},
            ${task.contentRef},
            ${task.templateId},
            ${JSON.stringify(task.scenePlan)}::jsonb,
            ${task.position},
            ${task.estimatedMinutes}
          )
          returning *
        `;

        rows.push(mapQuestTaskRow(row));
      }

      return rows;
    },

    async insertQuestEvent(input) {
      const [row] = await client`
        insert into quest_events (
          quest_id,
          type,
          performed_by_user_id,
          performed_by_role,
          metadata
        )
        values (
          ${input.questId},
          ${input.type},
          ${input.performedByUserId},
          ${input.performedByRole},
          ${JSON.stringify(input.metadata)}::jsonb
        )
        returning *
      `;

      return mapQuestEventRow(row);
    },

    async updateQuestState(questId, nextState) {
      const [row] = await client`
        update quests
        set current_state = ${nextState}, updated_at = now()
        where id = ${questId}
        returning *
      `;

      return mapQuestRow(row);
    },

    async updateQuestReviewFlag(questId, needsEducatorReview) {
      const [row] = await client`
        update quests
        set needs_educator_review = ${needsEducatorReview}, updated_at = now()
        where id = ${questId}
        returning *
      `;

      return mapQuestRow(row);
    },

    async getQuestById(questId) {
      const [row] = await client`
        select *
        from quests
        where id = ${questId}
      `;

      return row ? mapQuestRow(row) : null;
    },

    async getQuestEvents(questId) {
      const rows = await client`
        select *
        from quest_events
        where quest_id = ${questId}
        order by created_at asc, id asc
      `;

      return rows.map(mapQuestEventRow);
    },

    async getQuestTasks(questId) {
      const rows = await client`
        select *
        from quest_tasks
        where quest_id = ${questId}
        order by position asc, created_at asc
      `;

      return rows.map(mapQuestTaskRow);
    },

    async getMasterySignal(learnerId, skillId) {
      const [row] = await client`
        select skill_id, learner_id, score, evidence_count
        from mastery_signals
        where learner_id = ${learnerId} and skill_id = ${skillId}
      `;
      return row
        ? {
            skillId: String(row.skill_id),
            score: Number(row.score),
            evidenceCount: Number(row.evidence_count),
          }
        : null;
    },

    async upsertMasterySignal(input) {
      const [row] = await client`
        insert into mastery_signals (skill_id, learner_id, score, evidence_count)
        values (${input.skillId}, ${input.learnerId}, ${input.score}, ${input.evidenceCount})
        on conflict (skill_id, learner_id)
        do update set score = excluded.score, evidence_count = excluded.evidence_count, updated_at = now()
        returning skill_id, learner_id, score, evidence_count
      `;
      return {
        skillId: String(row.skill_id),
        score: Number(row.score),
        evidenceCount: Number(row.evidence_count),
      };
    },

    async createLmsSyncEvent(input) {
      const rows = await client`
        insert into lms_sync_events (
          provider,
          quest_id,
          learner_id,
          assignment_external_id,
          idempotency_key,
          payload
        ) values (
          ${input.provider},
          ${input.questId},
          ${input.learnerId},
          ${input.assignmentExternalId},
          ${input.idempotencyKey},
          ${JSON.stringify(input.payload)}::jsonb
        ) on conflict (idempotency_key) do nothing
        returning id
      `;
      return rows.length > 0;
    },

    async logAuditEvent(input) {
      await client`
        insert into audit_events (actor_user_id, action, entity_type, entity_id, payload)
        values (
          ${input.actorUserId},
          ${input.action},
          ${input.entityType},
          ${input.entityId},
          ${JSON.stringify(input.payload)}::jsonb
        )
      `;
    },
  };
}
