import {
  type Session,
  createCurriculumAssetRequestSchema,
  listCurriculumAssetsRequestSchema,
  listCurriculumAssetsResponseSchema,
  recordCurriculumImpactRequestSchema,
  remixCurriculumAssetRequestSchema,
} from "@headstrong/core";
import {
  type CommonsRepository,
  createCommonsRepository,
} from "../repositories/commons-repository";

export class CommonsServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function createCommonsService(
  repository: CommonsRepository = createCommonsRepository(),
) {
  return {
    async createAsset(user: Session, input: unknown) {
      if (!["educator", "expert", "admin"].includes(user.role)) {
        throw new CommonsServiceError("Forbidden.", 403);
      }
      const parsed = createCurriculumAssetRequestSchema.parse(input);
      const asset = await repository.createAsset({
        ...parsed,
        contributorUserId: user.sub,
        status: "published",
      });
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "curriculum_asset_created",
        entityType: "curriculum_asset",
        entityId: asset.id,
        payload: parsed,
      });
      return asset;
    },

    async listAssets(input: unknown) {
      const parsed = listCurriculumAssetsRequestSchema.parse(input);
      return listCurriculumAssetsResponseSchema.parse(
        await repository.listAssets(parsed),
      );
    },

    async getAsset(id: string) {
      const detail = await repository.getAssetDetail(id);
      if (!detail) throw new CommonsServiceError("Asset not found.", 404);
      return detail;
    },

    async remixAsset(user: Session, parentAssetId: string, input: unknown) {
      if (!["educator", "expert", "admin"].includes(user.role)) {
        throw new CommonsServiceError("Forbidden.", 403);
      }
      const parent = await repository.getAssetById(parentAssetId);
      if (!parent)
        throw new CommonsServiceError("Parent asset not found.", 404);
      const parsed = remixCurriculumAssetRequestSchema.parse(input);
      const child = await repository.createAsset({
        slug: parsed.slug,
        title: parsed.title,
        summary: parsed.summary,
        subject: parent.subject,
        gradeBand: parent.gradeBand,
        license: parent.license,
        sourceUrl: parent.sourceUrl,
        tags: parent.tags,
        contributorUserId: user.sub,
        contributionType:
          parsed.relation === "translated_from"
            ? "translation"
            : parsed.relation === "adapted_from"
              ? "adaptation"
              : "remix",
        status: "published",
      });
      await repository.createEdge({
        parentAssetId,
        childAssetId: child.id,
        relation: parsed.relation,
      });
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "curriculum_asset_remixed",
        entityType: "curriculum_asset",
        entityId: child.id,
        payload: { parentAssetId, relation: parsed.relation },
      });
      return repository.getAssetDetail(child.id);
    },

    async recordImpact(user: Session, assetId: string, input: unknown) {
      const asset = await repository.getAssetById(assetId);
      if (!asset) throw new CommonsServiceError("Asset not found.", 404);
      const parsed = recordCurriculumImpactRequestSchema.parse(input);
      await repository.recordImpact({ assetId, ...parsed });
      const score = await repository.getContributorScore(
        asset.contributorUserId,
      );
      await repository.logAuditEvent({
        actorUserId: user.sub,
        action: "curriculum_asset_impact_recorded",
        entityType: "curriculum_asset",
        entityId: assetId,
        payload: parsed,
      });
      return score;
    },
  };
}
