import Link from "next/link";
import { OperatorPanel } from "../../../components/operator-panel";
import { fetchCommonsAssetDetailLive } from "../../../lib/live-api";

interface CommonsRelationItem {
  id: string;
  title: string;
}

const demoDetail = {
  asset: {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "fraction-lab-intro",
    title: "Fraction Lab Intro",
    summary: "An introductory fractions activity for grades 3-5.",
    subject: "math",
    gradeBand: "3-5",
    license: "CC BY 4.0",
    sourceUrl: "https://example.com/fraction-lab",
    tags: ["fractions", "oer"],
    contributorUserId: "00000000-0000-4000-8000-000000000001",
    contributionType: "original",
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  parents: [],
  children: [],
  contributorScore: {
    contributorUserId: "00000000-0000-4000-8000-000000000001",
    assetCount: 1,
    remixCount: 0,
    impactCount: 0,
    score: 1,
  },
};

export default async function CommonsAssetPage({
  params: paramsPromise,
}: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const detail = await fetchCommonsAssetDetailLive({ id: params.id }).catch(
    () => demoDetail,
  );

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Commons Asset</p>
        <h1>{detail.asset.title}</h1>
        <p>{detail.asset.summary}</p>
      </section>
      <section className="grid">
        <article className="card">
          <h2>Metadata</h2>
          <p>Subject: {detail.asset.subject}</p>
          <p>Grade band: {detail.asset.gradeBand}</p>
          <p>License: {detail.asset.license}</p>
          <p>Contribution type: {detail.asset.contributionType}</p>
          <p>Contributor score: {detail.contributorScore.score}</p>
        </article>
        <article className="card">
          <h2>Remix Graph</h2>
          <p>Parents: {detail.parents.length}</p>
          <p>Children: {detail.children.length}</p>
          {(detail.parents as CommonsRelationItem[]).map((asset) => (
            <p key={asset.id}>
              <Link href={`/commons/${asset.id}`}>{asset.title}</Link>
            </p>
          ))}
          {(detail.children as CommonsRelationItem[]).map((asset) => (
            <p key={asset.id}>
              <Link href={`/commons/${asset.id}`}>{asset.title}</Link>
            </p>
          ))}
        </article>
      </section>
      <OperatorPanel
        title="Remix this asset"
        description="Create a derivative asset while preserving attribution."
        submitLabel="Create remix"
        mode="commonsRemix"
        fields={[
          {
            name: "assetId",
            placeholder: "asset id",
            defaultValue: detail.asset.id,
          },
          { name: "email", placeholder: "educator/expert/admin email" },
          { name: "role", placeholder: "educator" },
          { name: "title", placeholder: `${detail.asset.title} Remix` },
          { name: "slug", placeholder: `${detail.asset.slug}-remix` },
          { name: "summary", placeholder: "Describe the remix" },
          {
            name: "relation",
            placeholder: "remixed_from",
            defaultValue: "remixed_from",
          },
        ]}
      />
    </main>
  );
}
