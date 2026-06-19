import { z } from "zod";
import * as dashboardService from "../services/dashboard-service.js";
import { publicProcedure, router } from "../trpc.js";

/**
 * Dashboard router. Read-only aggregations for the
 * dashboard surface: inventory by status, certification funnel, adoption trend,
 * and a recent activity feed.
 */
export const dashboardRouter = router({
  statusCounts: publicProcedure.query(({ ctx }) => dashboardService.statusCounts(ctx)),
  certificationStats: publicProcedure.query(({ ctx }) => dashboardService.certificationStats(ctx)),
  adoptionTrend: publicProcedure.query(({ ctx }) => dashboardService.adoptionTrend(ctx)),
  activityFeed: publicProcedure
    .input(z.object({ limit: z.number().int().positive().max(100).optional() }).optional())
    .query(({ ctx, input }) => dashboardService.activityFeed(ctx, input?.limit)),
});
