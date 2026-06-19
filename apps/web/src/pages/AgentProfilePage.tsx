import type { AgentDependency } from "@agent-network/shared";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, ErrorBanner, Loading, SectionTitle, StatusBadge } from "../components/ui.js";
import { formatDateTime, formatDuration } from "../lib/format.js";
import { trpc } from "../lib/trpc.js";
import { CapabilitiesEditor, DependenciesEditor, IoEditor } from "./profile/DeclarationsEditor.js";
import { LifecycleActions } from "./profile/LifecycleActions.js";
import { MetadataEditor } from "./profile/MetadataEditor.js";

/**
 * Agent Profile (`/agents/:slug`) — the densest surface. Covers Demos #3, #4, #5,
 * #6, #10: what/how metadata, capabilities, IO contract, dependencies (incl.
 * agent-to-agent), run history + metrics, review history, lifecycle action
 * buttons, and the metadata/capability/dependency/IO editors.
 */
export function AgentProfilePage() {
  const { slug = "" } = useParams();
  const utils = trpc.useUtils();

  const detail = trpc.agents.getDetail.useQuery({ slug }, { enabled: Boolean(slug) });
  const runs = trpc.runs.listByAgent.useQuery({ slug }, { enabled: Boolean(slug) });
  const metrics = trpc.runs.metrics.useQuery({ slug }, { enabled: Boolean(slug) });
  const reviews = trpc.certification.listReviews.useQuery({ slug }, { enabled: Boolean(slug) });

  const [openEditor, setOpenEditor] = useState<
    null | "metadata" | "capabilities" | "dependencies" | "io"
  >(null);

  // Refresh every profile query after a mutation so the page reflects new state.
  function refresh() {
    void utils.agents.getDetail.invalidate({ slug });
    void utils.runs.listByAgent.invalidate({ slug });
    void utils.runs.metrics.invalidate({ slug });
    void utils.certification.listReviews.invalidate({ slug });
    void utils.dashboard.invalidate();
    void utils.agents.list.invalidate();
    void utils.marketplace.invalidate();
  }

  if (detail.isLoading) return <Loading />;
  if (detail.isError) return <ErrorBanner error={detail.error} />;
  if (!detail.data) return <Loading />;

  const { agent, capabilities, dependencies, io } = detail.data;
  const inputs = io.filter((i) => i.direction === "input");
  const outputs = io.filter((i) => i.direction === "output");

  return (
    <div className="space-y-8">
      <div>
        <Link to="/catalog" className="text-sm text-slate-500 hover:underline">
          ← Catalog
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{agent.name}</h1>
          <StatusBadge status={agent.status} />
          <span className="text-sm text-slate-400">v{agent.version || "—"}</span>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          {agent.description || "No description."}
        </p>
      </div>

      {/* Lifecycle actions */}
      <section>
        <SectionTitle>Lifecycle</SectionTitle>
        <Card>
          <LifecycleActions agent={agent} onChanged={refresh} />
        </Card>
      </section>

      {/* What / How */}
      <section>
        <SectionTitle>What &amp; how</SectionTitle>
        <Card>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Purpose" value={agent.purpose} />
            <Field label="Model" value={agent.model} />
            <Field
              label="Source"
              value={`${agent.sourceType}${agent.sourceRepo ? ` · ${agent.sourceRepo}` : ""}`}
            />
            <Field label="Documentation" value={agent.documentation} wide />
          </dl>
        </Card>
      </section>

      {/* Capabilities */}
      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>Capabilities</SectionTitle>
          <EditorToggle
            open={openEditor === "capabilities"}
            onToggle={() => setOpenEditor(openEditor === "capabilities" ? null : "capabilities")}
          />
        </div>
        {openEditor === "capabilities" ? (
          <Card>
            <CapabilitiesEditor
              slug={agent.slug}
              initial={capabilities}
              onSaved={() => {
                refresh();
                setOpenEditor(null);
              }}
            />
          </Card>
        ) : capabilities.length === 0 ? (
          <p className="text-sm text-slate-400">No capabilities declared.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {capabilities.map((cap) => (
              <li key={cap.id}>
                <Card>
                  <p className="font-medium text-slate-900">{cap.name}</p>
                  {cap.description && (
                    <p className="mt-1 text-sm text-slate-600">{cap.description}</p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* IO contract */}
      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>IO contract</SectionTitle>
          <EditorToggle
            open={openEditor === "io"}
            onToggle={() => setOpenEditor(openEditor === "io" ? null : "io")}
          />
        </div>
        {openEditor === "io" ? (
          <Card>
            <IoEditor
              slug={agent.slug}
              initial={io}
              onSaved={() => {
                refresh();
                setOpenEditor(null);
              }}
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <IoColumn title="Inputs" rows={inputs} />
            <IoColumn title="Outputs" rows={outputs} />
          </div>
        )}
      </section>

      {/* Dependencies (incl. agent-to-agent) */}
      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>Dependencies</SectionTitle>
          <EditorToggle
            open={openEditor === "dependencies"}
            onToggle={() => setOpenEditor(openEditor === "dependencies" ? null : "dependencies")}
          />
        </div>
        {openEditor === "dependencies" ? (
          <Card>
            <DependenciesEditor
              slug={agent.slug}
              initial={dependencies}
              onSaved={() => {
                refresh();
                setOpenEditor(null);
              }}
            />
          </Card>
        ) : (
          <DependencyGraph agentName={agent.name} dependencies={dependencies} />
        )}
      </section>

      {/* Metadata editor */}
      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>Metadata</SectionTitle>
          <EditorToggle
            open={openEditor === "metadata"}
            onToggle={() => setOpenEditor(openEditor === "metadata" ? null : "metadata")}
          />
        </div>
        {openEditor === "metadata" && (
          <Card>
            <MetadataEditor
              agent={agent}
              onSaved={() => {
                refresh();
                setOpenEditor(null);
              }}
            />
          </Card>
        )}
        {openEditor !== "metadata" && (
          <p className="text-sm text-slate-400">
            Install / usage guidance and other metadata. Open the editor to complete it.
          </p>
        )}
      </section>

      {/* Run history + metrics */}
      <section>
        <SectionTitle>Run history &amp; metrics</SectionTitle>
        <Card className="mb-3">
          {metrics.isLoading ? (
            <Loading />
          ) : metrics.isError ? (
            <ErrorBanner error={metrics.error} />
          ) : !metrics.data ? (
            <Loading />
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Metric label="Total" value={metrics.data.total} />
              <Metric label="Succeeded" value={metrics.data.succeeded} />
              <Metric label="Failed" value={metrics.data.failed} />
              <Metric label="Avg duration" value={formatDuration(metrics.data.avgDurationMs)} />
            </dl>
          )}
        </Card>
        {runs.isLoading ? (
          <Loading />
        ) : runs.isError ? (
          <ErrorBanner error={runs.error} />
        ) : !runs.data ? (
          <Loading />
        ) : runs.data.length === 0 ? (
          <p className="text-sm text-slate-400">
            No runs yet. Use “Simulate run” above to record one.
          </p>
        ) : (
          <Card className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-2 font-medium">Started</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                  <th className="px-4 py-2 font-medium">Caller</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.data.map((run) => (
                  <tr key={run.id}>
                    <td className="px-4 py-2">{formatDateTime(run.startedAt)}</td>
                    <td className="px-4 py-2">{run.status}</td>
                    <td className="px-4 py-2">{formatDuration(run.durationMs)}</td>
                    <td className="px-4 py-2 text-slate-500">{run.caller ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* Review history */}
      <section>
        <SectionTitle>Review history</SectionTitle>
        {reviews.isLoading ? (
          <Loading />
        ) : reviews.isError ? (
          <ErrorBanner error={reviews.error} />
        ) : !reviews.data ? (
          <Loading />
        ) : reviews.data.length === 0 ? (
          <p className="text-sm text-slate-400">No reviews yet.</p>
        ) : (
          <ul className="space-y-2">
            {reviews.data.map((review) => (
              <li key={review.id}>
                <Card>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{review.decision}</span>
                    <span className="text-xs text-slate-400">
                      {formatDateTime(review.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{review.notes}</p>
                  {review.evaluationOutcome && (
                    <p className="mt-1 text-xs text-slate-400">
                      outcome: {review.evaluationOutcome}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function IoColumn({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; name: string; type: string; description?: string }[];
}) {
  return (
    <Card>
      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">None.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((row) => (
            <li key={row.id}>
              <span className="font-medium text-slate-800">{row.name}</span>
              <span className="text-slate-400"> : {row.type || "any"}</span>
              {row.description && <p className="text-xs text-slate-500">{row.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Dependency "graph" — a grouped list rendering, with agent-to-agent links
 * navigating to the target agent's profile (rendered as a simple list/graph).
 */
function DependencyGraph({
  agentName,
  dependencies,
}: {
  agentName: string;
  dependencies: AgentDependency[];
}) {
  if (dependencies.length === 0) {
    return <p className="text-sm text-slate-400">No dependencies declared.</p>;
  }
  const byKind = new Map<string, AgentDependency[]>();
  for (const dep of dependencies) {
    byKind.set(dep.kind, [...(byKind.get(dep.kind) ?? []), dep]);
  }
  return (
    <Card>
      <p className="mb-3 text-sm text-slate-500">
        <span className="font-medium text-slate-800">{agentName}</span> depends on:
      </p>
      <div className="space-y-3">
        {[...byKind.entries()].map(([kind, deps]) => (
          <div key={kind}>
            <p className="text-xs font-semibold uppercase text-slate-400">{kind}</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {deps.map((dep) => (
                <li
                  key={dep.id}
                  className="rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-700"
                >
                  {dep.kind === "agent" && dep.ref ? (
                    <Link to={`/agents/${dep.ref}`} className="text-slate-900 hover:underline">
                      {dep.name} →
                    </Link>
                  ) : (
                    <span>
                      {dep.name}
                      {dep.ref && <span className="text-slate-400"> ({dep.ref})</span>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EditorToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline"
    >
      {open ? "Close editor" : "Edit"}
    </button>
  );
}
