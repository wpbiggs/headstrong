import assert from "node:assert/strict";
import test from "node:test";
import type {
  DiscoveryPost,
  Guild,
  Reaction,
  Report,
  Session,
} from "@headstrong/core";
import type { SocialRepository } from "../repositories/social-repository";
import { SocialServiceError, createSocialService } from "./social-service";

function createSessionFixture(overrides: Partial<Session>): Session {
  return {
    sub: overrides.sub ?? crypto.randomUUID(),
    email: overrides.email ?? "user@example.com",
    role: overrides.role ?? "student",
    sessionId: overrides.sessionId ?? crypto.randomUUID(),
  };
}

function createRepositoryFixture() {
  const posts = new Map<string, DiscoveryPost>();
  const guilds = new Map<string, Guild>();
  const reactions: Reaction[] = [];
  const reports: Report[] = [];
  const parentLinks = new Set<string>();
  const memberships = new Set<string>();
  const auditLogs: string[] = [];

  const repository: SocialRepository = {
    async createDiscoveryPost(input) {
      const id = crypto.randomUUID();
      const post: DiscoveryPost = {
        id,
        authorUserId: input.authorUserId,
        authorRole: input.authorRole,
        title: input.title,
        body: input.body,
        excerpt:
          input.body.length > 280
            ? `${input.body.slice(0, 277)}...`
            : input.body,
        tags: input.tags,
        visibility: input.visibility,
        state: input.state,
        moderationState: input.moderationState,
        moderation: input.moderation,
        requiresParentApproval: input.requiresParentApproval,
        parentApprovedAt: null,
        parentRejectedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      posts.set(id, post);
      return post;
    },
    async getPostById(id) {
      return posts.get(id) ?? null;
    },
    async getPostDetailById(id) {
      const post = posts.get(id);
      return post
        ? {
            post,
            reactionCounts: {},
            guild: null,
            reportsCount: reports.filter((r) => r.postId === id).length,
          }
        : null;
    },
    async listFeed(input) {
      const items = [...posts.values()]
        .filter(
          (post) =>
            post.state === "live" ||
            (input.includeOwnPending &&
              post.state === "pending_parent_approval" &&
              post.authorUserId === input.viewerUserId),
        )
        .map((post) => ({
          post,
          reactionCounts: {},
          viewerReaction: null,
          guild: null,
        }));
      return { items, nextCursor: null };
    },
    async listPostsForParentApproval(parentId) {
      return {
        items: [...posts.values()]
          .filter(
            (post) =>
              post.state === "pending_parent_approval" &&
              parentLinks.has(`${parentId}:${post.authorUserId}`),
          )
          .map((post) => ({ post, authorStudentId: post.authorUserId })),
        nextCursor: null,
      };
    },
    async updatePostParentApproval(postId, nextState) {
      const post = posts.get(postId);
      if (!post || post.state !== "pending_parent_approval") return null;
      const updated: DiscoveryPost = {
        ...post,
        state: nextState,
        parentApprovedAt:
          nextState === "live"
            ? new Date().toISOString()
            : post.parentApprovedAt,
        parentRejectedAt:
          nextState === "rejected"
            ? new Date().toISOString()
            : post.parentRejectedAt,
        updatedAt: new Date().toISOString(),
      };
      posts.set(postId, updated);
      return updated;
    },
    async updatePostState(postId, fromState, toState) {
      const post = posts.get(postId);
      if (!post || post.state !== fromState) return null;
      const updated = {
        ...post,
        state: toState,
        updatedAt: new Date().toISOString(),
      };
      posts.set(postId, updated);
      return updated;
    },
    async listModerationPosts(input) {
      const items = [...posts.values()]
        .filter((post) => {
          if (input.state === "reported")
            return reports.some((report) => report.postId === post.id);
          if (input.state) return post.moderationState === input.state;
          if (input.reported)
            return reports.some((report) => report.postId === post.id);
          return true;
        })
        .map((post) => ({
          post,
          reactionCounts: {},
          guild: null,
          reportsCount: reports.filter((r) => r.postId === post.id).length,
        }));
      return { items, nextCursor: null };
    },
    async addReaction(postId, userId, reactionType) {
      const reaction: Reaction = {
        id: crypto.randomUUID(),
        postId,
        userId,
        reactionType,
        createdAt: new Date().toISOString(),
      };
      reactions.push(reaction);
      return reaction;
    },
    async addReport(postId, reportedByUserId, reason, details) {
      const report: Report = {
        id: crypto.randomUUID(),
        postId,
        reportedByUserId,
        reason,
        details,
        createdAt: new Date().toISOString(),
      };
      reports.push(report);
      return report;
    },
    async createGuild(input) {
      const guild: Guild = {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description,
        slug: input.slug,
        createdByUserId: input.createdByUserId,
        createdAt: new Date().toISOString(),
      };
      guilds.set(guild.id, guild);
      return guild;
    },
    async addGuildMembership(guildId, userId, status) {
      memberships.add(`${guildId}:${userId}:${status}`);
      return {
        id: crypto.randomUUID(),
        guildId,
        userId,
        status,
        createdAt: new Date().toISOString(),
      };
    },
    async removeGuildMembership(guildId, userId) {
      const key = [...memberships].find((entry) =>
        entry.startsWith(`${guildId}:${userId}:`),
      );
      return key ? memberships.delete(key) : false;
    },
    async isGuildMember(guildId, userId) {
      return memberships.has(`${guildId}:${userId}:approved`);
    },
    async getGuildById(guildId) {
      return guilds.get(guildId) ?? null;
    },
    async listGuildPosts(guildId) {
      return {
        items: [...posts.values()]
          .filter((post) => post.state === "live")
          .map((post) => ({
            post,
            reactionCounts: {},
            viewerReaction: null,
            guild: guilds.get(guildId) ?? null,
          })),
        nextCursor: null,
        rule: "live_posts_by_approved_members_only",
      };
    },
    async logAuditEvent(input) {
      auditLogs.push(input.action);
    },
  };

  return {
    repository,
    posts,
    guilds,
    reactions,
    reports,
    parentLinks,
    memberships,
    auditLogs,
  };
}

test("student posts require parent approval under strict defaults", async () => {
  const fixture = createRepositoryFixture();
  const service = createSocialService(fixture.repository, {
    isParentOf: async (parentId, studentId) =>
      fixture.parentLinks.has(`${parentId}:${studentId}`),
  });
  const student = createSessionFixture({ role: "student" });
  const post = await service.createPost(student, {
    title: "I loved fractions today",
    body: "The fraction lab made me excited about math.",
    tags: ["fractions"],
  });
  assert.equal(post.state, "pending_parent_approval");
  assert.equal(post.requiresParentApproval, true);
});

test("parent approval queue only shows linked students and transitions once", async () => {
  const fixture = createRepositoryFixture();
  const service = createSocialService(fixture.repository, {
    isParentOf: async (parentId, studentId) =>
      fixture.parentLinks.has(`${parentId}:${studentId}`),
  });
  const student = createSessionFixture({ role: "student" });
  const parent = createSessionFixture({ role: "parent" });
  fixture.parentLinks.add(`${parent.sub}:${student.sub}`);
  const post = await service.createPost(student, {
    title: "Need approval",
    body: "Queue me.",
    tags: [],
  });
  const queue = await service.listParentApprovalQueue(parent);
  assert.equal(queue.items.length, 1);
  const approved = await service.approveParent(parent, post.id, {
    notes: "Looks good",
  });
  assert.equal(approved.state, "live");
  await assert.rejects(
    () => service.approveParent(parent, post.id, {}),
    (error: unknown) => {
      assert.ok(error instanceof SocialServiceError);
      assert.equal(error.status, 409);
      return true;
    },
  );
});

test("parent reject cannot be spoofed by students and is audited", async () => {
  const fixture = createRepositoryFixture();
  const service = createSocialService(fixture.repository, {
    isParentOf: async (parentId, studentId) =>
      fixture.parentLinks.has(`${parentId}:${studentId}`),
  });
  const student = createSessionFixture({ role: "student" });
  const parent = createSessionFixture({ role: "parent" });
  const otherParent = createSessionFixture({ role: "parent" });
  fixture.parentLinks.add(`${parent.sub}:${student.sub}`);
  const post = await service.createPost(student, {
    title: "Need reject",
    body: "Queue me.",
    tags: [],
  });
  await assert.rejects(
    () => service.rejectParent(otherParent, post.id, { notes: "Nope" }),
    (error: unknown) => {
      assert.ok(error instanceof SocialServiceError);
      assert.equal(error.status, 403);
      return true;
    },
  );
  const rejected = await service.rejectParent(parent, post.id, {
    notes: "Nope",
  });
  assert.equal(rejected.state, "rejected");
  assert.ok(fixture.auditLogs.includes("post_parent_reject_forbidden"));
  assert.ok(fixture.auditLogs.includes("post_parent_rejected"));
});

test("feed only returns live posts except own pending student posts", async () => {
  const fixture = createRepositoryFixture();
  const service = createSocialService(fixture.repository, {
    isParentOf: async (parentId, studentId) =>
      fixture.parentLinks.has(`${parentId}:${studentId}`),
  });
  const student = createSessionFixture({ role: "student" });
  const educator = createSessionFixture({ role: "educator" });
  await service.createPost(student, {
    title: "Pending",
    body: "Awaiting approval.",
    tags: [],
  });
  await service.createPost(educator, {
    title: "Live",
    body: "Visible to feed.",
    tags: [],
  });
  const studentFeed = await service.listFeed(student);
  const educatorFeed = await service.listFeed(educator);
  assert.equal(studentFeed.items.length, 2);
  assert.equal(educatorFeed.items.length, 1);
});

test("approved post can be reacted to and reported", async () => {
  const fixture = createRepositoryFixture();
  const service = createSocialService(fixture.repository, {
    isParentOf: async (parentId, studentId) =>
      fixture.parentLinks.has(`${parentId}:${studentId}`),
  });
  const educator = createSessionFixture({ role: "educator" });
  const post = await service.createPost(educator, {
    title: "Biology dome reflections",
    body: "I was excited by the cell habitat scene.",
    tags: ["biology"],
  });
  const reaction = await service.react(educator, post.id, {
    reactionType: "curious",
  });
  const report = await service.report(educator, post.id, {
    reason: "other",
    details: "Test report",
  });
  assert.equal(reaction.reactionType, "curious");
  assert.equal(report.reason, "other");
});

test("moderation actions enforce state transitions", async () => {
  const fixture = createRepositoryFixture();
  const service = createSocialService(fixture.repository, {
    isParentOf: async (parentId, studentId) =>
      fixture.parentLinks.has(`${parentId}:${studentId}`),
  });
  const educator = createSessionFixture({ role: "educator" });
  const post = await service.createPost(educator, {
    title: "Warned post",
    body: "dm me after class",
    tags: [],
  });
  const removed = await service.removePost(educator, post.id, {
    notes: "Removed",
  });
  assert.equal(removed.state, "removed");
  const restored = await service.restorePost(educator, post.id, {
    notes: "Restored",
  });
  assert.equal(restored.state, "live");
});

test("guild feed is membership gated and admin can bypass membership", async () => {
  const fixture = createRepositoryFixture();
  const service = createSocialService(fixture.repository);
  const educator = createSessionFixture({ role: "educator" });
  const admin = createSessionFixture({ role: "admin" });
  const guild = await service.createGuild(educator, {
    name: "Fraction Club",
    description: "Internal community",
    slug: "fraction-club",
  });
  await service.createPost(educator, {
    title: "Guild live",
    body: "Visible.",
    tags: [],
    guildId: guild.id,
  });
  await assert.rejects(
    () =>
      service.listGuildFeed(
        createSessionFixture({ role: "student" }),
        guild.id,
      ),
    (error: unknown) => {
      assert.ok(error instanceof SocialServiceError);
      assert.equal(error.status, 403);
      return true;
    },
  );
  const adminFeed = await service.listGuildFeed(admin, guild.id);
  assert.equal(adminFeed.rule, "live_posts_by_approved_members_only");
});
