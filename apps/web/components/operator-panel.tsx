"use client";

import { useState } from "react";

type OperatorMode =
  | "campaignCreate"
  | "campaignAllocate"
  | "commonsCreate"
  | "commonsRemix"
  | "lmsPublish"
  | "lmsCompletion"
  | "computeScheduleInference"
  | "computeFetch"
  | "computeProcessNext";

async function runOperatorAction(
  mode: OperatorMode,
  values: Record<string, string>,
) {
  const liveApi = await import("../lib/live-api");

  switch (mode) {
    case "campaignCreate": {
      const campaign = await liveApi.createCampaignLive({
        email: values.email,
        role: "admin",
        educatorUserId: values.educatorUserId,
        title: values.title,
        description: values.description,
        openingPledgeUsd: Number(values.openingPledgeUsd || 0),
      });
      return `Campaign created: ${campaign.id}`;
    }
    case "campaignAllocate": {
      const campaign = await liveApi.allocateCampaignLive({
        id: values.campaignId,
        email: values.email,
        educatorId: values.educatorId,
        amount: Number(values.amount),
        note: values.note,
      });
      return `Allocation applied. Outstanding: ${campaign.totals.outstandingUsd}`;
    }
    case "commonsCreate": {
      const asset = await liveApi.createCommonsAssetLive({
        email: values.email,
        role: values.role as "educator" | "expert" | "admin",
        title: values.title,
        slug: values.slug,
        summary: values.summary,
        subject: values.subject,
        gradeBand: values.gradeBand,
        license: values.license,
        sourceUrl: values.sourceUrl,
        tags: values.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      return `Asset created: ${asset.id}`;
    }
    case "commonsRemix": {
      const asset = await liveApi.remixCommonsAssetLive({
        assetId: values.assetId,
        email: values.email,
        role: values.role as "educator" | "expert" | "admin",
        title: values.title,
        slug: values.slug,
        summary: values.summary,
        relation: values.relation as
          | "remixed_from"
          | "translated_from"
          | "adapted_from",
      });
      return `Remix created: ${asset.asset.id}`;
    }
    case "lmsPublish": {
      const result = await liveApi.publishQuestToLmsLive({
        questId: values.questId,
        email: values.email,
        role: "educator",
      });
      return `Published quest with idempotency key: ${result.idempotencyKey}`;
    }
    case "lmsCompletion": {
      const result = await liveApi.recordLmsCompletionLive({
        questId: values.questId,
        email: values.email,
        role: "educator",
        learnerId: values.learnerId,
        assignmentExternalId: values.assignmentExternalId,
        score: Number(values.score),
        completedAt: values.completedAt,
        skillId: values.skillId,
      });
      return `Mastery updated: score ${result.score}, evidence ${result.evidenceCount}`;
    }
    case "computeScheduleInference": {
      const result = await liveApi.scheduleComputeJobLive({
        email: values.email,
        role: "educator",
        type: "inference",
        payload: {
          model: values.model,
          prompt: values.prompt,
          expectedOutput: values.expectedOutput || undefined,
          maxTokens: Number(values.maxTokens || 16),
          aggregateOnly: true,
        },
        providerId: values.providerId,
        validatorId: values.validatorId,
      });
      return `Job ${result.id} finished with status ${result.status}`;
    }
    case "computeFetch": {
      const result = await liveApi.fetchComputeJobLive({
        id: values.jobId,
        email: values.email,
        role: "educator",
      });
      return `Job ${result.id}: ${result.status}`;
    }
    case "computeProcessNext": {
      const result = await liveApi.processNextComputeJobLive({
        email: values.email,
        role: "educator",
      });
      return result
        ? `Processed job ${result.id} with status ${result.status}`
        : "No queued jobs.";
    }
  }
}

export function OperatorPanel({
  title,
  description,
  fields,
  submitLabel,
  mode,
}: {
  title: string;
  description: string;
  fields: Array<{ name: string; placeholder: string; defaultValue?: string }>;
  submitLabel: string;
  mode: OperatorMode;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      fields.map((field) => [field.name, field.defaultValue ?? ""]),
    ),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await runOperatorAction(mode, values);
      setMessage(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <p className="eyebrow">Operator</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <p role="note">
        Legacy operator preview: email/role login is disabled. These actions
        require a token-aware operator UI before live use; no session is issued
        from the fields below.
      </p>
      {fields.map((field) => (
        <input
          key={field.name}
          className="input"
          value={values[field.name] ?? ""}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              [field.name]: event.target.value,
            }))
          }
          placeholder={field.placeholder}
          aria-label={field.name}
        />
      ))}
      <button className="button" disabled={submitting} type="submit">
        {submitting ? "Working..." : submitLabel}
      </button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
