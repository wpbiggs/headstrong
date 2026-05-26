import { OperatorPanel } from "../../components/operator-panel";

export default function CampaignsPage() {
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
    </main>
  );
}
