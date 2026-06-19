import { describe, expect, it } from "vitest";
import { agentStatusSchema, AGENT_STATUSES } from "./status.js";

describe("agentStatusSchema", () => {
  it("accepts every defined lifecycle status", () => {
    for (const status of AGENT_STATUSES) {
      expect(agentStatusSchema.parse(status)).toBe(status);
    }
  });

  it("exposes exactly the eight README statuses", () => {
    expect(AGENT_STATUSES).toEqual([
      "DISCOVERED",
      "REGISTERED",
      "IN_REVIEW",
      "CHANGES_REQUESTED",
      "CERTIFIED",
      "REJECTED",
      "DEPRECATED",
      "SUSPENDED",
    ]);
  });

  it("rejects unknown statuses", () => {
    expect(() => agentStatusSchema.parse("PUBLISHED")).toThrow();
    expect(() => agentStatusSchema.parse("discovered")).toThrow();
  });
});
