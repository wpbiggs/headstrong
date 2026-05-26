import assert from "node:assert/strict";
import test from "node:test";
import type {
  ContributorScore,
  CurriculumAsset,
  Session,
} from "@headstrong/core";
import type { CommonsRepository } from "../repositories/commons-repository";
import { CommonsServiceError, createCommonsService } from "./commons-service";

function createSessionFixture(overrides: Partial<Session>): Session {
  return {
    sub: overrides.sub ?? crypto.randomUUID(),
    email: overrides.email ?? "educator@example.com",
    role: overrides.role ?? "educator",
    sessionId: overrides.sessionId ?? crypto.randomUUID(),
  };
}

function createRepositoryFixture() {
  const assets = new Map<string, CurriculumAsset>();
  const edges: Array<{
    parentAssetId: string;
    childAssetId: string;
    relation: "remixed_from" | "translated_from" | "adapted_from";
  }> = [];
  const impacts: Array<{ assetId: string; weight: number }> = [];
  const auditLogs: string[] = [];

  const repository: CommonsRepository = {
    async createAsset(input) {
      const asset: CurriculumAsset = {
        id: crypto.randomUUID(),
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        subject: input.subject,
        gradeBand: input.gradeBand,
        license: input.license,
        sourceUrl: input.sourceUrl,
        tags: input.tags,
        contributorUserId: input.contributorUserId,
        contributionType: input.contributionType,
        status: input.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assets.set(asset.id, asset);
      return asset;
    },
    async getAssetById(id) {
      return assets.get(id) ?? null;
    },
    async listAssets(input) {
      const filtered = [...assets.values()].filter((asset) => {
        if (input.subject && asset.subject !== input.subject) return false;
        if (input.tag && !asset.tags.includes(input.tag)) return false;
        return asset.status === "published";
      });
      return { items: filtered.slice(0, input.limit), nextCursor: null };
    },
    async createEdge(input) {
      edges.push(input);
    },
    async listParents(assetId) {
      return edges
        .filter((edge) => edge.childAssetId === assetId)
        .map((edge) => assets.get(edge.parentAssetId))
        .filter((asset): asset is CurriculumAsset => Boolean(asset));
    },
    async listChildren(assetId) {
      return edges
        .filter((edge) => edge.parentAssetId === assetId)
        .map((edge) => assets.get(edge.childAssetId))
        .filter((asset): asset is CurriculumAsset => Boolean(asset));
    },
    async recordImpact(input) {
      impacts.push({ assetId: input.assetId, weight: input.weight });
    },
    async getContributorScore(contributorUserId) {
      const owned = [...assets.values()].filter(
        (asset) => asset.contributorUserId === contributorUserId,
      );
      const remixCount = owned.filter(
        (asset) => asset.contributionType !== "original",
      ).length;
      const impactCount = impacts
        .filter((impact) => owned.some((asset) => asset.id === impact.assetId))
        .reduce((sum, impact) => sum + impact.weight, 0);
      const score: ContributorScore = {
        contributorUserId,
        assetCount: owned.length,
        remixCount,
        impactCount,
        score: owned.length + remixCount * 2 + impactCount,
      };
      return score;
    },
    async getAssetDetail(id) {
      const asset = assets.get(id);
      if (!asset) return null;
      return {
        asset,
        parents: await repository.listParents(id),
        children: await repository.listChildren(id),
        contributorScore: await repository.getContributorScore(
          asset.contributorUserId,
        ),
      };
    },
    async logAuditEvent(input) {
      auditLogs.push(input.action);
    },
  };

  return { repository, assets, edges, impacts, auditLogs };
}

test("educator can create published curriculum asset", async () => {
  const fixture = createRepositoryFixture();
  const service = createCommonsService(fixture.repository);
  const educator = createSessionFixture({ role: "educator" });
  const asset = await service.createAsset(educator, {
    title: "Fraction Lab Intro",
    slug: "fraction-lab-intro",
    summary: "Intro asset",
    subject: "math",
    gradeBand: "3-5",
    license: "CC BY 4.0",
    sourceUrl: "https://example.com/fraction-lab",
    tags: ["fractions"],
  });
  assert.equal(asset.status, "published");
  assert.ok(fixture.auditLogs.includes("curriculum_asset_created"));
});

test("remix creates child asset and attribution edge", async () => {
  const fixture = createRepositoryFixture();
  const service = createCommonsService(fixture.repository);
  const educator = createSessionFixture({ role: "educator" });
  const parent = await fixture.repository.createAsset({
    slug: "fraction-lab-intro",
    title: "Fraction Lab Intro",
    summary: "Intro asset",
    subject: "math",
    gradeBand: "3-5",
    license: "CC BY 4.0",
    sourceUrl: "https://example.com/fraction-lab",
    tags: ["fractions"],
    contributorUserId: educator.sub,
    contributionType: "original",
    status: "published",
  });
  const detail = await service.remixAsset(educator, parent.id, {
    title: "Fraction Lab Remix",
    slug: "fraction-lab-remix",
    summary: "Remixed asset",
    relation: "remixed_from",
  });
  assert.equal(detail?.parents.length, 1);
  assert.ok(fixture.auditLogs.includes("curriculum_asset_remixed"));
});

test("listAssets filters by subject and tag", async () => {
  const fixture = createRepositoryFixture();
  const service = createCommonsService(fixture.repository);
  const educator = createSessionFixture({ role: "educator" });
  await service.createAsset(educator, {
    title: "Fraction Lab Intro",
    slug: "fraction-lab-intro",
    summary: "Intro asset",
    subject: "math",
    gradeBand: "3-5",
    license: "CC BY 4.0",
    sourceUrl: "https://example.com/fraction-lab",
    tags: ["fractions"],
  });
  await service.createAsset(educator, {
    title: "Cell Structures",
    slug: "cell-structures",
    summary: "Biology asset",
    subject: "biology",
    gradeBand: "6-8",
    license: "CC BY 4.0",
    sourceUrl: "https://example.com/cells",
    tags: ["biology"],
  });
  const filtered = await service.listAssets({ subject: "math", limit: 10 });
  assert.equal(filtered.items.length, 1);
  assert.equal(filtered.items[0]?.subject, "math");
});

test("impact recording increases contributor score", async () => {
  const fixture = createRepositoryFixture();
  const service = createCommonsService(fixture.repository);
  const educator = createSessionFixture({ role: "educator" });
  const asset = await service.createAsset(educator, {
    title: "Fraction Lab Intro",
    slug: "fraction-lab-intro",
    summary: "Intro asset",
    subject: "math",
    gradeBand: "3-5",
    license: "CC BY 4.0",
    sourceUrl: "https://example.com/fraction-lab",
    tags: ["fractions"],
  });
  const score = await service.recordImpact(
    createSessionFixture({ role: "admin" }),
    asset.id,
    {
      signal: "completion",
      weight: 2,
    },
  );
  assert.equal(score.score, 3);
  assert.ok(fixture.auditLogs.includes("curriculum_asset_impact_recorded"));
});

test("students cannot create commons assets", async () => {
  const fixture = createRepositoryFixture();
  const service = createCommonsService(fixture.repository);
  await assert.rejects(
    () =>
      service.createAsset(createSessionFixture({ role: "student" }), {
        title: "Blocked",
        slug: "blocked",
        summary: "Blocked",
        subject: "math",
        gradeBand: "3-5",
        license: "CC BY 4.0",
        sourceUrl: "https://example.com/blocked",
        tags: [],
      }),
    (error: unknown) => {
      assert.ok(error instanceof CommonsServiceError);
      assert.equal(error.status, 403);
      return true;
    },
  );
});
