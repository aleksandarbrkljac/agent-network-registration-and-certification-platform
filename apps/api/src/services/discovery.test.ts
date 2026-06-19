import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  clearDb,
  disconnectDb,
  makeTestContext,
  seedReviewer,
  seedTeamKitSource,
} from "../test-support.js";
import { LocalSourceDriver } from "../discovery/local-driver.js";
import * as agentService from "./agent-service.js";
import * as discoveryService from "./discovery-service.js";

/**
 * Discovery scan against the bundled local driver:
 *   - creates DISCOVERED records from the real team-kit manifest snapshot,
 *   - is idempotent on re-scan (counts stable, no duplicates),
 *   - never clobbers a promoted agent's status on re-scan.
 */

const ctx = makeTestContext();
const driver = new LocalSourceDriver();

beforeEach(async () => {
  await clearDb();
  await seedReviewer();
  await seedTeamKitSource();
});
afterAll(async () => {
  await clearDb();
  await disconnectDb();
});

describe("discovery-service.scan — local driver", () => {
  it("creates DISCOVERED agents from the bundled snapshot", async () => {
    const run = await discoveryService.scan(ctx, "source-team-kit", { driver });

    expect(run.discoveredCount).toBeGreaterThan(0);
    expect(run.createdCount).toBe(run.discoveredCount);
    expect(run.updatedCount).toBe(0);

    const agents = await agentService.list(ctx, { sourceId: "source-team-kit" });
    expect(agents).toHaveLength(run.discoveredCount);
    expect(agents.every((a) => a.status === "DISCOVERED")).toBe(true);

    // Parser-derived child rows are seeded on first discovery.
    const detail = await agentService.getDetail(ctx, agents[0]!.slug);
    expect(detail.capabilities.length).toBeGreaterThanOrEqual(1);
  });

  it("is idempotent on re-scan: counts stable, no duplicate rows", async () => {
    const first = await discoveryService.scan(ctx, "source-team-kit", { driver });
    const afterFirst = await agentService.list(ctx, { sourceId: "source-team-kit" });

    const second = await discoveryService.scan(ctx, "source-team-kit", { driver });
    const afterSecond = await agentService.list(ctx, { sourceId: "source-team-kit" });

    // Same number of agents — re-scan updated, did not duplicate.
    expect(afterSecond).toHaveLength(afterFirst.length);
    expect(second.discoveredCount).toBe(first.discoveredCount);
    expect(second.createdCount).toBe(0);
    expect(second.updatedCount).toBe(first.discoveredCount);

    // The exact same slug set on both scans — guards against the gray-matter
    // cache hazard where a malformed-YAML manifest (oracle.md) degrades to the
    // "agent" fallback slug on a second parse, producing a phantom row.
    const slugsFirst = afterFirst.map((a) => a.slug).sort();
    const slugsSecond = afterSecond.map((a) => a.slug).sort();
    expect(slugsSecond).toEqual(slugsFirst);
    expect(slugsSecond).not.toContain("agent");
  });

  it("does not clobber a promoted agent's status on re-scan", async () => {
    await discoveryService.scan(ctx, "source-team-kit", { driver });
    const [target] = await agentService.list(ctx, { sourceId: "source-team-kit" });
    expect(target).toBeDefined();

    // Promote it out of DISCOVERED, then re-scan.
    const promoted = await agentService.promote(ctx, target!.slug);
    expect(promoted.status).toBe("REGISTERED");

    await discoveryService.scan(ctx, "source-team-kit", { driver });

    const after = await agentService.getBySlug(ctx, target!.slug);
    expect(after.status).toBe("REGISTERED"); // preserved, NOT reset to DISCOVERED
  });
});
