import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Catalog render test. Mocks the shared tRPC hooks so
 * the page renders rows from a canned client with no real server — proves the
 * catalog lists agents and exposes the Promote action for DISCOVERED agents.
 */

const listQuery = vi.fn();
const promoteMutation = vi.fn();

vi.mock("../lib/trpc.js", () => ({
  trpc: {
    useUtils: () => ({
      agents: { list: { invalidate: vi.fn() } },
      dashboard: { invalidate: vi.fn() },
    }),
    agents: {
      list: { useQuery: () => listQuery() },
      promote: { useMutation: () => promoteMutation() },
    },
  },
}));

import { CatalogPage } from "./CatalogPage.js";

function renderCatalog() {
  return render(
    <MemoryRouter>
      <CatalogPage />
    </MemoryRouter>,
  );
}

const idleMutation = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null,
  variables: undefined,
};

describe("CatalogPage", () => {
  beforeEach(() => {
    promoteMutation.mockReturnValue(idleMutation);
  });

  it("renders a row per agent from the mocked client", () => {
    listQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: [
        {
          id: "a1",
          slug: "oracle",
          name: "Oracle",
          description: "Public-data ingestion agent.",
          status: "DISCOVERED",
          sourceType: "github",
        },
        {
          id: "a2",
          slug: "metagross",
          name: "Metagross",
          description: "Fullstack monorepo architect.",
          status: "CERTIFIED",
          sourceType: "github",
        },
      ],
    });

    renderCatalog();

    expect(screen.getAllByTestId("catalog-row")).toHaveLength(2);
    expect(screen.getByText("Oracle")).toBeInTheDocument();
    expect(screen.getByText("Metagross")).toBeInTheDocument();
    // Promote is offered only for the DISCOVERED agent.
    expect(screen.getByRole("button", { name: "Promote" })).toBeInTheDocument();
  });

  it("shows an empty state when no agents match", () => {
    listQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: [],
    });

    renderCatalog();
    expect(screen.getByText(/No agents match/i)).toBeInTheDocument();
  });
});
