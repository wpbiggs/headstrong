"use client";

import { useState } from "react";

export function ActionPanel({
  actions,
  email,
  role,
}: {
  actions: Array<{ label: string; path: string }>;
  email?: string;
  role?: "parent" | "educator" | "admin";
}) {
  const [message, setMessage] = useState<string | null>(null);

  async function run(path: string) {
    if (!email || !role) {
      setMessage("Live actions require ?email=...&role=...");
      return;
    }
    try {
      const { postActionLive } = await import("../lib/live-api");
      await postActionLive({ path, email, role, notes: "Confirmed in UI" });
      setMessage(`Action completed: ${path}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  }

  return (
    <section className="card">
      <p className="eyebrow">Actions</p>
      <div className="action-row">
        {actions.map((action) => (
          <button
            key={action.path}
            className="button"
            onClick={() => run(action.path)}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
