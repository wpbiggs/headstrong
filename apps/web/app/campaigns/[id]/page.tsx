import { OperatorPanel } from "../../../components/operator-panel";
import {
  fetchCampaignDetailLive,
  fetchCampaignHistoryLive,
} from "../../../lib/live-api";

interface CampaignHistoryItem {
  transactionId: string;
  reference: string;
  accountCode: string;
  direction: string;
  amount: number;
}

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

const demoHistory = {
  items: [
    {
      transactionId: "11111111-1111-4111-8111-111111111111",
      reference: "campaign:demo:opening-pledge",
      description: "Opening campaign pledge",
      accountCode: "campaign_pledges",
      direction: "credit",
      amount: 100,
      currency: "USD",
      createdAt: new Date().toISOString(),
      actorUserId: "00000000-0000-4000-8000-000000000002",
      note: null,
    },
  ],
  nextCursor: null,
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
  const history =
    searchParams.email && searchParams.role
      ? await fetchCampaignHistoryLive({
          id: params.id,
          email: searchParams.email,
          role: searchParams.role,
          limit: 20,
        }).catch(() => demoHistory)
      : demoHistory;

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
          <p>Outstanding: ${detail.totals.outstandingUsd}</p>
        </article>
        <article className="card">
          <h2>Contributor score</h2>
          <p>Assets: {detail.contributorScore.assetCount}</p>
          <p>Remixes: {detail.contributorScore.remixCount}</p>
          <p>Impact: {detail.contributorScore.impactCount}</p>
          <p>Score: {detail.contributorScore.score}</p>
        </article>
        <article className="card">
          <h2>Ledger source of truth</h2>
          <p>
            Campaign balances are derived from ledger entries, not cached
            totals.
          </p>
        </article>
      </section>
      {searchParams.role === "admin" ? (
        <OperatorPanel
          title="Allocate campaign funds"
          description="Admin-only allocation flow with replay-safe ledger references."
          submitLabel="Allocate funds"
          mode="campaignAllocate"
          fields={[
            {
              name: "email",
              placeholder: "admin email",
              defaultValue: searchParams.email,
            },
            {
              name: "campaignId",
              placeholder: "campaign uuid",
              defaultValue: params.id,
            },
            { name: "educatorId", placeholder: "educator user id" },
            { name: "amount", placeholder: "25" },
            { name: "note", placeholder: "Allocation note" },
          ]}
        />
      ) : null}
      <section className="card">
        <h2>Ledger history</h2>
        {(history.items as CampaignHistoryItem[]).map((item) => (
          <div
            key={`${item.transactionId}-${item.accountCode}`}
            className="history-row"
          >
            <strong>{item.reference}</strong>
            <span>{item.accountCode}</span>
            <span>{item.direction}</span>
            <span>${item.amount}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
