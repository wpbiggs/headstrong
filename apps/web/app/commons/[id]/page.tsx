import Link from "next/link";
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
  params,
}: { params: { id: string } }) {
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
    </main>
  );
}
