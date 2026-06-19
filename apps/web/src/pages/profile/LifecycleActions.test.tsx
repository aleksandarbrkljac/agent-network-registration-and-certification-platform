import type { Agent } from "@agent-network/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

/**
 * Publish-gate test (CRITICAL integration fact). When
 * the marketplace.publish mutation errors with the gate message (HTTP 400 for a
 * non-CERTIFIED agent), the LifecycleActions panel must surface that message as
 * visible UI feedback.
 */

const idle = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null,
  variables: undefined,
};

const PUBLISH_GATE_MESSAGE =
  'Cannot publish "metagross" to the marketplace: only CERTIFIED agents may be listed (current status: REGISTERED).';

vi.mock("../../lib/trpc.js", () => {
  const make = () => ({ useMutation: () => idle });
  return {
    trpc: {
      agents: { promote: make() },
      certification: {
        submitForReview: make(),
        approve: make(),
        requestChanges: make(),
        reject: make(),
      },
      runs: { simulateRun: make() },
      marketplace: {
        // This mutation is in the error state with the publish-gate message.
        publish: {
          useMutation: () => ({
            ...idle,
            isError: true,
            error: new Error(PUBLISH_GATE_MESSAGE),
          }),
        },
      },
    },
  };
});

import { LifecycleActions } from "./LifecycleActions.js";

const certifiedAgent: Agent = {
  id: "a1",
  slug: "metagross",
  name: "Metagross",
  description: "Fullstack monorepo architect.",
  purpose: "",
  version: "1.0.0",
  status: "CERTIFIED",
  sourceType: "github",
};

describe("LifecycleActions", () => {
  it("surfaces the publish-gate error message", () => {
    render(
      <MemoryRouter>
        <LifecycleActions agent={certifiedAgent} onChanged={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/only CERTIFIED agents may be listed/i);
  });

  it("offers Publish for a certified agent", () => {
    render(
      <MemoryRouter>
        <LifecycleActions agent={certifiedAgent} onChanged={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /Publish to marketplace/i })).toBeInTheDocument();
  });
});
