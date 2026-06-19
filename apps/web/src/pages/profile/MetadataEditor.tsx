import type { Agent } from "@agent-network/shared";
import { useState } from "react";
import { Button, ErrorBanner } from "../../components/ui.js";
import { trpc } from "../../lib/trpc.js";

/**
 * Metadata editor (Demo #3 "complete metadata"). Patches the editable text fields
 * via `agents.updateMetadata`. Marketplace-facing fields (install/usage) live here
 * too so a certified agent's listing reads cleanly.
 */
const FIELDS: { key: keyof FormState; label: string; textarea?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "purpose", label: "Purpose" },
  { key: "version", label: "Version" },
  { key: "model", label: "Model" },
  { key: "description", label: "Description", textarea: true },
  { key: "documentation", label: "Documentation", textarea: true },
  { key: "installInstructions", label: "Install instructions", textarea: true },
  { key: "usageGuidance", label: "Usage guidance", textarea: true },
];

interface FormState {
  name: string;
  purpose: string;
  version: string;
  model: string;
  description: string;
  documentation: string;
  installInstructions: string;
  usageGuidance: string;
}

function toForm(agent: Agent): FormState {
  return {
    name: agent.name,
    purpose: agent.purpose ?? "",
    version: agent.version ?? "",
    model: agent.model ?? "",
    description: agent.description ?? "",
    documentation: agent.documentation ?? "",
    installInstructions: agent.installInstructions ?? "",
    usageGuidance: agent.usageGuidance ?? "",
  };
}

export function MetadataEditor({ agent, onSaved }: { agent: Agent; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(() => toForm(agent));
  const update = trpc.agents.updateMetadata.useMutation({ onSuccess: onSaved });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({ slug: agent.slug, patch: form });
      }}
    >
      {update.isError && <ErrorBanner error={update.error} title="Save failed" />}
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label
            key={field.key}
            className={`block text-sm ${field.textarea ? "sm:col-span-2" : ""}`}
          >
            <span className="text-slate-600">{field.label}</span>
            {field.textarea ? (
              <textarea
                value={form[field.key]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
              />
            ) : (
              <input
                value={form[field.key]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
              />
            )}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save metadata"}
        </Button>
        {update.isSuccess && <span className="text-sm text-emerald-700">Saved.</span>}
      </div>
    </form>
  );
}
