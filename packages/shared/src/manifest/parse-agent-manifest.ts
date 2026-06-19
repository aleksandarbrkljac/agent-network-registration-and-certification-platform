import matter from "gray-matter";
import { z } from "zod";

/**
 * Deterministic (NO LLM) agent-manifest parser. Splits gray-matter frontmatter
 * from the imperative body, then applies the heuristics (with extra hardening)
 * to derive capabilities, IO outputs, and dependencies.
 *
 * Design goals: never throw on a well-formed-but-sparse manifest, never yield
 * zero capabilities, and never store whole multi-paragraph steps verbatim.
 */

const SHORT_LABEL_MAX = 120;
const DESCRIPTION_MAX = 600;

// --- Public schema / types --------------------------------------------------

export const parsedCapabilitySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
});
export type ParsedCapability = z.infer<typeof parsedCapabilitySchema>;

export const parsedOutputSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
});
export type ParsedOutput = z.infer<typeof parsedOutputSchema>;

export const parsedDependencySchema = z.object({
  kind: z.enum(["tool", "datasource", "agent", "package", "skill"]),
  name: z.string().min(1),
  ref: z.string().optional(),
});
export type ParsedDependency = z.infer<typeof parsedDependencySchema>;

export const parsedAgentManifestSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  model: z.string().optional(),
  capabilities: z.array(parsedCapabilitySchema).min(1),
  outputs: z.array(parsedOutputSchema),
  dependencies: z.array(parsedDependencySchema),
});
export type ParsedAgentManifest = z.infer<typeof parsedAgentManifestSchema>;

// --- Frontmatter ------------------------------------------------------------

const frontmatterSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  model: z.string().optional(),
});

// --- Small text helpers -----------------------------------------------------

export function toKebabCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** First sentence of `text`, falling back to the whole (trimmed) string. */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^.*?[.!?](?=\s|$)/s);
  return (match?.[0] ?? trimmed).trim();
}

/** Collapses whitespace and truncates to `max` chars with an ellipsis. */
function truncate(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) {
    return collapsed;
  }
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}

/** A short, single-line capability label derived from a (possibly huge) step. */
function shortLabel(stepText: string): string {
  const collapsed = stepText.replace(/\s+/g, " ").trim();
  // Drop a leading bold lead-in marker like "**Collect inputs first**:" head.
  const sentence = firstSentence(collapsed);
  const candidate = sentence.length > 0 ? sentence : collapsed;
  return truncate(candidate, SHORT_LABEL_MAX);
}

/** Strips markdown emphasis/inline-code markers for cleaner labels. */
function stripInlineMarkup(text: string): string {
  return text.replace(/[*_`]/g, "");
}

// --- Section extraction -----------------------------------------------------

/**
 * Returns the body text of the "When invoked" section (everything up to the
 * next top-level marker such as `Return:` / `Returns:` or a `#` heading), or
 * undefined when the section is absent.
 */
function extractWhenInvokedSection(body: string): string | undefined {
  const start = body.search(/^\s*when invoked:?/im);
  if (start === -1) {
    return undefined;
  }
  const afterHeading = body.slice(start).replace(/^\s*when invoked:?[^\n]*\n/i, "");
  const stop = afterHeading.search(/^\s*(returns?:|#)/im);
  return stop === -1 ? afterHeading : afterHeading.slice(0, stop);
}

/**
 * Splits a "When invoked" section into its numbered/ordered steps. Steps start
 * at the left margin with `N.` markers; continuation lines (sub-bullets, wrapped
 * prose) belong to the current step.
 */
function splitNumberedSteps(section: string): string[] {
  const lines = section.split("\n");
  const steps: string[] = [];
  let current: string[] | undefined;

  for (const line of lines) {
    if (/^\s*\d+\.\s+/.test(line)) {
      if (current) {
        steps.push(current.join("\n"));
      }
      current = [line.replace(/^\s*\d+\.\s+/, "")];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) {
    steps.push(current.join("\n"));
  }
  return steps.map((step) => step.trim()).filter((step) => step.length > 0);
}

/** Top-level `#`/`##` section headings, used by the fallback capability path. */
function extractHeadings(body: string): string[] {
  const headings: string[] = [];
  for (const line of body.split("\n")) {
    const match = line.match(/^#{1,2}\s+(.+?)\s*$/);
    if (match?.[1]) {
      headings.push(match[1].trim());
    }
  }
  return headings;
}

// --- Capabilities -----------------------------------------------------------

function capabilitiesFromSteps(steps: string[]): ParsedCapability[] {
  return steps.map((step) => {
    const cleaned = stripInlineMarkup(step);
    return {
      name: shortLabel(cleaned),
      description: truncate(cleaned, DESCRIPTION_MAX),
    };
  });
}

/**
 * Fallback when "When invoked" is absent: derive capabilities from
 * the first sentence of the description plus any top-level section headings.
 * Guarantees at least one capability.
 */
function fallbackCapabilities(description: string, body: string): ParsedCapability[] {
  const capabilities: ParsedCapability[] = [];

  const summary = firstSentence(description);
  if (summary.length > 0) {
    capabilities.push({
      name: truncate(summary, SHORT_LABEL_MAX),
      description: truncate(description, DESCRIPTION_MAX),
    });
  }

  for (const heading of extractHeadings(body)) {
    capabilities.push({
      name: truncate(heading, SHORT_LABEL_MAX),
      description: heading,
    });
  }

  if (capabilities.length === 0) {
    // Last-resort guarantee: never yield zero capabilities.
    capabilities.push({ name: "general agent", description: "" });
  }
  return capabilities;
}

function deriveCapabilities(description: string, body: string): ParsedCapability[] {
  const section = extractWhenInvokedSection(body);
  if (section) {
    const steps = splitNumberedSteps(section);
    const fromSteps = capabilitiesFromSteps(steps);
    if (fromSteps.length > 0) {
      return fromSteps;
    }
  }
  return fallbackCapabilities(description, body);
}

// --- Outputs ----------------------------------------------------------------

/**
 * Extracts the `Return:` / `Returns` list into AgentIO-style outputs. Lenient
 * about formatting: accepts `-`, `*`, or `N.` bullets following the marker.
 */
function deriveOutputs(body: string): ParsedOutput[] {
  const start = body.search(/^\s*returns?:?/im);
  if (start === -1) {
    return [];
  }
  const afterHeading = body.slice(start).replace(/^\s*returns?:?[^\n]*\n/i, "");
  const stop = afterHeading.search(/^\s*#/m);
  const section = stop === -1 ? afterHeading : afterHeading.slice(0, stop);

  const outputs: ParsedOutput[] = [];
  for (const rawLine of section.split("\n")) {
    const line = rawLine.trim();
    const bullet = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (!bullet?.[1]) {
      continue;
    }
    const text = stripInlineMarkup(bullet[1]).trim();
    if (text.length === 0) {
      continue;
    }
    outputs.push({
      name: truncate(firstSentence(text), SHORT_LABEL_MAX),
      description: truncate(text, DESCRIPTION_MAX),
    });
  }
  return outputs;
}

// --- Dependencies -----------------------------------------------------------

/**
 * Conservatively detects dependencies (precision over recall):
 * - `skills/<name>` mentions → kind `skill` (ref = the path).
 * - backtick-quoted agent slugs that look like other kit agents → kind `agent`.
 */
function deriveDependencies(body: string): ParsedDependency[] {
  const byKey = new Map<string, ParsedDependency>();

  const skillPattern = /skills\/([a-z0-9-]+)/gi;
  for (const match of body.matchAll(skillPattern)) {
    const name = match[1];
    if (!name) {
      continue;
    }
    byKey.set(`skill:${name}`, {
      kind: "skill",
      name,
      ref: `skills/${name}`,
    });
  }

  // Agent-to-agent links: backtick-wrapped lowercase single-word slugs that are
  // referenced as collaborators (e.g. `braviary`, `smeargle`). Conservative —
  // only matches the inline-code form to avoid false positives from prose.
  const agentPattern = /`([a-z][a-z0-9-]{2,})`/g;
  for (const match of body.matchAll(agentPattern)) {
    const name = match[1];
    if (!name || name.includes("/") || name.includes("-")) {
      // Skip paths and multi-word tokens — agent slugs in this kit are single
      // lowercase words.
      continue;
    }
    if (byKey.has(`skill:${name}`)) {
      continue;
    }
    byKey.set(`agent:${name}`, { kind: "agent", name, ref: name });
  }

  return [...byKey.values()];
}

// --- Frontmatter extraction (robust to malformed YAML) ----------------------

/**
 * Read frontmatter + body. Real manifests are not guaranteed to be valid YAML:
 * e.g. `agents/oracle.md` has an unquoted `: ` inside its `description` scalar,
 * which makes js-yaml (via gray-matter) throw a YAMLException. The parser must
 * tolerate this without crashing, so on a YAML error we fall back to
 * a line-based salvage that still recovers the simple `key: value` lines (name,
 * description, model) and the body. Returns body-only data if there is no
 * recognisable frontmatter block at all.
 */
function readFrontmatter(markdown: string): { data: unknown; content: string } {
  try {
    const { data, content } = matter(markdown);
    return { data, content };
  } catch {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(markdown);
    if (!match) {
      return { data: {}, content: markdown };
    }
    const [, block = "", content = ""] = match;
    const data: Record<string, string> = {};
    for (const line of block.split(/\r?\n/)) {
      const kv = /^([A-Za-z][\w-]*):\s?(.*)$/.exec(line);
      if (kv) {
        const [, key = "", value = ""] = kv;
        // First key wins; everything after the first ": " is the raw value, so
        // stray colons inside the value (oracle's description) are preserved.
        if (!(key in data)) {
          data[key] = value.trim();
        }
      }
    }
    return { data, content };
  }
}

// --- Entry point ------------------------------------------------------------

export function parseAgentManifest(markdown: string): ParsedAgentManifest {
  const { data, content } = readFrontmatter(markdown);
  const frontmatter = frontmatterSchema.parse(data && typeof data === "object" ? data : {});

  const body = content.trim();
  const name = (frontmatter.name ?? "").trim();
  const description = (frontmatter.description ?? "").trim();

  const slug = name.length > 0 ? toKebabCase(name) : toKebabCase(description.slice(0, 40));

  const manifest: ParsedAgentManifest = {
    slug: slug.length > 0 ? slug : "agent",
    name: name.length > 0 ? name : slug.length > 0 ? slug : "agent",
    description,
    model: frontmatter.model?.trim() ? frontmatter.model.trim() : undefined,
    capabilities: deriveCapabilities(description, body),
    outputs: deriveOutputs(body),
    dependencies: deriveDependencies(body),
  };

  // Validate our own output shape so callers get a guaranteed contract.
  return parsedAgentManifestSchema.parse(manifest);
}
