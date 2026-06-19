import type { CertificationReview } from "@agent-network/shared";
import { reviewDecisionSchema } from "@agent-network/shared";
import { prisma } from "../client.js";
import { toCertificationReview } from "../mappers.js";
import type { ReviewDraft } from "./dto.js";

/** Records a reviewer decision (certification router). */
export async function create(draft: ReviewDraft): Promise<CertificationReview> {
  const row = await prisma.certificationReview.create({
    data: {
      agentId: draft.agentId,
      reviewerId: draft.reviewerId,
      decision: reviewDecisionSchema.parse(draft.decision),
      notes: draft.notes,
      evaluationOutcome: draft.evaluationOutcome ?? null,
    },
  });
  return toCertificationReview(row);
}

/** Full review history for an agent, newest first. */
export async function listByAgent(agentId: string): Promise<CertificationReview[]> {
  const rows = await prisma.certificationReview.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toCertificationReview);
}
