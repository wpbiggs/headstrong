import {
  type DiscoveryPost,
  type Session,
  createDiscoveryPostRequestSchema,
  createGuildRequestSchema,
  createReactionRequestSchema,
  createReportRequestSchema,
  listDiscoveryFeedResponseSchema,
  listModerationPostsRequestSchema,
  listModerationPostsResponseSchema,
  listParentApprovalQueueResponseSchema,
  postActionRequestSchema,
} from "@headstrong/core";
import { moderateQuestDraft } from "@headstrong/moderation";
import { env } from "../env";
import { createQuestRepository } from "../repositories/app-repository";
import {
  type SocialRepository,
  createSocialRepository,
} from "../repositories/social-repository";

export class SocialServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function toTag(slug: string) {
  return {
    slug: slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-"),
    label: slug.trim(),
  };
}

function stateForModeration(moderation: DiscoveryPost["moderation"]) {
  return moderation.verdict === "warn"
    ? "warn"
    : moderation.verdict === "block"
      ? "block"
      : "pass";
}

function canViewPost(
  user: Session,
  post: DiscoveryPost,
  isParentLinked: boolean,
) {
  if (user.role === "admin" || user.role === "educator") {
    return true;
  }
  if (user.role === "student") {
    return post.authorUserId === user.sub;
  }
  if (user.role === "parent") {
    return isParentLinked || post.authorUserId === user.sub;
  }
  return false;
}

export function createSocialService(
  repository: SocialRepository = createSocialRepository(),
  dependencies: {
    isParentOf: (parentId: string, studentId: string) => Promise<boolean>;
  } = {
    isParentOf: createQuestRepository().isParentOf,
  },
) {
  return {
    async createPost(user: Session, input: unknown) {
      const parsed = createDiscoveryPostRequestSchema.parse(input);
      const moderation = moderateQuestDraft(parsed.title, parsed.body);

      if (moderation.verdict === "block") {
        await repository.logAuditEvent({
          actorUserId: user.sub,
          action: "discovery_post_blocked",
          entityType: "discovery_post",
          entityId: user.sub,
          payload: { title: parsed.title, moderation },
        });
        throw new SocialServiceError("Post blocked by moderation.", 422);
      }

      const requiresParentApproval =
        user.role === "student" &&
        env.REQUIRE_PARENT_APPROVAL_FOR_STUDENT_POSTS;
      const post = await repository.createDiscoveryPost({
        authorUserId: user.sub,
        authorRole: user.role,
        guildId: parsed.guildId ?? null,
        title: parsed.title,
        body: parsed.body,
        tags: parsed.tags.map(toTag),
        visibility: "internal",
        state: requiresParentApproval ? "pending_parent_approval" : "live",
        moderationState: stateForModeration(moderation),
        moderation,
        requiresParentApproval,
      });

      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "discovery_post_created",
        entityType: "discovery_post",
        entityId: post.id,
        payload: { moderation, requiresParentApproval, state: post.state },
      });

      return post;
    },

    async listFeed(user: Session, cursor?: string, limit = 20, topic?: string) {
      return listDiscoveryFeedResponseSchema.parse(
        await repository.listFeed({
          viewerUserId: user.sub,
          cursor,
          limit,
          topic,
          includeOwnPending: user.role === "student",
        }),
      );
    },

    async listParentApprovalQueue(user: Session, cursor?: string, limit = 20) {
      if (!["parent", "admin"].includes(user.role)) {
        await repository.logAuditEvent({
          actorUserId: user.sub,
          action: "parent_approval_queue_forbidden",
          entityType: "discovery_post",
          entityId: user.sub,
          payload: { role: user.role },
        });
        throw new SocialServiceError("Forbidden.", 403);
      }

      return listParentApprovalQueueResponseSchema.parse(
        await repository.listPostsForParentApproval(user.sub, cursor, limit),
      );
    },

    async approveParent(user: Session, postId: string, input: unknown) {
      const parsed = postActionRequestSchema.parse(input);
      const post = await repository.getPostById(postId);
      if (!post) {
        throw new SocialServiceError("Post not found.", 404);
      }
      const allowed =
        user.role === "admin" ||
        (user.role === "parent" &&
          (await dependencies.isParentOf(user.sub, post.authorUserId)));
      if (!allowed) {
        await repository.logAuditEvent({
          actorUserId: user.sub,
          action: "post_parent_approve_forbidden",
          entityType: "discovery_post",
          entityId: postId,
          payload: parsed,
        });
        throw new SocialServiceError("Forbidden.", 403);
      }
      const updated = await repository.updatePostParentApproval(postId, "live");
      if (!updated) {
        throw new SocialServiceError(
          "Post is not awaiting parent approval.",
          409,
        );
      }
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "post_parent_approved",
        entityType: "discovery_post",
        entityId: postId,
        payload: {
          ...parsed,
          stateBefore: post.state,
          stateAfter: updated.state,
        },
      });
      return updated;
    },

    async rejectParent(user: Session, postId: string, input: unknown) {
      const parsed = postActionRequestSchema.parse(input);
      const post = await repository.getPostById(postId);
      if (!post) {
        throw new SocialServiceError("Post not found.", 404);
      }
      const allowed =
        user.role === "admin" ||
        (user.role === "parent" &&
          (await dependencies.isParentOf(user.sub, post.authorUserId)));
      if (!allowed) {
        await repository.logAuditEvent({
          actorUserId: user.sub,
          action: "post_parent_reject_forbidden",
          entityType: "discovery_post",
          entityId: postId,
          payload: parsed,
        });
        throw new SocialServiceError("Forbidden.", 403);
      }
      const updated = await repository.updatePostParentApproval(
        postId,
        "rejected",
      );
      if (!updated) {
        throw new SocialServiceError(
          "Post is not awaiting parent approval.",
          409,
        );
      }
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "post_parent_rejected",
        entityType: "discovery_post",
        entityId: postId,
        payload: {
          ...parsed,
          stateBefore: post.state,
          stateAfter: updated.state,
        },
      });
      return updated;
    },

    async getPostDetail(user: Session, postId: string) {
      const detail = await repository.getPostDetailById(postId);
      if (!detail) {
        throw new SocialServiceError("Post not found.", 404);
      }
      const linked = await dependencies.isParentOf(
        user.sub,
        detail.post.authorUserId,
      );
      if (!canViewPost(user, detail.post, linked)) {
        throw new SocialServiceError("Forbidden.", 403);
      }
      return detail;
    },

    async listModerationPosts(user: Session, input: unknown) {
      if (!["admin", "educator"].includes(user.role)) {
        throw new SocialServiceError("Forbidden.", 403);
      }
      const parsed = listModerationPostsRequestSchema.parse(input);
      return listModerationPostsResponseSchema.parse(
        await repository.listModerationPosts(parsed),
      );
    },

    async removePost(user: Session, postId: string, input: unknown) {
      if (!["admin", "educator"].includes(user.role)) {
        throw new SocialServiceError("Forbidden.", 403);
      }
      const parsed = postActionRequestSchema.parse(input);
      const post = await repository.getPostById(postId);
      if (!post) {
        throw new SocialServiceError("Post not found.", 404);
      }
      const updated = await repository.updatePostState(
        postId,
        post.state,
        "removed",
      );
      if (!updated) {
        throw new SocialServiceError("Post removal transition failed.", 409);
      }
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "post_removed",
        entityType: "discovery_post",
        entityId: postId,
        payload: {
          ...parsed,
          stateBefore: post.state,
          stateAfter: updated.state,
          role: user.role,
        },
      });
      return updated;
    },

    async restorePost(user: Session, postId: string, input: unknown) {
      if (!["admin", "educator"].includes(user.role)) {
        throw new SocialServiceError("Forbidden.", 403);
      }
      const parsed = postActionRequestSchema.parse(input);
      const post = await repository.getPostById(postId);
      if (!post) {
        throw new SocialServiceError("Post not found.", 404);
      }
      if (post.moderation.verdict === "block") {
        throw new SocialServiceError("Blocked posts cannot be restored.", 409);
      }
      const updated = await repository.updatePostState(
        postId,
        "removed",
        "live",
      );
      if (!updated) {
        throw new SocialServiceError("Post restore transition failed.", 409);
      }
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "post_restored",
        entityType: "discovery_post",
        entityId: postId,
        payload: {
          ...parsed,
          stateBefore: post.state,
          stateAfter: updated.state,
          role: user.role,
        },
      });
      return updated;
    },

    async react(user: Session, postId: string, input: unknown) {
      const parsed = createReactionRequestSchema.parse(input);
      const post = await repository.getPostById(postId);
      if (!post) throw new SocialServiceError("Post not found.", 404);
      const reaction = await repository.addReaction(
        postId,
        user.sub,
        parsed.reactionType,
      );
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "discovery_post_reacted",
        entityType: "discovery_post",
        entityId: postId,
        payload: parsed,
      });
      return reaction;
    },

    async report(user: Session, postId: string, input: unknown) {
      const parsed = createReportRequestSchema.parse(input);
      const post = await repository.getPostById(postId);
      if (!post) throw new SocialServiceError("Post not found.", 404);
      const report = await repository.addReport(
        postId,
        user.sub,
        parsed.reason,
        parsed.details,
      );
      if (post.moderationState !== "block") {
        await repository.logAuditEvent({
          actorUserId: user.sub,
          action: "discovery_post_reported",
          entityType: "discovery_post",
          entityId: postId,
          payload: parsed,
        });
      }
      return report;
    },

    async createGuild(user: Session, input: unknown) {
      const parsed = createGuildRequestSchema.parse(input);
      const guild = await repository.createGuild({
        ...parsed,
        createdByUserId: user.sub,
      });
      await repository.addGuildMembership(guild.id, user.sub, "approved");
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "guild_created",
        entityType: "guild",
        entityId: guild.id,
        payload: parsed,
      });
      return guild;
    },

    async joinGuild(user: Session, guildId: string) {
      const guild = await repository.getGuildById(guildId);
      if (!guild) throw new SocialServiceError("Guild not found.", 404);
      const membership = await repository.addGuildMembership(
        guildId,
        user.sub,
        "approved",
      );
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "guild_joined",
        entityType: "guild",
        entityId: guildId,
        payload: { status: "approved" },
      });
      return membership;
    },

    async leaveGuild(user: Session, guildId: string) {
      const removed = await repository.removeGuildMembership(guildId, user.sub);
      if (!removed)
        throw new SocialServiceError("Guild membership not found.", 404);
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "guild_left",
        entityType: "guild",
        entityId: guildId,
        payload: {},
      });
    },

    async listGuildFeed(
      user: Session,
      guildId: string,
      cursor?: string,
      limit = 20,
    ) {
      const guild = await repository.getGuildById(guildId);
      if (!guild) throw new SocialServiceError("Guild not found.", 404);
      if (user.role !== "admin") {
        const isMember = await repository.isGuildMember(guildId, user.sub);
        if (!isMember) throw new SocialServiceError("Forbidden.", 403);
      }
      return repository.listGuildPosts(guildId, user.sub, cursor, limit);
    },
  };
}
