import { AGENT_STATUSES, type AgentStatus } from "@agent-network/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, EmptyState, ErrorBanner, Loading, StatusBadge } from "../components/ui.js";
import { trpc } from "../lib/trpc.js";

/**
 * Catalog (`/catalog`) — Demo #2. All agents with a status filter + text/capability
 * search (`agents.list({status,q})`), each row linking to its profile, and an
 * inline Promote action for DISCOVERED agents.
 */
export function CatalogPage() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<AgentStatus | "">("");
  const [q, setQ] = useState("");

  const agents = trpc.agents.list.useQuery({
    status: status || undefined,
    q: q.trim() || undefined,
  });

  const promote = trpc.agents.promote.useMutation({
    onSuccess: () => {
      void utils.agents.list.invalidate();
      void utils.dashboard.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Catalog</h1>
        <p className="text-sm text-slate-500">
          Every agent in the registry. Filter by status, search by capability or name, and promote
          discovered agents.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by name or capability…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          aria-label="Search agents"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AgentStatus | "")}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {AGENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        {(status || q) && (
          <Button
            variant="ghost"
            onClick={() => {
              setStatus("");
              setQ("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {promote.isError && <ErrorBanner error={promote.error} title="Promote failed" />}

      {agents.isLoading ? (
        <Loading />
      ) : agents.isError ? (
        <ErrorBanner error={agents.error} />
      ) : !agents.data ? (
        <Loading />
      ) : agents.data.length === 0 ? (
        <EmptyState>No agents match the current filters.</EmptyState>
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agents.data.map((agent) => (
                <tr key={agent.id} data-testid="catalog-row" className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link
                      to={`/agents/${agent.slug}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {agent.name}
                    </Link>
                    <p className="max-w-md truncate text-xs text-slate-500">
                      {agent.description || "No description."}
                    </p>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{agent.sourceType}</td>
                  <td className="px-4 py-2 text-right">
                    {agent.status === "DISCOVERED" ? (
                      <Button
                        variant="secondary"
                        onClick={() => promote.mutate({ slug: agent.slug })}
                        disabled={promote.isPending && promote.variables?.slug === agent.slug}
                      >
                        {promote.isPending && promote.variables?.slug === agent.slug
                          ? "Promoting…"
                          : "Promote"}
                      </Button>
                    ) : (
                      <Link
                        to={`/agents/${agent.slug}`}
                        className="text-xs font-medium text-slate-500 hover:underline"
                      >
                        View →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {promote.isSuccess && <p className="text-sm text-emerald-700">Promoted to the registry.</p>}
    </div>
  );
}
