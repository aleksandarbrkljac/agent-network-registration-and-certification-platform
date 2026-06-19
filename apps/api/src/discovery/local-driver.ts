import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DiscoveredFile, SourceDriver } from "./source-driver.js";

/**
 * Default, offline, deterministic driver. Reads a bundled snapshot
 * of the real `soofi-xyz-team-kit/agents/*.md` manifests committed under
 * `src/discovery/fixtures/agents/`. No network, fully reproducible — this is what
 * `discovery-service.scan` uses unless a GitHub token + github source selects the
 * GitHub driver.
 *
 * The fixtures are markdown, not TypeScript, so `tsc` does not copy them into
 * `dist/`. We therefore resolve the snapshot against the package source tree by
 * walking up from this module to the package root and into `src/...`. That keeps
 * the driver working under both `tsx`/Vitest (running from `src/`) and the built
 * `dist/` output (reading back into `src/`).
 */

const FIXTURE_SUBPATH = join("src", "discovery", "fixtures", "agents");

/** Walks up from this module until it finds the package root (holds package.json). */
function findPackageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  throw new Error("local-driver: could not locate apps/api package root");
}

export interface LocalDriverOptions {
  /** Absolute path to the manifest directory; defaults to the bundled snapshot. */
  agentsDir?: string;
}

export class LocalSourceDriver implements SourceDriver {
  private readonly agentsDir: string;

  constructor(options: LocalDriverOptions = {}) {
    this.agentsDir = options.agentsDir ?? join(findPackageRoot(), FIXTURE_SUBPATH);
  }

  listAgents(): Promise<DiscoveredFile[]> {
    const files = readdirSync(this.agentsDir)
      .filter((file) => file.endsWith(".md"))
      .sort(); // stable, deterministic order
    const discovered: DiscoveredFile[] = files.map((file) => ({
      path: `agents/${file}`,
      markdown: readFileSync(join(this.agentsDir, file), "utf8"),
    }));
    return Promise.resolve(discovered);
  }
}
