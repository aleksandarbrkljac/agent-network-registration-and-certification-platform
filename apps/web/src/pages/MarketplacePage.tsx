import { useMemo, useState } from "react";
import { Button, Card, EmptyState, ErrorBanner, Loading, SectionTitle } from "../components/ui.js";
import { trpc } from "../lib/trpc.js";

/**
 * Marketplace (`/marketplace`) — Demos #6/#7/#8. Lists CERTIFIED agents only
 * (`marketplace.listPublished`), with search so developers can discover. Selecting
 * a card shows install instructions + usage guidance and a copy-install affordance
 * to reuse the agent. Publishing itself happens on the gated profile action.
 */
export function MarketplacePage() {
  const listed = trpc.marketplace.listPublished.useQuery();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const data = listed.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((listing) => {
      const haystack = [
        listing.agent.name,
        listing.agent.description ?? "",
        ...listing.capabilities.map((c) => c.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [listed.data, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Marketplace</h1>
        <p className="text-sm text-slate-500">
          Certified agents available for reuse. Search, explore install &amp; usage, and copy the
          install snippet.
        </p>
      </div>

      <input
        type="search"
        placeholder="Search certified agents…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-72 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        aria-label="Search marketplace"
      />

      {listed.isLoading ? (
        <Loading />
      ) : listed.isError ? (
        <ErrorBanner error={listed.error} />
      ) : filtered.length === 0 ? (
        <EmptyState>
          No certified agents{search ? " match your search" : " yet"}. Certify an agent from the
          review queue, then publish it from its profile.
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <SectionTitle>Listings ({filtered.length})</SectionTitle>
            {filtered.map((listing) => (
              <button
                key={listing.agent.id}
                onClick={() => setSelected(listing.agent.slug)}
                className={`block w-full rounded-lg border p-4 text-left shadow-sm transition ${
                  selected === listing.agent.slug
                    ? "border-slate-900 bg-white"
                    : "border-slate-200 bg-white hover:border-slate-400"
                }`}
              >
                <p className="font-medium text-slate-900">{listing.agent.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {listing.agent.description || "No description."}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {listing.capabilities.slice(0, 3).map((cap) => (
                    <span
                      key={cap.id}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                    >
                      {cap.name}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div>
            <SectionTitle>Detail</SectionTitle>
            {selected ? (
              <ListingDetail slug={selected} />
            ) : (
              <EmptyState>Select a listing to see install &amp; usage guidance.</EmptyState>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ListingDetail({ slug }: { slug: string }) {
  const listing = trpc.marketplace.getListing.useQuery({ slug });
  const [copied, setCopied] = useState(false);

  if (listing.isLoading) return <Loading />;
  if (listing.isError) return <ErrorBanner error={listing.error} />;
  if (!listing.data) return <EmptyState>Listing not available.</EmptyState>;

  const { agent, capabilities, dependencies, io } = listing.data;
  const installSnippet = agent.installInstructions ?? `Add \`${agent.slug}\` to your agent kit.`;

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(installSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{agent.name}</h3>
        <p className="text-sm text-slate-600">{agent.description || "No description."}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-slate-400">Install</p>
        <pre className="mt-1 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
          {installSnippet}
        </pre>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="secondary" onClick={() => void copyInstall()}>
            {copied ? "Copied!" : "Copy install / reuse"}
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-slate-400">Usage guidance</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
          {agent.usageGuidance || "No usage guidance provided."}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-slate-400">Capabilities</p>
        <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
          {capabilities.map((cap) => (
            <li key={cap.id}>{cap.name}</li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">IO</p>
          <p className="mt-1 text-slate-600">
            {io.filter((i) => i.direction === "input").length} in ·{" "}
            {io.filter((i) => i.direction === "output").length} out
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Dependencies</p>
          <p className="mt-1 text-slate-600">{dependencies.length} declared</p>
        </div>
      </div>
    </Card>
  );
}
