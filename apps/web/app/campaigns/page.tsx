import Link from "next/link";
import { OperatorPanel } from "../../components/operator-panel";
import { fetchCampaignsLive } from "../../lib/live-api";

interface CampaignListItem {
  id: string;
  title: string;
  description: string;
  status: string;
  educatorUserId: string;
}

const demoCampaigns = {
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Support Teacher Mina",
      description: "Reward curriculum contributions and classroom impact.",
      status: "live",
      educatorUserId: "00000000-0000-4000-8000-000000000001",
    },
  ],
};

export default async function CampaignsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{
    email?: string;
    role?: "admin" | "educator" | "parent" | "expert";
    educatorUserId?: string;
    status?: "draft" | "live" | "closed";
  }>;
}) {
  const searchParams = await searchParamsPromise;
  let listUnavailable = false;
  const campaigns =
    searchParams.email && searchParams.role
      ? await fetchCampaignsLive({
          email: searchParams.email,
          role: searchParams.role,
          educatorUserId: searchParams.educatorUserId,
          status: searchParams.status,
        }).catch(() => {
          listUnavailable = true;
          return { items: [] };
        })
      : demoCampaigns;
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Campaign Operator</p>
        <h1>
          Create teacher support campaigns and inspect ledger-backed totals.
        </h1>
      </section>
      <OperatorPanel
        title="Create campaign"
        description="Admin-only flow for opening a teacher campaign with an optional opening pledge."
        submitLabel="Create campaign"
        mode="campaignCreate"
        fields={[
          { name: "email", placeholder: "admin email" },
          { name: "educatorUserId", placeholder: "educator user id" },
          { name: "title", placeholder: "Support Teacher Mina" },
          { name: "description", placeholder: "Campaign description" },
          { name: "openingPledgeUsd", placeholder: "100" },
        ]}
      />
      <section className="card">
        <h2>Campaigns</h2>
        {listUnavailable ? (
          <p role="alert">
            Campaign list unavailable. Legacy email/role login is disabled; a
            provisioned-token operator UI is required.
          </p>
        ) : !searchParams.email || !searchParams.role ? (
          <p>Demo fixtures only — not live campaigns or verified balances.</p>
        ) : null}
        {(campaigns.items as CampaignListItem[]).map((campaign) => (
          <div key={campaign.id} className="history-row">
            <strong>{campaign.title}</strong>
            <span>{campaign.status}</span>
            <span>{campaign.educatorUserId}</span>
            <Link
              href={`/campaigns/${campaign.id}${searchParams.email ? `?email=${encodeURIComponent(searchParams.email)}&role=${searchParams.role}` : ""}`}
            >
              Open detail
            </Link>
          </div>
        ))}
      </section>
      <section className="card">
        <h2>Follow-up</h2>
        <p>
          Open `/campaigns/:id?email=...&role=admin` to review ledger history
          and allocate funds.
        </p>
      </section>
    </main>
  );
}
