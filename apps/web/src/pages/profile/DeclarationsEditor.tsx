import {
  dependencyKindSchema,
  ioDirectionSchema,
  type AgentCapability,
  type AgentDependency,
  type AgentIo,
  type DependencyKind,
  type IoDirection,
} from "@agent-network/shared";
import { useState } from "react";
import { Button, ErrorBanner } from "../../components/ui.js";
import { trpc } from "../../lib/trpc.js";

/**
 * Declarations editors (Demo #4): declare capabilities, dependencies (incl.
 * agent-to-agent), and the IO contract. Each editor is a small add/remove list
 * that replaces the full set via the matching `agents.*` mutation.
 */

interface CapabilityRow {
  name: string;
  description: string;
}
interface DependencyRow {
  kind: DependencyKind;
  name: string;
  ref: string;
}
interface IoRow {
  direction: IoDirection;
  name: string;
  type: string;
  description: string;
}

const DEP_KINDS = dependencyKindSchema.options;
const IO_DIRECTIONS = ioDirectionSchema.options;

function inputClass(extra = ""): string {
  return `rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none ${extra}`;
}

export function CapabilitiesEditor({
  slug,
  initial,
  onSaved,
}: {
  slug: string;
  initial: AgentCapability[];
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<CapabilityRow[]>(() =>
    initial.map((c) => ({ name: c.name, description: c.description })),
  );
  const mutation = trpc.agents.declareCapabilities.useMutation({ onSuccess: onSaved });

  return (
    <div className="space-y-2">
      {mutation.isError && <ErrorBanner error={mutation.error} title="Save failed" />}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Capability name"
            value={row.name}
            onChange={(e) =>
              setRows(rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))
            }
            className={inputClass("w-48")}
          />
          <input
            placeholder="Description"
            value={row.description}
            onChange={(e) =>
              setRows(rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)))
            }
            className={inputClass("flex-1")}
          />
          <Button variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
            Remove
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => setRows([...rows, { name: "", description: "" }])}
        >
          Add capability
        </Button>
        <Button
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              slug,
              capabilities: rows
                .filter((r) => r.name.trim())
                .map((r) => ({ name: r.name.trim(), description: r.description })),
            })
          }
        >
          {mutation.isPending ? "Saving…" : "Save capabilities"}
        </Button>
        {mutation.isSuccess && <span className="text-sm text-emerald-700">Saved.</span>}
      </div>
    </div>
  );
}

export function DependenciesEditor({
  slug,
  initial,
  onSaved,
}: {
  slug: string;
  initial: AgentDependency[];
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<DependencyRow[]>(() =>
    initial.map((d) => ({ kind: d.kind, name: d.name, ref: d.ref ?? "" })),
  );
  const mutation = trpc.agents.declareDependencies.useMutation({ onSuccess: onSaved });

  return (
    <div className="space-y-2">
      {mutation.isError && <ErrorBanner error={mutation.error} title="Save failed" />}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select
            value={row.kind}
            onChange={(e) =>
              setRows(
                rows.map((r, j) =>
                  j === i ? { ...r, kind: e.target.value as DependencyKind } : r,
                ),
              )
            }
            className={inputClass()}
          >
            {DEP_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            placeholder="Name"
            value={row.name}
            onChange={(e) =>
              setRows(rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))
            }
            className={inputClass("w-40")}
          />
          <input
            placeholder="Ref (skill path / agent slug / package)"
            value={row.ref}
            onChange={(e) =>
              setRows(rows.map((r, j) => (j === i ? { ...r, ref: e.target.value } : r)))
            }
            className={inputClass("flex-1")}
          />
          <Button variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
            Remove
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => setRows([...rows, { kind: "tool", name: "", ref: "" }])}
        >
          Add dependency
        </Button>
        <Button
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              slug,
              dependencies: rows
                .filter((r) => r.name.trim())
                .map((r) => ({
                  kind: r.kind,
                  name: r.name.trim(),
                  ref: r.ref.trim() || undefined,
                })),
            })
          }
        >
          {mutation.isPending ? "Saving…" : "Save dependencies"}
        </Button>
        {mutation.isSuccess && <span className="text-sm text-emerald-700">Saved.</span>}
      </div>
    </div>
  );
}

export function IoEditor({
  slug,
  initial,
  onSaved,
}: {
  slug: string;
  initial: AgentIo[];
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<IoRow[]>(() =>
    initial.map((io) => ({
      direction: io.direction,
      name: io.name,
      type: io.type,
      description: io.description ?? "",
    })),
  );
  const mutation = trpc.agents.setIO.useMutation({ onSuccess: onSaved });

  return (
    <div className="space-y-2">
      {mutation.isError && <ErrorBanner error={mutation.error} title="Save failed" />}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select
            value={row.direction}
            onChange={(e) =>
              setRows(
                rows.map((r, j) =>
                  j === i ? { ...r, direction: e.target.value as IoDirection } : r,
                ),
              )
            }
            className={inputClass()}
          >
            {IO_DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            placeholder="Name"
            value={row.name}
            onChange={(e) =>
              setRows(rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))
            }
            className={inputClass("w-36")}
          />
          <input
            placeholder="Type"
            value={row.type}
            onChange={(e) =>
              setRows(rows.map((r, j) => (j === i ? { ...r, type: e.target.value } : r)))
            }
            className={inputClass("w-28")}
          />
          <input
            placeholder="Description"
            value={row.description}
            onChange={(e) =>
              setRows(rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)))
            }
            className={inputClass("flex-1")}
          />
          <Button variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
            Remove
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() =>
            setRows([...rows, { direction: "input", name: "", type: "", description: "" }])
          }
        >
          Add field
        </Button>
        <Button
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              slug,
              io: rows
                .filter((r) => r.name.trim())
                .map((r) => ({
                  direction: r.direction,
                  name: r.name.trim(),
                  type: r.type,
                  description: r.description.trim() || undefined,
                })),
            })
          }
        >
          {mutation.isPending ? "Saving…" : "Save IO contract"}
        </Button>
        {mutation.isSuccess && <span className="text-sm text-emerald-700">Saved.</span>}
      </div>
    </div>
  );
}
