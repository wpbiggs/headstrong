import { OperatorPanel } from "../../components/operator-panel";

export default function ComputePage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Compute Operator</p>
        <h1>Schedule local compute jobs and inspect validator outcomes.</h1>
      </section>
      <section className="grid">
        <OperatorPanel
          title="Schedule inference job"
          description="Coordinator, provider, validator, and optional ledger hook in one local flow."
          submitLabel="Run job"
          mode="computeScheduleInference"
          fields={[
            { name: "email", placeholder: "educator email" },
            {
              name: "model",
              placeholder: "local-model",
              defaultValue: "local-model",
            },
            { name: "prompt", placeholder: "Prompt to hash" },
            { name: "expectedOutput", placeholder: "Optional expected hash" },
            { name: "maxTokens", placeholder: "16", defaultValue: "16" },
            {
              name: "providerId",
              placeholder: "provider-1",
              defaultValue: "provider-1",
            },
            {
              name: "validatorId",
              placeholder: "validator-1",
              defaultValue: "validator-1",
            },
          ]}
        />
        <OperatorPanel
          title="Fetch job"
          description="Inspect a compute job by id."
          submitLabel="Fetch job"
          mode="computeFetch"
          fields={[
            { name: "email", placeholder: "educator email" },
            { name: "jobId", placeholder: "compute job uuid" },
          ]}
        />
      </section>
    </main>
  );
}
