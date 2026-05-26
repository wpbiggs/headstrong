import { OperatorPanel } from "../../components/operator-panel";
import { fetchComputeJobsLive } from "../../lib/live-api";

interface ComputeListItem {
  id: string;
  status: string;
  type: string;
}

const demoJobs = {
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      status: "queued",
      type: "inference",
      providerId: "provider-1",
      validatorId: "validator-1",
    },
  ],
  nextCursor: null,
};

export default async function ComputePage({
  searchParams,
}: { searchParams: { email?: string } }) {
  const jobs = searchParams.email
    ? await fetchComputeJobsLive({
        email: searchParams.email,
        role: "educator",
        limit: 20,
      }).catch(() => demoJobs)
    : demoJobs;
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
        <OperatorPanel
          title="Process next queued job"
          description="Worker-style queue processing for the next queued job."
          submitLabel="Process next job"
          mode="computeProcessNext"
          fields={[{ name: "email", placeholder: "educator email" }]}
        />
      </section>
      <section className="card">
        <h2>Recent jobs</h2>
        {(jobs.items as ComputeListItem[]).map((job) => (
          <div key={job.id} className="history-row">
            <strong>{job.id}</strong>
            <span>{job.type}</span>
            <span>{job.status}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
