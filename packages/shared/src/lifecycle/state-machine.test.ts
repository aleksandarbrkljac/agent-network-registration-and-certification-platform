import { describe, expect, it } from "vitest";
import { AGENT_STATUSES, type AgentStatus } from "../domain/status.js";
import {
  assertTransition,
  canPublishToMarketplace,
  canSuspend,
  canTransition,
  DISCOVERY_ENTRY_STATUS,
  IllegalTransitionError,
  MANUAL_ENTRY_STATUS,
  reinstate,
} from "./state-machine.js";

const LEGAL_TRANSITIONS: ReadonlyArray<[AgentStatus, AgentStatus]> = [
  ["DISCOVERED", "REGISTERED"],
  ["REGISTERED", "IN_REVIEW"],
  ["IN_REVIEW", "CERTIFIED"],
  ["IN_REVIEW", "CHANGES_REQUESTED"],
  ["IN_REVIEW", "REJECTED"],
  ["CHANGES_REQUESTED", "IN_REVIEW"],
  ["CERTIFIED", "DEPRECATED"],
];

const ILLEGAL_TRANSITIONS: ReadonlyArray<[AgentStatus, AgentStatus]> = [
  ["DISCOVERED", "CERTIFIED"],
  ["REGISTERED", "CERTIFIED"],
  ["IN_REVIEW", "REGISTERED"],
  ["CERTIFIED", "IN_REVIEW"],
  ["REJECTED", "IN_REVIEW"],
  ["DEPRECATED", "CERTIFIED"],
  ["SUSPENDED", "REGISTERED"],
];

describe("entry statuses", () => {
  it("discovery enters at DISCOVERED, manual at REGISTERED", () => {
    expect(DISCOVERY_ENTRY_STATUS).toBe("DISCOVERED");
    expect(MANUAL_ENTRY_STATUS).toBe("REGISTERED");
  });
});

describe("canTransition / assertTransition", () => {
  it.each(LEGAL_TRANSITIONS)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it.each(ILLEGAL_TRANSITIONS)("rejects %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(IllegalTransitionError);
  });

  it("carries the from/to on the thrown error", () => {
    try {
      assertTransition("DISCOVERED", "CERTIFIED");
      expect.unreachable("expected an IllegalTransitionError");
    } catch (error) {
      expect(error).toBeInstanceOf(IllegalTransitionError);
      const typed = error as IllegalTransitionError;
      expect(typed.from).toBe("DISCOVERED");
      expect(typed.to).toBe("CERTIFIED");
    }
  });
});

describe("SUSPEND from any status + reinstate", () => {
  it("allows every non-suspended status to be suspended", () => {
    for (const status of AGENT_STATUSES) {
      if (status === "SUSPENDED") {
        expect(canTransition(status, "SUSPENDED")).toBe(false);
        expect(canSuspend(status)).toBe(false);
      } else {
        expect(canTransition(status, "SUSPENDED")).toBe(true);
        expect(canSuspend(status)).toBe(true);
      }
    }
  });

  it("reinstates back to the supplied prior status", () => {
    expect(reinstate("IN_REVIEW")).toBe("IN_REVIEW");
    expect(reinstate("CERTIFIED")).toBe("CERTIFIED");
  });

  it("refuses to reinstate into SUSPENDED", () => {
    expect(() => reinstate("SUSPENDED")).toThrow(IllegalTransitionError);
  });
});

describe("canPublishToMarketplace", () => {
  it("is true only for CERTIFIED", () => {
    for (const status of AGENT_STATUSES) {
      expect(canPublishToMarketplace(status)).toBe(status === "CERTIFIED");
    }
  });
});
