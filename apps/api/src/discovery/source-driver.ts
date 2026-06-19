/**
 * Source driver interface. A driver knows how to enumerate the raw
 * agent manifests behind a `Source`. The discovery service parses each markdown
 * blob with the shared `parseAgentManifest` and upserts the result — so drivers
 * stay dumb (fetch only) and the parsing/persistence rules live in one place.
 */

/** One discovered manifest file: its path, an optional content hash, and the raw markdown. */
export interface DiscoveredFile {
  /** Repo-relative path, e.g. `agents/metagross.md`. Used as `sourcePath`. */
  path: string;
  /** Content SHA when the driver can supply one (GitHub blob sha); `sourceCommit`. */
  sha?: string;
  /** Raw manifest markdown to hand to `parseAgentManifest`. */
  markdown: string;
}

export interface SourceDriver {
  /** Lists every agent manifest the source exposes. */
  listAgents(): Promise<DiscoveredFile[]>;
}
