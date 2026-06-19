import type { AgentStatus } from "@agent-network/shared";
import { Link } from "react-router-dom";
import { Sparkline } from "../components/Sparkline.js";
import {
  Card,
  EmptyState,
  ErrorBanner,
  Loading,
  SectionTitle,
  StatusBadge,
} from "../components/ui.js";
import { formatDateTime } from "../lib/format.js";
import { trpc } from "../lib/trpc.js";

/**
 * Dashboard (`/`) — Demo #9 + #10. Status-count cards, certification stats, the
 * adoption trend sparkline, fleet run metrics, and the activity feed. Every panel
 * is an independent tRPC query with its own loading/error state.
 */
export function DashboardPage() {
  const statusCounts = trpc.dashboard.statusCounts.useQuery();
  const certStats = trpc.dashboard.certificationStats.useQuery();
  const adoption = trpc.dashboard.adoptionTrend.useQuery();
  const activity = trpc.dashboard.activityFeed.useQuery({ limit: 20 });
  const metrics = trpc.runs.metrics.useQuery(undefined);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Inventory, certification health, adoption, and recent activity across the agent network.
        </p>
      </div>

      <section>
        <SectionTitle>Inventory by status</SectionTitle>
        {statusCounts.isLoading ? (
          <Loading />
        ) : statusCounts.isError ? (
          <ErrorBanner error={statusCounts.error} />
        ) : !statusCounts.data ? (
          <Loading />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {(Object.entries(statusCounts.data) as [AgentStatus, number][]).map(
              ([status, count]) => (
                <Card key={status} className="text-center">
                  <div className="text-2xl font-semibold text-slate-900">{count}</div>
                  <div className="mt-2 flex justify-center">
                    <StatusBadge status={status} />
                  </div>
                </Card>
              ),
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle>Certification</SectionTitle>
          {certStats.isLoading ? (
            <Loading />
          ) : certStats.isError ? (
            <ErrorBanner error={certStats.error} />
          ) : !certStats.data ? (
            <Loading />
          ) : (
            <Card>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Stat label="Certified" value={certStats.data.certified} />
                <Stat label="In review" value={certStats.data.inReview} />
                <Stat label="Changes requested" value={certStats.data.changesRequested} />
                <Stat label="Rejected" value={certStats.data.rejected} />
                <div className="col-span-2">
                  <dt className="text-slate-500">Certification rate</dt>
                  <dd className="mt-1 text-lg font-semibold text-emerald-700">
                    {(certStats.data.certificationRate * 100).toFixed(0)}%
                  </dd>
                </div>
              </dl>
            </Card>
          )}
        </section>

        <section>
          <SectionTitle>Run metrics (fleet)</SectionTitle>
          {metrics.isLoading ? (
            <Loading />
          ) : metrics.isError ? (
            <ErrorBanner error={metrics.error} />
          ) : !metrics.data ? (
            <Loading />
          ) : (
            <Card>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Stat label="Total runs" value={metrics.data.total} />
                <Stat label="Succeeded" value={metrics.data.succeeded} />
                <Stat label="Failed" value={metrics.data.failed} />
                <Stat label="Running" value={metrics.data.running} />
              </dl>
            </Card>
          )}
        </section>
      </div>

      <section>
        <SectionTitle>Adoption trend</SectionTitle>
        {adoption.isLoading ? (
          <Loading />
        ) : adoption.isError ? (
          <ErrorBanner error={adoption.error} />
        ) : !adoption.data ? (
          <Loading />
        ) : adoption.data.length === 0 ? (
          <EmptyState>No runs recorded yet. Simulate a run from an agent profile.</EmptyState>
        ) : (
          <Card>
            <Sparkline values={adoption.data.map((p) => p.runs)} />
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>{adoption.data[0]?.date}</span>
              <span>{adoption.data[adoption.data.length - 1]?.date}</span>
            </div>
          </Card>
        )}
      </section>

      <section>
        <SectionTitle>Recent activity</SectionTitle>
        {activity.isLoading ? (
          <Loading />
        ) : activity.isError ? (
          <ErrorBanner error={activity.error} />
        ) : !activity.data ? (
          <Loading />
        ) : activity.data.length === 0 ? (
          <EmptyState>No activity yet.</EmptyState>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-slate-100">
              {activity.data.map((item, i) => (
                <li
                  key={`${item.agentSlug}-${i}`}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        item.kind === "review"
                          ? "bg-violet-100 text-violet-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {item.kind}
                    </span>
                    <Link
                      to={`/agents/${item.agentSlug}`}
                      className="text-slate-700 hover:underline"
                    >
                      {item.summary}
                    </Link>
                  </span>
                  <span className="text-xs text-slate-400">{formatDateTime(item.at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
