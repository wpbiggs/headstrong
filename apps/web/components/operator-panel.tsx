"use client";

import { useState } from "react";

type OperatorMode =
  | "campaignCreate"
  | "lmsPublish"
  | "lmsCompletion"
  | "computeScheduleInference"
  | "computeFetch";

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
        />
      ))}
      <button className="button" disabled={submitting} type="submit">
        {submitting ? "Working..." : submitLabel}
      </button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
