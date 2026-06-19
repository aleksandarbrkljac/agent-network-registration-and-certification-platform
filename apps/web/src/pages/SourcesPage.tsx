import { useState } from "react";
import { Button, Card, EmptyState, ErrorBanner, Loading, SectionTitle } from "../components/ui.js";
import { trpc } from "../lib/trpc.js";

/**
 * Sources (`/sources`) — Demo #1 (discover from a repo). Lists configured sources
 * and runs `sources.scan`, surfacing the returned DiscoveryRun counts so the
 * operator sees what discovery created/updated.
 */
export function SourcesPage() {
  const utils = trpc.useUtils();
  const sources = trpc.sources.list.useQuery();
  const [lastScan, setLastScan] = useState<{
    sourceId: string;
    discoveredCount: number;
    createdCount: number;
    updatedCount: number;
  } | null>(null);

  const scan = trpc.sources.scan.useMutation({
    onSuccess: (run) => {
      setLastScan({
        sourceId: run.sourceId,
        discoveredCount: run.discoveredCount,
        createdCount: run.createdCount,
        updatedCount: run.updatedCount,
      });
      // Discovery may create new DISCOVERED agents — refresh the catalog/dashboard.
      void utils.agents.list.invalidate();
      void utils.dashboard.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sources</h1>
        <p className="text-sm text-slate-500">
          Configured agent repositories. Scan a source to discover its agents into the registry.
        </p>
      </div>

      {scan.isError && <ErrorBanner error={scan.error} title="Scan failed" />}

      {lastScan && (
        <Card className="border-emerald-200 bg-emerald-50">
          <p className="text-sm font-medium text-emerald-800">
            Scan complete — discovered {lastScan.discoveredCount}, created {lastScan.createdCount},
            updated {lastScan.updatedCount}.
          </p>
        </Card>
      )}

      <section>
        <SectionTitle>Configured sources</SectionTitle>
        {sources.isLoading ? (
          <Loading />
        ) : sources.isError ? (
          <ErrorBanner error={sources.error} />
        ) : !sources.data ? (
          <Loading />
        ) : sources.data.length === 0 ? (
          <EmptyState>No sources configured.</EmptyState>
        ) : (
          <div className="space-y-3">
            {sources.data.map((source) => {
              const isScanning = scan.isPending && scan.variables?.sourceId === source.id;
              return (
                <Card key={source.id} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{source.repoUrl}</p>
                    <p className="text-xs text-slate-500">
                      {source.type} · branch {source.branch} · {source.agentsPath} ·{" "}
                      {source.enabled ? "enabled" : "disabled"}
                    </p>
                  </div>
                  <Button
                    onClick={() => scan.mutate({ sourceId: source.id })}
                    disabled={isScanning}
                  >
                    {isScanning ? "Scanning…" : "Scan now"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
