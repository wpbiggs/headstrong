import { z } from "zod";
import { questModerationSchema } from "./quest";

export const discoveryTagSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(48),
});

export const discoveryPostVisibilitySchema = z.literal("internal");
export const discoveryPostStateSchema = z.enum([
  "draft",
  "pending_parent_approval",
  "live",
  "rejected",
  "removed",
]);
export const moderationStateSchema = z.enum([
  "pass",
  "warn",
  "block",
  "reported",
]);
export const guildFeedRuleSchema = z.literal(
  "live_posts_by_approved_members_only",
);

export const reactionTypeSchema = z.enum(["curious", "inspired", "celebrate"]);

export const reportReasonSchema = z.enum([
  "safety",
  "bullying",
  "spam",
  "other",
]);

export const discoveryPostSchema = z.object({
  id: z.string().uuid(),
  authorUserId: z.string().uuid(),
  authorRole: z.enum(["student", "parent", "educator", "expert", "admin"]),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(5000),
  excerpt: z.string().min(1).max(280),
  tags: z.array(discoveryTagSchema).max(8),
  visibility: discoveryPostVisibilitySchema,
  state: discoveryPostStateSchema,
  moderationState: moderationStateSchema,
  moderation: questModerationSchema,
  requiresParentApproval: z.boolean(),
  parentApprovedAt: z.string().datetime().nullable(),
  parentRejectedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const reactionSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  userId: z.string().uuid(),
  reactionType: reactionTypeSchema,
  createdAt: z.string().datetime(),
});

export const reportSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  reportedByUserId: z.string().uuid(),
  reason: reportReasonSchema,
  details: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
});

export const guildSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  slug: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
  createdByUserId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const guildMembershipSchema = z.object({
  id: z.string().uuid(),
  guildId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(["approved", "pending"]),
  createdAt: z.string().datetime(),
});

export const createDiscoveryPostRequestSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(5000),
  tags: z.array(z.string().min(1).max(32)).max(8).default([]),
  guildId: z.string().uuid().optional(),
});

export const discoveryFeedItemSchema = z.object({
  post: discoveryPostSchema,
  reactionCounts: z.object({
    curious: z.number().int().nonnegative().optional(),
    inspired: z.number().int().nonnegative().optional(),
    celebrate: z.number().int().nonnegative().optional(),
  }),
  viewerReaction: reactionTypeSchema.nullable(),
  guild: guildSchema.nullable(),
});

export const listDiscoveryFeedRequestSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
  topic: z.string().min(1).max(32).optional(),
});

export const listDiscoveryFeedResponseSchema = z.object({
  items: z.array(discoveryFeedItemSchema),
  nextCursor: z.string().nullable(),
});

export const parentApprovalQueueItemSchema = z.object({
  post: discoveryPostSchema,
  authorStudentId: z.string().uuid(),
});

export const listParentApprovalQueueResponseSchema = z.object({
  items: z.array(parentApprovalQueueItemSchema),
  nextCursor: z.string().nullable(),
});

export const postDetailSchema = z.object({
  post: discoveryPostSchema,
  reactionCounts: discoveryFeedItemSchema.shape.reactionCounts,
  guild: guildSchema.nullable(),
  reportsCount: z.number().int().nonnegative(),
});

export const listModerationPostsRequestSchema = z.object({
  state: z.enum(["warn", "block", "reported"]).optional(),
  reported: z.coerce.boolean().optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

export const listModerationPostsResponseSchema = z.object({
  items: z.array(postDetailSchema),
  nextCursor: z.string().nullable(),
});

export const postActionRequestSchema = z.object({
  notes: z.string().min(1).max(500).optional(),
});

export const createReactionRequestSchema = z.object({
  reactionType: reactionTypeSchema,
});

export const createReportRequestSchema = z.object({
  reason: reportReasonSchema,
  details: z.string().max(500).optional(),
});

export const createGuildRequestSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  slug: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
});

export type DiscoveryPost = z.infer<typeof discoveryPostSchema>;
export type Guild = z.infer<typeof guildSchema>;
export type Reaction = z.infer<typeof reactionSchema>;
export type Report = z.infer<typeof reportSchema>;
