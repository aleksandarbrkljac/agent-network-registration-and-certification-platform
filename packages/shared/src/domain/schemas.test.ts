import { describe, expect, it } from "vitest";
import {
  agentDependencyInputSchema,
  agentInputSchema,
  agentIoInputSchema,
  agentSchema,
  certificationReviewSchema,
  sourceInputSchema,
  userInputSchema,
} from "./schemas.js";

const baseAgentInput = {
  slug: "castform",
  name: "Castform",
  description: "GTM integration specialist.",
  purpose: "Wire Google Tag Manager into frontends.",
  version: "1.0.0",
  status: "DISCOVERED" as const,
  sourceType: "github" as const,
  model: "gpt-5.4-high",
};

describe("agentInputSchema", () => {
  it("accepts a github agent with repo fields omitted", () => {
    expect(() => agentInputSchema.parse(baseAgentInput)).not.toThrow();
  });

  it("accepts a manual agent without source repo/path/commit", () => {
    const manual = { ...baseAgentInput, sourceType: "manual" as const };
    const parsed = agentInputSchema.parse(manual);
    expect(parsed.sourceRepo).toBeUndefined();
  });

  it("treats model as a free-form string (no Claude-only enum)", () => {
    const parsed = agentInputSchema.parse({
      ...baseAgentInput,
      model: "some-future-model-x",
    });
    expect(parsed.model).toBe("some-future-model-x");
  });

  it("rejects an unknown status", () => {
    expect(() => agentInputSchema.parse({ ...baseAgentInput, status: "PUBLISHED" })).toThrow();
  });

  it("rejects an unknown sourceType", () => {
    expect(() => agentInputSchema.parse({ ...baseAgentInput, sourceType: "gitlab" })).toThrow();
  });

  it("requires a non-empty slug", () => {
    expect(() => agentInputSchema.parse({ ...baseAgentInput, slug: "" })).toThrow();
  });
});

describe("agentSchema", () => {
  it("requires the server-generated id that the input schema omits", () => {
    expect(() => agentSchema.parse(baseAgentInput)).toThrow();
    expect(() => agentSchema.parse({ ...baseAgentInput, id: "agent_1" })).not.toThrow();
  });
});

describe("agentDependencyInputSchema", () => {
  it("accepts every dependency kind and an optional ref", () => {
    const dep = agentDependencyInputSchema.parse({
      agentId: "agent_1",
      kind: "agent",
      name: "braviary",
    });
    expect(dep.ref).toBeUndefined();
  });

  it("rejects an unknown dependency kind", () => {
    expect(() =>
      agentDependencyInputSchema.parse({
        agentId: "agent_1",
        kind: "webhook",
        name: "x",
      }),
    ).toThrow();
  });
});

describe("agentIoInputSchema", () => {
  it("rejects an invalid direction", () => {
    expect(() =>
      agentIoInputSchema.parse({
        agentId: "agent_1",
        direction: "sideways",
        name: "result",
        type: "string",
      }),
    ).toThrow();
  });
});

describe("certificationReviewSchema", () => {
  it("requires a createdAt date and valid decision", () => {
    const review = certificationReviewSchema.parse({
      id: "rev_1",
      agentId: "agent_1",
      reviewerId: "user_1",
      decision: "approved",
      notes: "looks good",
      createdAt: new Date(),
    });
    expect(review.decision).toBe("approved");
  });

  it("rejects an unknown decision", () => {
    expect(() =>
      certificationReviewSchema.parse({
        id: "rev_1",
        agentId: "agent_1",
        reviewerId: "user_1",
        decision: "maybe",
        notes: "",
        createdAt: new Date(),
      }),
    ).toThrow();
  });
});

describe("sourceInputSchema", () => {
  it("requires the enabled boolean", () => {
    expect(() =>
      sourceInputSchema.parse({
        type: "github",
        repoUrl: "https://example.com/repo",
        branch: "main",
        agentsPath: "agents",
      }),
    ).toThrow();
  });
});

describe("userInputSchema", () => {
  it("rejects an invalid email", () => {
    expect(() =>
      userInputSchema.parse({ name: "A", email: "not-an-email", role: "operator" }),
    ).toThrow();
  });

  it("rejects an unknown role", () => {
    expect(() => userInputSchema.parse({ name: "A", email: "a@b.com", role: "admin" })).toThrow();
  });
});
