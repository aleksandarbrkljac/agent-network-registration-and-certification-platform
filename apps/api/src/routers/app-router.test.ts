import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createCallerFactory } from "../trpc.js";
import {
  clearDb,
  disconnectDb,
  makeAgent,
  makeTestContext,
  seedReviewer,
  seedTeamKitSource,
} from "../test-support.js";
import { appRouter } from "./index.js";

/**
 * tRPC caller happy-path: exercise the full router stack
 * end-to-end via a server-side caller — promote → submitForReview → approve →
 * the agent appears in marketplace.listPublished. Proves routers, services, and
 * the lifecycle gate compose correctly over the real (throwaway) DB.
 */

const createCaller = createCallerFactory(appRouter);
const caller = createCaller(makeTestContext());

beforeEach(async () => {
  await clearDb();
  await seedReviewer();
  await seedTeamKitSource();
});
afterAll(async () => {
  await clearDb();
  await disconnectDb();
});

describe("appRouter caller — full certification happy path", () => {
  it("promote → submitForReview → approve → listed in marketplace", async () => {
    await makeAgent("flow-agent", "DISCOVERED", "github");

    const promoted = await caller.agents.promote({ slug: "flow-agent" });
    expect(promoted.status).toBe("REGISTERED");

    const inReview = await caller.certification.submitForReview({ slug: "flow-agent" });
    expect(inReview.status).toBe("IN_REVIEW");

    const approved = await caller.certification.approve({
      slug: "flow-agent",
      notes: "meets the bar",
      evaluationOutcome: "pass",
    });
    expect(approved.agent.status).toBe("CERTIFIED");

    const listing = await caller.marketplace.publish({ slug: "flow-agent" });
    expect(listing.agent.slug).toBe("flow-agent");

    const published = await caller.marketplace.listPublished();
    expect(published.map((l) => l.agent.slug)).toContain("flow-agent");

    const reviews = await caller.certification.listReviews({ slug: "flow-agent" });
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.decision).toBe("approved");
  });

  it("publish via the router is gated: a REGISTERED agent is rejected", async () => {
    await makeAgent("ungated", "REGISTERED", "github");
    await expect(caller.marketplace.publish({ slug: "ungated" })).rejects.toThrow();
    const published = await caller.marketplace.listPublished();
    expect(published.map((l) => l.agent.slug)).not.toContain("ungated");
  });

  it("dashboard.statusCounts returns all eight buckets", async () => {
    await makeAgent("d1", "DISCOVERED", "github");
    await makeAgent("c1", "CERTIFIED", "github");
    const counts = await caller.dashboard.statusCounts();
    expect(Object.keys(counts)).toHaveLength(8);
    expect(counts.DISCOVERED).toBe(1);
    expect(counts.CERTIFIED).toBe(1);
    expect(counts.REGISTERED).toBe(0);
  });

  it("runs.simulateRun then runs.metrics reflects the new run", async () => {
    await makeAgent("runner", "CERTIFIED", "github");
    await caller.runs.simulateRun({ slug: "runner" });
    const metrics = await caller.runs.metrics({ slug: "runner" });
    expect(metrics.total).toBe(1);
  });
});
