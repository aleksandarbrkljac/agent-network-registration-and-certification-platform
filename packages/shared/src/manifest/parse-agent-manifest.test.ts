import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseAgentManifest,
  parsedAgentManifestSchema,
  toKebabCase,
} from "./parse-agent-manifest.js";

function readFixture(name: string): string {
  const url = new URL(`./__fixtures__/${name}`, import.meta.url);
  return readFileSync(fileURLToPath(url), "utf8");
}

const arceus = parseAgentManifest(readFixture("arceus.md"));
const pelipper = parseAgentManifest(readFixture("pelipper.md"));
const castform = parseAgentManifest(readFixture("castform.md"));

describe("parseAgentManifest — real fixtures", () => {
  it("produces output that satisfies its own schema", () => {
    for (const manifest of [arceus, pelipper, castform]) {
      expect(() => parsedAgentManifestSchema.parse(manifest)).not.toThrow();
    }
  });

  it("never yields zero capabilities", () => {
    expect(arceus.capabilities.length).toBeGreaterThanOrEqual(1);
    expect(pelipper.capabilities.length).toBeGreaterThanOrEqual(1);
    expect(castform.capabilities.length).toBeGreaterThanOrEqual(1);
  });

  it("derives a kebab-case slug from the name", () => {
    expect(arceus.slug).toBe("arceus");
    expect(pelipper.slug).toBe("pelipper");
    expect(castform.slug).toBe("castform");
    expect(arceus.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("keeps model strings verbatim (no Claude-only enum)", () => {
    expect(arceus.model).toBe("gpt-5.5-medium");
    expect(pelipper.model).toBe("gpt-5.5-high");
    expect(castform.model).toBe("gpt-5.4-high");
  });
});

describe("arceus — fallback path (no 'When invoked')", () => {
  it("still yields capabilities via the description + headings fallback", () => {
    expect(arceus.capabilities.length).toBeGreaterThanOrEqual(1);
  });

  it("surfaces its top-level headings as capability labels", () => {
    const labels = arceus.capabilities.map((capability) => capability.name);
    expect(labels).toContain("Inputs");
    expect(labels).toContain("Success criteria");
  });
});

describe("pelipper — heavy multi-paragraph steps", () => {
  it("bounds every capability label in length", () => {
    for (const capability of pelipper.capabilities) {
      expect(capability.name.length).toBeLessThanOrEqual(130);
    }
  });

  it("produces several capabilities from its numbered steps", () => {
    expect(pelipper.capabilities.length).toBeGreaterThanOrEqual(5);
  });
});

describe("castform — outputs and dependencies", () => {
  it("captures Return-list items as outputs", () => {
    expect(castform.outputs.length).toBeGreaterThanOrEqual(1);
  });

  it("detects skill dependencies as kind=skill with a ref", () => {
    const skills = pelipper.dependencies.filter((dep) => dep.kind === "skill");
    expect(skills.length).toBeGreaterThanOrEqual(1);
    for (const skill of skills) {
      expect(skill.ref).toMatch(/^skills\//);
    }
  });

  it("detects agent-to-agent links as kind=agent", () => {
    const agents = castform.dependencies.filter((dep) => dep.kind === "agent");
    expect(agents.map((dep) => dep.name)).toContain("braviary");
  });
});

describe("toKebabCase", () => {
  it("normalizes spaces, casing, and punctuation", () => {
    expect(toKebabCase("Success criteria")).toBe("success-criteria");
    expect(toKebabCase("  GA4 ↔ Ads  ")).toBe("ga4-ads");
  });
});

describe("sparse manifest tolerance", () => {
  it("does not throw on a well-formed but minimal manifest", () => {
    const minimal = ["---", "name: tiny", "description: Does one thing.", "---", "", "Body."].join(
      "\n",
    );
    expect(() => parseAgentManifest(minimal)).not.toThrow();
    const parsed = parseAgentManifest(minimal);
    expect(parsed.slug).toBe("tiny");
    expect(parsed.model).toBeUndefined();
    expect(parsed.capabilities.length).toBeGreaterThanOrEqual(1);
  });
});

describe("oracle — malformed-but-real YAML frontmatter", () => {
  // oracle.md's `description` contains an unquoted "Milestone scope: ..." colon,
  // which makes gray-matter's YAML parser throw. The line-based salvage must keep
  // the parser alive AND still recover name/model and yield capabilities.
  const oracle = parseAgentManifest(readFixture("oracle.md"));

  it("parses without throwing and satisfies its own schema", () => {
    expect(() => parsedAgentManifestSchema.parse(oracle)).not.toThrow();
  });

  it("recovers name, slug, and model from the salvaged frontmatter", () => {
    expect(oracle.name).toBe("oracle");
    expect(oracle.slug).toBe("oracle");
    expect(oracle.model).toBe("gpt-5.5-high");
  });

  it("still yields at least one capability", () => {
    expect(oracle.capabilities.length).toBeGreaterThanOrEqual(1);
  });
});

describe("real team-kit corpus", () => {
  // Guard: this exercises the actual ../agents/*.md snapshot when present in the
  // workspace. It is the regression net for "verified against the real manifests"
  // — every real file must parse without throwing and yield >=1
  // capability. Skipped only if the sibling kit is not checked out alongside.
  const agentsDir = fileURLToPath(new URL("../../../../../agents", import.meta.url));
  const present = existsSync(agentsDir);

  it.runIf(present)("parses every real manifest without throwing", () => {
    const files = readdirSync(agentsDir).filter((file) => file.endsWith(".md"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const markdown = readFileSync(`${agentsDir}/${file}`, "utf8");
      expect(() => parseAgentManifest(markdown), `parsing ${file}`).not.toThrow();
      const parsed = parseAgentManifest(markdown);
      expect(parsed.capabilities.length, `${file} capabilities`).toBeGreaterThanOrEqual(1);
      expect(parsed.slug, `${file} slug`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});
