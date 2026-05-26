import Link from "next/link";
import { fetchCommonsAssetsLive } from "../../lib/live-api";

interface CommonsAssetListItem {
  id: string;
  title: string;
  summary: string;
  subject: string;
  gradeBand: string;
  license: string;
}

const demoAssets = {
  items: [
    {
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
  ],
  nextCursor: null,
};

export default async function CommonsPage({
  searchParams,
}: { searchParams: { subject?: string; tag?: string } }) {
  const data = await fetchCommonsAssetsLive({
    subject: searchParams.subject,
    tag: searchParams.tag,
    limit: 20,
  }).catch(() => demoAssets);

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Curriculum Commons</p>
        <h1>Discover, reuse, and remix open learning assets.</h1>
      </section>
      <section className="grid">
        {(data.items as CommonsAssetListItem[]).map((asset) => (
          <article key={asset.id} className="card">
            <p className="eyebrow">{asset.subject}</p>
            <h2>{asset.title}</h2>
            <p>{asset.summary}</p>
            <p>Grade band: {asset.gradeBand}</p>
            <p>License: {asset.license}</p>
            <Link href={`/commons/${asset.id}`}>Open asset</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
