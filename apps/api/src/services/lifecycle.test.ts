import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { IllegalTransitionError } from "@agent-network/shared";
import {
  clearDb,
  disconnectDb,
  makeAgent,
  makeTestContext,
  seedReviewer,
  seedTeamKitSource,
} from "../test-support.js";
import * as agentService from "./agent-service.js";
import * as certificationService from "./certification-service.js";
import * as marketplaceService from "./marketplace-service.js";
import { PublishNotAllowedError } from "./marketplace-service.js";

/**
 * Service-layer guarantees that matter most:
 *   1. The marketplace publish gate — non-CERTIFIED rejected, CERTIFIED allowed.
 *   2. Illegal lifecycle transitions are rejected (e.g. DISCOVERED → CERTIFIED).
 * Both must be enforced in the SERVICE layer, so these tests call services
 * directly with a context wired to the throwaway DB.
 */

const ctx = makeTestContext();

beforeEach(async () => {
  await clearDb();
  await seedReviewer();
  await seedTeamKitSource();
});
afterAll(async () => {
  await clearDb();
  await disconnectDb();
});

describe("marketplace publish gate (canPublishToMarketplace)", () => {
  it("allows publishing a CERTIFIED agent", async () => {
    await makeAgent("certified-agent", "CERTIFIED", "github");
    const listing = await marketplaceService.publish(ctx, "certified-agent");
    expect(listing.agent.slug).toBe("certified-agent");
    expect(listing.agent.status).toBe("CERTIFIED");
  });

  it.each([
    "DISCOVERED",
    "REGISTERED",
    "IN_REVIEW",
    "CHANGES_REQUESTED",
    "REJECTED",
    "DEPRECATED",
    "SUSPENDED",
  ] as const)("rejects publishing a %s agent", async (status) => {
    await makeAgent("blocked-agent", status, "github");
    await expect(marketplaceService.publish(ctx, "blocked-agent")).rejects.toBeInstanceOf(
      PublishNotAllowedError,
    );
  });

  it("never lists a non-CERTIFIED agent in listPublished / getListing", async () => {
    await makeAgent("in-review", "IN_REVIEW", "github");
    await makeAgent("certified-agent", "CERTIFIED", "github");

    const published = await marketplaceService.listPublished(ctx);
    expect(published.map((l) => l.agent.slug)).toEqual(["certified-agent"]);

    expect(await marketplaceService.getListing(ctx, "in-review")).toBeNull();
    expect(await marketplaceService.getListing(ctx, "certified-agent")).not.toBeNull();
  });
});

describe("illegal lifecycle transitions are rejected by the service", () => {
  it("DISCOVERED → CERTIFIED throws IllegalTransitionError (via approve)", async () => {
    // approve() drives IN_REVIEW → CERTIFIED; from DISCOVERED that is illegal.
    await makeAgent("raw-agent", "DISCOVERED", "github");
    await expect(
      certificationService.approve(ctx, { slug: "raw-agent", notes: "n/a" }),
    ).rejects.toBeInstanceOf(IllegalTransitionError);
  });

  it("does NOT write a review when the transition is illegal", async () => {
    const agentId = await makeAgent("raw-agent-2", "DISCOVERED", "github");
    await expect(
      certificationService.approve(ctx, { slug: "raw-agent-2", notes: "n/a" }),
    ).rejects.toBeInstanceOf(IllegalTransitionError);
    const reviews = await ctx.repositories.certification.listByAgent(agentId);
    expect(reviews).toHaveLength(0);
  });

  it("promote() rejects when the agent is not DISCOVERED", async () => {
    await makeAgent("already-registered", "REGISTERED", "github");
    await expect(agentService.promote(ctx, "already-registered")).rejects.toBeInstanceOf(
      IllegalTransitionError,
    );
  });

  it("allows the legal happy-path chain DISCOVERED → … → CERTIFIED", async () => {
    await makeAgent("happy-agent", "DISCOVERED", "github");
    await agentService.promote(ctx, "happy-agent"); // → REGISTERED
    await certificationService.submitForReview(ctx, "happy-agent"); // → IN_REVIEW
    const { agent } = await certificationService.approve(ctx, {
      slug: "happy-agent",
      notes: "looks good",
    }); // → CERTIFIED
    expect(agent.status).toBe("CERTIFIED");
  });
});
