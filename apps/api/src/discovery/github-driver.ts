import type { Source } from "@agent-network/shared";
import type { DiscoveredFile, SourceDriver } from "./source-driver.js";

/**
 * Optional GitHub driver. Behind `GITHUB_TOKEN`: lists the source's
 * `agentsPath` via the GitHub contents API and fetches each `*.md` manifest. The
 * local driver remains the default; this only activates for a github-typed source
 * when a token is present.
 *
 * `octokit` is an OPTIONAL dependency, so it is imported dynamically and typed
 * against a minimal local contract. This keeps `apps/api` building and typechecking
 * even when octokit is not installed (no `any`, no hard import).
 */

/** The slice of the Octokit contents API this driver actually uses. */
interface OctokitContentItem {
  type: string;
  name: string;
  path: string;
  sha: string;
}
interface OctokitContentFile {
  content?: string;
  encoding?: string;
  sha?: string;
}
interface OctokitLike {
  rest: {
    repos: {
      getContent(params: {
        owner: string;
        repo: string;
        path: string;
        ref?: string;
      }): Promise<{ data: OctokitContentItem[] | OctokitContentFile }>;
    };
  };
}
interface OctokitModule {
  Octokit: new (options: { auth?: string }) => OctokitLike;
}

/** Parses `owner/repo` out of an https or git repo URL. */
export function parseOwnerRepo(repoUrl: string): { owner: string; repo: string } {
  const cleaned = repoUrl
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^git@github\.com:/, "");
  const [owner, repo] = cleaned.split("/");
  if (!owner || !repo) {
    throw new Error(`github-driver: cannot parse owner/repo from "${repoUrl}"`);
  }
  return { owner, repo };
}

export interface GithubDriverOptions {
  token: string;
}

export class GithubSourceDriver implements SourceDriver {
  private readonly source: Source;
  private readonly token: string;

  constructor(source: Source, options: GithubDriverOptions) {
    this.source = source;
    this.token = options.token;
  }

  async listAgents(): Promise<DiscoveredFile[]> {
    const mod = (await import("octokit")) as unknown as OctokitModule;
    const octokit = new mod.Octokit({ auth: this.token });
    const { owner, repo } = parseOwnerRepo(this.source.repoUrl);
    const path = this.source.agentsPath.replace(/\/$/, "");

    const listing = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: this.source.branch,
    });
    if (!Array.isArray(listing.data)) {
      throw new Error(`github-driver: ${path} is not a directory`);
    }

    const mdFiles = listing.data.filter(
      (item) => item.type === "file" && item.name.endsWith(".md"),
    );

    const discovered: DiscoveredFile[] = [];
    for (const item of mdFiles) {
      const file = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: item.path,
        ref: this.source.branch,
      });
      const data = file.data;
      if (Array.isArray(data) || !data.content) {
        continue;
      }
      const markdown = Buffer.from(data.content, "base64").toString("utf8");
      discovered.push({ path: item.path, sha: item.sha, markdown });
    }
    return discovered;
  }
}
