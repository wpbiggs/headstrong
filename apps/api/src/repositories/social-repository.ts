import type {
  DiscoveryPost,
  Guild,
  Reaction,
  Report,
  Session,
} from "@headstrong/core";
import {
  discoveryFeedItemSchema,
  discoveryPostSchema,
  guildFeedRuleSchema,
  guildMembershipSchema,
  guildSchema,
  parentApprovalQueueItemSchema,
  postDetailSchema,
  reactionSchema,
  reportSchema,
} from "@headstrong/core";
import type { DatabaseClient } from "../db";
import { sql } from "../db";

export interface CreateDiscoveryPostInput {
  authorUserId: string;
  authorRole: Session["role"];
  guildId: string | null;
  title: string;
  body: string;
  tags: Array<{ slug: string; label: string }>;
  visibility: "internal";
  state: DiscoveryPost["state"];
  moderationState: DiscoveryPost["moderationState"];
  moderation: DiscoveryPost["moderation"];
  requiresParentApproval: boolean;
}

export interface ListFeedInput {
  viewerUserId: string;
  cursor?: string;
  limit: number;
  topic?: string;
  includeOwnPending?: boolean;
}

function encodeCursor(timestamp: string, id: string) {
  return Buffer.from(`${timestamp}|${id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor?: string) {
  if (!cursor) {
    return null;
  }

  const [timestamp, id] = Buffer.from(cursor, "base64url")
    .toString("utf8")
    .split("|");
  if (!timestamp || !id) {
    throw new Error("Invalid cursor.");
  }

  return { timestamp, id };
}

function toPost(row: Record<string, unknown>) {
  const body = String(row.body);
  return discoveryPostSchema.parse({
    id: row.id,
    authorUserId: row.author_user_id,
    authorRole: row.author_role,
    title: row.title,
    body,
    excerpt: body.length > 280 ? `${body.slice(0, 277)}...` : body,
    tags: row.tags,
    visibility: row.visibility,
    state: row.state,
    moderationState: row.moderation_state,
    moderation: row.moderation,
    requiresParentApproval: row.requires_parent_approval,
    parentApprovedAt: row.parent_approved_at
      ? new Date(String(row.parent_approved_at)).toISOString()
      : null,
    parentRejectedAt: row.parent_rejected_at
      ? new Date(String(row.parent_rejected_at)).toISOString()
      : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  });
}

function toGuild(row: Record<string, unknown> | null) {
  if (!row || !row.guild_id) {
    return null;
  }

  return guildSchema.parse({
    id: row.guild_id,
    name: row.guild_name,
    description: row.guild_description,
    slug: row.guild_slug,
    createdByUserId: row.guild_created_by_user_id,
    createdAt: new Date(String(row.guild_created_at)).toISOString(),
  });
}

function toDetail(row: Record<string, unknown>) {
  return postDetailSchema.parse({
    post: toPost(row),
    reactionCounts: row.reaction_counts ?? {},
    guild: toGuild(row),
    reportsCount: Number(row.reports_count ?? 0),
  });
}

export interface SocialRepository {
  createDiscoveryPost(input: CreateDiscoveryPostInput): Promise<DiscoveryPost>;
  getPostById(id: string): Promise<DiscoveryPost | null>;
  getPostDetailById(
    id: string,
  ): Promise<ReturnType<typeof postDetailSchema.parse> | null>;
  listFeed(input: ListFeedInput): Promise<{
    items: Array<ReturnType<typeof discoveryFeedItemSchema.parse>>;
    nextCursor: string | null;
  }>;
  listPostsForParentApproval(
    parentId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{
    items: Array<ReturnType<typeof parentApprovalQueueItemSchema.parse>>;
    nextCursor: string | null;
  }>;
  updatePostParentApproval(
    postId: string,
    nextState: "live" | "rejected",
  ): Promise<DiscoveryPost | null>;
  updatePostState(
    postId: string,
    fromState: DiscoveryPost["state"],
    toState: DiscoveryPost["state"],
  ): Promise<DiscoveryPost | null>;
  listModerationPosts(input: {
    cursor?: string;
    limit: number;
    state?: "warn" | "block" | "reported";
    reported?: boolean;
  }): Promise<{
    items: Array<ReturnType<typeof postDetailSchema.parse>>;
    nextCursor: string | null;
  }>;
  addReaction(
    postId: string,
    userId: string,
    reactionType: Reaction["reactionType"],
  ): Promise<Reaction>;
  addReport(
    postId: string,
    reportedByUserId: string,
    reason: Report["reason"],
    details?: string,
  ): Promise<Report>;
  createGuild(input: {
    name: string;
    description: string;
    slug: string;
    createdByUserId: string;
  }): Promise<Guild>;
  addGuildMembership(
    guildId: string,
    userId: string,
    status: "approved" | "pending",
  ): Promise<unknown>;
  removeGuildMembership(guildId: string, userId: string): Promise<boolean>;
  isGuildMember(guildId: string, userId: string): Promise<boolean>;
  getGuildById(guildId: string): Promise<Guild | null>;
  listGuildPosts(
    guildId: string,
    viewerUserId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{
    items: Array<ReturnType<typeof discoveryFeedItemSchema.parse>>;
    nextCursor: string | null;
    rule: typeof guildFeedRuleSchema.value;
  }>;
  logAuditEvent(input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

function buildFeedItems(rows: Array<Record<string, unknown>>) {
  return rows.map((row) =>
    discoveryFeedItemSchema.parse({
      post: toPost(row),
      reactionCounts: row.reaction_counts ?? {},
      viewerReaction: row.viewer_reaction ?? null,
      guild: toGuild(row),
    }),
  );
}

export function createSocialRepository(
  client: DatabaseClient = sql,
): SocialRepository {
  return {
    async createDiscoveryPost(input) {
      const [row] = await client`
        insert into discovery_posts (
          author_user_id,
          author_role,
          guild_id,
          title,
          body,
          tags,
          visibility,
          state,
          moderation_state,
          moderation,
          requires_parent_approval
        ) values (
          ${input.authorUserId},
          ${input.authorRole},
          ${input.guildId},
          ${input.title},
          ${input.body},
          ${JSON.stringify(input.tags)}::jsonb,
          ${input.visibility},
          ${input.state},
          ${input.moderationState},
          ${JSON.stringify(input.moderation)}::jsonb,
          ${input.requiresParentApproval}
        ) returning *
      `;
      return toPost(row);
    },

    async getPostById(id) {
      const [row] =
        await client`select * from discovery_posts where id = ${id}`;
      return row ? toPost(row) : null;
    },

    async getPostDetailById(id) {
      const [row] = await client`
        select
          discovery_posts.*,
          guilds.id as guild_id,
          guilds.name as guild_name,
          guilds.description as guild_description,
          guilds.slug as guild_slug,
          guilds.created_by_user_id as guild_created_by_user_id,
          guilds.created_at as guild_created_at,
          coalesce(
            (select jsonb_object_agg(reaction_type, count)
             from (
               select reaction_type, count(*) as count
               from discovery_reactions
               where post_id = discovery_posts.id
               group by reaction_type
             ) counts),
            '{}'::jsonb
          ) as reaction_counts,
          (select count(*) from discovery_reports where post_id = discovery_posts.id) as reports_count
        from discovery_posts
        left join guilds on guilds.id = discovery_posts.guild_id
        where discovery_posts.id = ${id}
      `;
      return row ? toDetail(row) : null;
    },

    async listFeed(input) {
      const cursor = decodeCursor(input.cursor);
      const cursorFilter = cursor
        ? client`and (discovery_posts.created_at, discovery_posts.id) < (${cursor.timestamp}::timestamptz, ${cursor.id}::uuid)`
        : client``;
      const topicFilter = input.topic
        ? client`and discovery_posts.tags @> ${JSON.stringify([{ slug: input.topic, label: input.topic }])}::jsonb`
        : client``;
      const visibilityFilter = input.includeOwnPending
        ? client`and (discovery_posts.state = 'live' or (discovery_posts.state = 'pending_parent_approval' and discovery_posts.author_user_id = ${input.viewerUserId}))`
        : client`and discovery_posts.state = 'live'`;

      const rows = await client`
        select
          discovery_posts.*,
          guilds.id as guild_id,
          guilds.name as guild_name,
          guilds.description as guild_description,
          guilds.slug as guild_slug,
          guilds.created_by_user_id as guild_created_by_user_id,
          guilds.created_at as guild_created_at,
          coalesce(
            (select jsonb_object_agg(reaction_type, count)
             from (
               select reaction_type, count(*) as count
               from discovery_reactions
               where post_id = discovery_posts.id
               group by reaction_type
             ) counts),
            '{}'::jsonb
          ) as reaction_counts,
          (
            select reaction_type
            from discovery_reactions
            where post_id = discovery_posts.id and user_id = ${input.viewerUserId}
            order by created_at desc
            limit 1
          ) as viewer_reaction
        from discovery_posts
        left join guilds on guilds.id = discovery_posts.guild_id
        where true
        ${visibilityFilter}
        ${topicFilter}
        ${cursorFilter}
        order by discovery_posts.created_at desc, discovery_posts.id desc
        limit ${input.limit + 1}
      `;

      const hasMore = rows.length > input.limit;
      const sliced = rows.slice(0, input.limit);
      const lastRow = sliced.at(-1);
      return {
        items: buildFeedItems(sliced),
        nextCursor:
          hasMore && lastRow
            ? encodeCursor(
                new Date(String(lastRow.created_at)).toISOString(),
                String(lastRow.id),
              )
            : null,
      };
    },

    async listPostsForParentApproval(parentId, cursor, limit = 20) {
      const decoded = decodeCursor(cursor);
      const cursorFilter = decoded
        ? client`and (discovery_posts.created_at, discovery_posts.id) < (${decoded.timestamp}::timestamptz, ${decoded.id}::uuid)`
        : client``;

      const rows = await client`
        select discovery_posts.*
        from discovery_posts
        inner join parent_student_links on parent_student_links.student_id = discovery_posts.author_user_id
        where parent_student_links.parent_id = ${parentId}
          and discovery_posts.author_role = 'student'
          and discovery_posts.state = 'pending_parent_approval'
          ${cursorFilter}
        order by discovery_posts.created_at desc, discovery_posts.id desc
        limit ${limit + 1}
      `;

      const hasMore = rows.length > limit;
      const sliced = rows.slice(0, limit);
      const lastRow = sliced.at(-1);

      return {
        items: sliced.map((row) =>
          parentApprovalQueueItemSchema.parse({
            post: toPost(row),
            authorStudentId: row.author_user_id,
          }),
        ),
        nextCursor:
          hasMore && lastRow
            ? encodeCursor(
                new Date(String(lastRow.created_at)).toISOString(),
                String(lastRow.id),
              )
            : null,
      };
    },

    async updatePostParentApproval(postId, nextState) {
      const [row] = await client`
        update discovery_posts
        set
          state = ${nextState},
          parent_approved_at = case when ${nextState} = 'live' then now() else parent_approved_at end,
          parent_rejected_at = case when ${nextState} = 'rejected' then now() else parent_rejected_at end,
          updated_at = now()
        where id = ${postId}
          and state = 'pending_parent_approval'
        returning *
      `;
      return row ? toPost(row) : null;
    },

    async updatePostState(postId, fromState, toState) {
      const [row] = await client`
        update discovery_posts
        set state = ${toState}, updated_at = now()
        where id = ${postId} and state = ${fromState}
        returning *
      `;
      return row ? toPost(row) : null;
    },

    async listModerationPosts(input) {
      const decoded = decodeCursor(input.cursor);
      const cursorFilter = decoded
        ? client`and (discovery_posts.created_at, discovery_posts.id) < (${decoded.timestamp}::timestamptz, ${decoded.id}::uuid)`
        : client``;
      const stateFilter = input.state
        ? input.state === "reported"
          ? client`and exists (select 1 from discovery_reports where discovery_reports.post_id = discovery_posts.id)`
          : client`and discovery_posts.moderation_state = ${input.state}`
        : client``;
      const reportedFilter = input.reported
        ? client`and exists (select 1 from discovery_reports where discovery_reports.post_id = discovery_posts.id)`
        : client``;

      const rows = await client`
        select
          discovery_posts.*,
          guilds.id as guild_id,
          guilds.name as guild_name,
          guilds.description as guild_description,
          guilds.slug as guild_slug,
          guilds.created_by_user_id as guild_created_by_user_id,
          guilds.created_at as guild_created_at,
          coalesce(
            (select jsonb_object_agg(reaction_type, count)
             from (
               select reaction_type, count(*) as count
               from discovery_reactions
               where post_id = discovery_posts.id
               group by reaction_type
             ) counts),
            '{}'::jsonb
          ) as reaction_counts,
          (select count(*) from discovery_reports where post_id = discovery_posts.id) as reports_count
        from discovery_posts
        left join guilds on guilds.id = discovery_posts.guild_id
        where discovery_posts.state in ('pending_parent_approval', 'live', 'rejected', 'removed')
          ${stateFilter}
          ${reportedFilter}
          ${cursorFilter}
        order by discovery_posts.created_at desc, discovery_posts.id desc
        limit ${input.limit + 1}
      `;

      const hasMore = rows.length > input.limit;
      const sliced = rows.slice(0, input.limit);
      const lastRow = sliced.at(-1);
      return {
        items: sliced.map(toDetail),
        nextCursor:
          hasMore && lastRow
            ? encodeCursor(
                new Date(String(lastRow.created_at)).toISOString(),
                String(lastRow.id),
              )
            : null,
      };
    },

    async addReaction(postId, userId, reactionType) {
      const [row] = await client`
        insert into discovery_reactions (post_id, user_id, reaction_type)
        values (${postId}, ${userId}, ${reactionType})
        on conflict (post_id, user_id, reaction_type) do update set reaction_type = excluded.reaction_type
        returning *
      `;
      return reactionSchema.parse({
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        reactionType: row.reaction_type,
        createdAt: new Date(String(row.created_at)).toISOString(),
      });
    },

    async addReport(postId, reportedByUserId, reason, details) {
      const [row] = await client`
        insert into discovery_reports (post_id, reported_by_user_id, reason, details)
        values (${postId}, ${reportedByUserId}, ${reason}, ${details ?? null})
        returning *
      `;
      return reportSchema.parse({
        id: row.id,
        postId: row.post_id,
        reportedByUserId: row.reported_by_user_id,
        reason: row.reason,
        details: row.details ?? undefined,
        createdAt: new Date(String(row.created_at)).toISOString(),
      });
    },

    async createGuild(input) {
      const [row] = await client`
        insert into guilds (name, description, slug, created_by_user_id)
        values (${input.name}, ${input.description}, ${input.slug}, ${input.createdByUserId})
        returning *
      `;
      return guildSchema.parse({
        id: row.id,
        name: row.name,
        description: row.description,
        slug: row.slug,
        createdByUserId: row.created_by_user_id,
        createdAt: new Date(String(row.created_at)).toISOString(),
      });
    },

    async addGuildMembership(guildId, userId, status) {
      const [row] = await client`
        insert into guild_memberships (guild_id, user_id, status)
        values (${guildId}, ${userId}, ${status})
        on conflict (guild_id, user_id) do update set status = excluded.status
        returning *
      `;
      return guildMembershipSchema.parse({
        id: row.id,
        guildId: row.guild_id,
        userId: row.user_id,
        status: row.status,
        createdAt: new Date(String(row.created_at)).toISOString(),
      });
    },

    async removeGuildMembership(guildId, userId) {
      const rows = await client`
        delete from guild_memberships
        where guild_id = ${guildId} and user_id = ${userId}
        returning id
      `;
      return rows.length > 0;
    },

    async isGuildMember(guildId, userId) {
      const [row] = await client`
        select 1
        from guild_memberships
        where guild_id = ${guildId} and user_id = ${userId} and status = 'approved'
      `;
      return Boolean(row);
    },

    async getGuildById(guildId) {
      const [row] = await client`select * from guilds where id = ${guildId}`;
      return row
        ? guildSchema.parse({
            id: row.id,
            name: row.name,
            description: row.description,
            slug: row.slug,
            createdByUserId: row.created_by_user_id,
            createdAt: new Date(String(row.created_at)).toISOString(),
          })
        : null;
    },

    async listGuildPosts(guildId, viewerUserId, cursor, limit = 20) {
      const decoded = decodeCursor(cursor);
      const cursorFilter = decoded
        ? client`and (discovery_posts.created_at, discovery_posts.id) < (${decoded.timestamp}::timestamptz, ${decoded.id}::uuid)`
        : client``;
      const rows = await client`
        select
          discovery_posts.*,
          guilds.id as guild_id,
          guilds.name as guild_name,
          guilds.description as guild_description,
          guilds.slug as guild_slug,
          guilds.created_by_user_id as guild_created_by_user_id,
          guilds.created_at as guild_created_at,
          coalesce(
            (select jsonb_object_agg(reaction_type, count)
             from (
               select reaction_type, count(*) as count
               from discovery_reactions
               where post_id = discovery_posts.id
               group by reaction_type
             ) counts),
            '{}'::jsonb
          ) as reaction_counts,
          (
            select reaction_type
            from discovery_reactions
            where post_id = discovery_posts.id and user_id = ${viewerUserId}
            order by created_at desc
            limit 1
          ) as viewer_reaction
        from guild_memberships
        inner join discovery_posts on discovery_posts.guild_id = guild_memberships.guild_id
        left join guilds on guilds.id = discovery_posts.guild_id
        where guild_memberships.guild_id = ${guildId}
          and guild_memberships.status = 'approved'
          and discovery_posts.state = 'live'
          ${cursorFilter}
        group by discovery_posts.id, guilds.id, guild_memberships.id
        order by discovery_posts.created_at desc, discovery_posts.id desc
        limit ${limit + 1}
      `;
      const hasMore = rows.length > limit;
      const sliced = rows.slice(0, limit);
      const lastRow = sliced.at(-1);
      return {
        items: buildFeedItems(sliced),
        nextCursor:
          hasMore && lastRow
            ? encodeCursor(
                new Date(String(lastRow.created_at)).toISOString(),
                String(lastRow.id),
              )
            : null,
        rule: guildFeedRuleSchema.value,
      };
    },

    async logAuditEvent(input) {
      await client`
        insert into audit_events (actor_user_id, action, entity_type, entity_id, payload)
        values (${input.actorUserId}, ${input.action}, ${input.entityType}, ${input.entityId}, ${JSON.stringify(input.payload)}::jsonb)
      `;
    },
  };
}
