import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, ErrorBanner } from "../components/ui.js";
import { trpc } from "../lib/trpc.js";

/**
 * Register Agent (`/register`) — Demo #3. Manually registers an agent via
 * `agents.registerManual` (enters at REGISTERED), then routes to its profile so
 * the operator can complete metadata, capabilities, dependencies, and IO.
 */
interface FormState {
  slug: string;
  name: string;
  description: string;
  purpose: string;
  version: string;
  model: string;
}

const EMPTY: FormState = {
  slug: "",
  name: "",
  description: "",
  purpose: "",
  version: "1.0.0",
  model: "",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<FormState>(EMPTY);

  const register = trpc.agents.registerManual.useMutation({
    onSuccess: (agent) => {
      void utils.agents.list.invalidate();
      void utils.dashboard.invalidate();
      navigate(`/agents/${agent.slug}`);
    },
  });

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm({ ...form, [key]: value });
  }

  const canSubmit = form.slug.trim() && form.name.trim();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Register Agent</h1>
        <p className="text-sm text-slate-500">
          Manually register an agent into the registry. It enters at REGISTERED; complete its
          metadata and declarations on the next screen.
        </p>
      </div>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            register.mutate({
              slug: form.slug.trim(),
              name: form.name.trim(),
              description: form.description || undefined,
              purpose: form.purpose || undefined,
              version: form.version || undefined,
              model: form.model || undefined,
            });
          }}
        >
          {register.isError && <ErrorBanner error={register.error} title="Registration failed" />}

          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="Slug *" hint="Unique identifier, e.g. my-agent">
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                required
                className={fieldClass}
              />
            </Labeled>
            <Labeled label="Name *">
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                className={fieldClass}
              />
            </Labeled>
            <Labeled label="Version">
              <input
                value={form.version}
                onChange={(e) => set("version", e.target.value)}
                className={fieldClass}
              />
            </Labeled>
            <Labeled label="Model">
              <input
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="e.g. gpt-5.5-high"
                className={fieldClass}
              />
            </Labeled>
            <Labeled label="Purpose" wide>
              <input
                value={form.purpose}
                onChange={(e) => set("purpose", e.target.value)}
                className={fieldClass}
              />
            </Labeled>
            <Labeled label="Description" wide>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                className={fieldClass}
              />
            </Labeled>
          </div>

          <Button type="submit" disabled={!canSubmit || register.isPending}>
            {register.isPending ? "Registering…" : "Register agent"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

function Labeled({
  label,
  hint,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-slate-600">{label}</span>
      {hint && <span className="ml-1 text-xs text-slate-400">{hint}</span>}
      {children}
    </label>
  );
}
