import {
  type ContributorScore,
  type CurriculumAsset,
  contributorScoreSchema,
  curriculumAssetDetailSchema,
  curriculumAssetSchema,
} from "@headstrong/core";
import type { DatabaseClient } from "../db";
import { sql } from "../db";

function mapAsset(row: Record<string, unknown>) {
  return curriculumAssetSchema.parse({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    subject: row.subject,
    gradeBand: row.grade_band,
    license: row.license,
    sourceUrl: row.source_url,
    tags: row.tags ?? [],
    contributorUserId: row.contributor_user_id,
    contributionType: row.contribution_type,
    status: row.status,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  });
}

function encodeCursor(timestamp: string, id: string) {
  return Buffer.from(`${timestamp}|${id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  const [timestamp, id] = Buffer.from(cursor, "base64url")
    .toString("utf8")
    .split("|");
  if (!timestamp || !id) throw new Error("Invalid cursor.");
  return { timestamp, id };
}

export interface CommonsRepository {
  createAsset(input: {
    slug: string;
    title: string;
    summary: string;
    subject: string;
    gradeBand: string;
    license: string;
    sourceUrl: string;
    tags: string[];
    contributorUserId: string;
    contributionType: CurriculumAsset["contributionType"];
    status: CurriculumAsset["status"];
  }): Promise<CurriculumAsset>;
  getAssetById(id: string): Promise<CurriculumAsset | null>;
  listAssets(input: {
    cursor?: string;
    limit: number;
    subject?: string;
    tag?: string;
  }): Promise<{ items: CurriculumAsset[]; nextCursor: string | null }>;
  createEdge(input: {
    parentAssetId: string;
    childAssetId: string;
    relation: "remixed_from" | "translated_from" | "adapted_from";
  }): Promise<void>;
  listParents(assetId: string): Promise<CurriculumAsset[]>;
  listChildren(assetId: string): Promise<CurriculumAsset[]>;
  recordImpact(input: {
    assetId: string;
    learnerId?: string;
    questId?: string;
    signal: "view" | "reuse" | "completion";
    weight: number;
  }): Promise<void>;
  getContributorScore(contributorUserId: string): Promise<ContributorScore>;
  getAssetDetail(
    id: string,
  ): Promise<ReturnType<typeof curriculumAssetDetailSchema.parse> | null>;
  logAuditEvent(input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

export function createCommonsRepository(
  client: DatabaseClient = sql,
): CommonsRepository {
  return {
    async createAsset(input) {
      const [row] = await client`
        insert into curriculum_assets (
          slug, title, summary, subject, grade_band, license, source_url, tags,
          contributor_user_id, contribution_type, status
        ) values (
          ${input.slug}, ${input.title}, ${input.summary}, ${input.subject}, ${input.gradeBand},
          ${input.license}, ${input.sourceUrl}, ${JSON.stringify(input.tags)}::jsonb,
          ${input.contributorUserId}, ${input.contributionType}, ${input.status}
        ) returning *
      `;
      return mapAsset(row);
    },
    async getAssetById(id) {
      const [row] =
        await client`select * from curriculum_assets where id = ${id}`;
      return row ? mapAsset(row) : null;
    },
    async listAssets(input) {
      const cursor = decodeCursor(input.cursor);
      const cursorFilter = cursor
        ? client`and (created_at, id) < (${cursor.timestamp}::timestamptz, ${cursor.id}::uuid)`
        : client``;
      const subjectFilter = input.subject
        ? client`and subject = ${input.subject}`
        : client``;
      const tagFilter = input.tag ? client`and tags ? ${input.tag}` : client``;
      const rows = await client`
        select * from curriculum_assets
        where status = 'published'
        ${subjectFilter}
        ${tagFilter}
        ${cursorFilter}
        order by created_at desc, id desc
        limit ${input.limit + 1}
      `;
      const hasMore = rows.length > input.limit;
      const sliced = rows.slice(0, input.limit);
      const last = sliced.at(-1);
      return {
        items: sliced.map(mapAsset),
        nextCursor:
          hasMore && last
            ? encodeCursor(
                new Date(String(last.created_at)).toISOString(),
                String(last.id),
              )
            : null,
      };
    },
    async createEdge(input) {
      await client`
        insert into curriculum_asset_edges (parent_asset_id, child_asset_id, relation)
        values (${input.parentAssetId}, ${input.childAssetId}, ${input.relation})
      `;
    },
    async listParents(assetId) {
      const rows = await client`
        select curriculum_assets.*
        from curriculum_asset_edges
        inner join curriculum_assets on curriculum_assets.id = curriculum_asset_edges.parent_asset_id
        where curriculum_asset_edges.child_asset_id = ${assetId}
        order by curriculum_assets.created_at asc
      `;
      return rows.map(mapAsset);
    },
    async listChildren(assetId) {
      const rows = await client`
        select curriculum_assets.*
        from curriculum_asset_edges
        inner join curriculum_assets on curriculum_assets.id = curriculum_asset_edges.child_asset_id
        where curriculum_asset_edges.parent_asset_id = ${assetId}
        order by curriculum_assets.created_at asc
      `;
      return rows.map(mapAsset);
    },
    async recordImpact(input) {
      await client`
        insert into curriculum_asset_impacts (asset_id, learner_id, quest_id, signal, weight)
        values (${input.assetId}, ${input.learnerId ?? null}, ${input.questId ?? null}, ${input.signal}, ${input.weight})
      `;
    },
    async getContributorScore(contributorUserId) {
      const [assetCounts] = await client`
        select
          count(*)::int as asset_count,
          count(*) filter (where contribution_type != 'original')::int as remix_count
        from curriculum_assets
        where contributor_user_id = ${contributorUserId}
      `;
      const [impactCounts] = await client`
        select coalesce(sum(weight), 0)::real as impact_count
        from curriculum_asset_impacts
        inner join curriculum_assets on curriculum_assets.id = curriculum_asset_impacts.asset_id
        where curriculum_assets.contributor_user_id = ${contributorUserId}
      `;
      return contributorScoreSchema.parse({
        contributorUserId,
        assetCount: Number(assetCounts?.asset_count ?? 0),
        remixCount: Number(assetCounts?.remix_count ?? 0),
        impactCount: Number(impactCounts?.impact_count ?? 0),
        score:
          Number(assetCounts?.asset_count ?? 0) +
          Number(assetCounts?.remix_count ?? 0) * 2 +
          Number(impactCounts?.impact_count ?? 0),
      });
    },
    async getAssetDetail(id) {
      const asset = await this.getAssetById(id);
      if (!asset) return null;
      return curriculumAssetDetailSchema.parse({
        asset,
        parents: await this.listParents(id),
        children: await this.listChildren(id),
        contributorScore: await this.getContributorScore(
          asset.contributorUserId,
        ),
      });
    },
    async logAuditEvent(input) {
      await client`
        insert into audit_events (actor_user_id, action, entity_type, entity_id, payload)
        values (${input.actorUserId}, ${input.action}, ${input.entityType}, ${input.entityId}, ${JSON.stringify(input.payload)}::jsonb)
      `;
    },
  };
}
