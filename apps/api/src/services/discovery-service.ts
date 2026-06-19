import {
  DISCOVERY_ENTRY_STATUS,
  parseAgentManifest,
  type DiscoveryRun,
  type Source,
} from "@agent-network/shared";
import matter from "gray-matter";
import type { Context } from "../context.js";

/**
 * `gray-matter` exposes a runtime `clearCache()` that its bundled type defs omit.
 * Declare the minimal shape we need so we can call it without `any` and without
 * modifying the shared package (which owns the actual `matter()` parse call).
 */
interface MatterWithClearCache {
  clearCache(): void;
}
const matterCache: MatterWithClearCache = matter as unknown as MatterWithClearCache;
import { GithubSourceDriver } from "../discovery/github-driver.js";
import { LocalSourceDriver } from "../discovery/local-driver.js";
import type { SourceDriver } from "../discovery/source-driver.js";

/**
 * Discovery service. Selects a source driver, parses each manifest
 * with the shared deterministic `parseAgentManifest`, and idempotently upserts
 * DISCOVERED agents keyed on `(slug, sourceId)`. A `DiscoveryRun` summary row is
 * written for scan history.
 *
 * Idempotency guarantees:
 *   - `repositories.agents.upsertDiscovered` matches on `(slug, sourceKey)` and on
 *     UPDATE never touches `status` — so a re-scan cannot clobber a promoted or
 *     certified agent's lifecycle state.
 *   - Parser-derived capabilities/dependencies/IO are written ONLY when the agent
 *     row is newly created. On re-scan we leave curated child rows untouched.
 */

/**
 * Driver selection. A github source uses the GitHub driver when `GITHUB_TOKEN` is
 * present; otherwise (and for any other source) the offline local snapshot driver
 * is used. The override hook lets tests inject a deterministic driver.
 */
export function selectDriver(source: Source, env: NodeJS.ProcessEnv = process.env): SourceDriver {
  if (source.type === "github" && env.GITHUB_TOKEN) {
    return new GithubSourceDriver(source, { token: env.GITHUB_TOKEN });
  }
  return new LocalSourceDriver();
}

export interface ScanOptions {
  /** Inject a driver (tests / GitHub) instead of letting the service select one. */
  driver?: SourceDriver;
}

export async function scan(
  ctx: Context,
  sourceId: string,
  options: ScanOptions = {},
): Promise<DiscoveryRun> {
  const source = await ctx.repositories.sources.get(sourceId);
  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  const driver = options.driver ?? selectDriver(source);
  const startedAt = new Date();
  ctx.logger.info("discovery.scan.start", { sourceId, sourceType: source.type });

  // gray-matter (used by the shared `parseAgentManifest`) caches parse results by
  // input string. For a manifest whose frontmatter is malformed YAML (e.g. the
  // real `oracle.md`, which has an unquoted ":" in its description), the FIRST
  // parse throws and the shared parser's salvage path recovers `name`; but a
  // LATER parse of the identical string returns gray-matter's cached empty result
  // instead of throwing, so the salvage never runs and the slug degrades to the
  // "agent" fallback. Across a long-lived server that re-scans, this makes
  // discovery non-idempotent (a phantom "agent" row appears on re-scan). Clearing
  // the cache before each scan keeps every parse a first parse, restoring
  // determinism without modifying the shared package.
  matterCache.clearCache();

  const files = await driver.listAgents();

  let createdCount = 0;
  let updatedCount = 0;

  for (const file of files) {
    const manifest = parseAgentManifest(file.markdown);

    // Was this (slug, source) already known? Determines create-vs-update so we
    // only seed parser-derived child rows on first discovery.
    const existing = (await ctx.repositories.agents.list({ sourceId })).find(
      (agent) => agent.slug === manifest.slug,
    );

    const agent = await ctx.repositories.agents.upsertDiscovered({
      slug: manifest.slug,
      name: manifest.name,
      description: manifest.description,
      status: DISCOVERY_ENTRY_STATUS,
      sourceType: source.type,
      sourceId,
      sourceRepo: source.repoUrl,
      sourcePath: file.path,
      sourceCommit: file.sha,
      model: manifest.model,
    });

    if (existing) {
      updatedCount += 1;
      continue;
    }

    createdCount += 1;

    // Seed parser-derived capabilities / dependencies / IO on first discovery
    // only. These declarative replaces are safe to run because the agent is brand
    // new (no curated rows yet to clobber).
    await ctx.repositories.capabilities.replaceForAgent(
      agent.id,
      manifest.capabilities.map((c) => ({ name: c.name, description: c.description })),
    );
    await ctx.repositories.dependencies.replaceForAgent(
      agent.id,
      manifest.dependencies.map((d) => ({ kind: d.kind, name: d.name, ref: d.ref })),
    );
    await ctx.repositories.io.replaceForAgent(agent.id, [
      {
        direction: "input",
        name: "request",
        type: "text",
        description: "Natural-language task or invocation for the agent.",
      },
      ...manifest.outputs.map((o) => ({
        direction: "output" as const,
        name: o.name,
        type: "text",
        description: o.description,
      })),
    ]);
  }

  const finishedAt = new Date();
  const run = await ctx.repositories.discoveryRuns.create({
    sourceId,
    discoveredCount: files.length,
    createdCount,
    updatedCount,
    startedAt,
    finishedAt,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  });

  ctx.logger.info("discovery.scan.done", {
    sourceId,
    discoveredCount: files.length,
    createdCount,
    updatedCount,
  });
  return run;
}
