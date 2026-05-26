import { fetchCampaignDetailLive } from "../../../lib/live-api";

const demoCampaign = {
  campaign: {
    id: "11111111-1111-4111-8111-111111111111",
    educatorUserId: "00000000-0000-4000-8000-000000000001",
    createdByUserId: "00000000-0000-4000-8000-000000000002",
    title: "Support Teacher Mina",
    description: "Reward curriculum contributions and classroom impact.",
    status: "live",
    createdAt: new Date().toISOString(),
  },
  totals: {
    pledgedUsd: 100,
    allocatedUsd: 0,
    reservedUsd: 0,
  },
  contributorScore: {
    contributorUserId: "00000000-0000-4000-8000-000000000001",
    assetCount: 3,
    remixCount: 1,
    impactCount: 5,
    score: 10,
  },
  transactions: [],
};

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: {
    email?: string;
    role?: "admin" | "educator" | "parent" | "expert";
  };
}) {
  const detail =
    searchParams.email && searchParams.role
      ? await fetchCampaignDetailLive({
          id: params.id,
          email: searchParams.email,
          role: searchParams.role,
        }).catch(() => demoCampaign)
      : demoCampaign;

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Campaign Detail</p>
        <h1>{detail.campaign.title}</h1>
        <p>{detail.campaign.description}</p>
      </section>
      <section className="grid">
        <article className="card">
          <h2>Ledger totals</h2>
          <p>Pledged: ${detail.totals.pledgedUsd}</p>
          <p>Allocated: ${detail.totals.allocatedUsd}</p>
          <p>Reserved: ${detail.totals.reservedUsd}</p>
        </article>
        <article className="card">
          <h2>Contributor score</h2>
          <p>Assets: {detail.contributorScore.assetCount}</p>
          <p>Remixes: {detail.contributorScore.remixCount}</p>
          <p>Impact: {detail.contributorScore.impactCount}</p>
          <p>Score: {detail.contributorScore.score}</p>
        </article>
      </section>
    </main>
  );
}
