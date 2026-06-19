import type { Agent } from "@agent-network/shared";
import { useState } from "react";
import { Button, ErrorBanner } from "../../components/ui.js";
import { trpc } from "../../lib/trpc.js";

/**
 * Status-appropriate lifecycle action buttons. Buttons are gated on
 * the agent's current status so only legal transitions are offered. Server errors
 * (illegal transitions, the publish 400 gate) surface inline.
 *
 * Demo coverage: #2 promote, #5 review decisions (also reachable here), #6 publish
 * (gated to CERTIFIED), #10 simulate run.
 */
export function LifecycleActions({ agent, onChanged }: { agent: Agent; onChanged: () => void }) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [publishNote, setPublishNote] = useState<string | null>(null);

  const promote = trpc.agents.promote.useMutation({ onSuccess: onChanged });
  const submit = trpc.certification.submitForReview.useMutation({ onSuccess: onChanged });
  const approve = trpc.certification.approve.useMutation({ onSuccess: onChanged });
  const requestChanges = trpc.certification.requestChanges.useMutation({ onSuccess: onChanged });
  const reject = trpc.certification.reject.useMutation({ onSuccess: onChanged });
  const simulate = trpc.runs.simulateRun.useMutation({ onSuccess: onChanged });
  const publish = trpc.marketplace.publish.useMutation({
    onSuccess: () => setPublishNote("Published to the marketplace."),
  });

  const { slug, status } = agent;
  const mutations = [promote, submit, approve, requestChanges, reject, publish];
  const firstError = mutations.find((m) => m.isError)?.error;

  return (
    <div className="space-y-3">
      {firstError && <ErrorBanner error={firstError} title="Action failed" />}

      <div className="flex flex-wrap gap-2">
        {status === "DISCOVERED" && (
          <Button onClick={() => promote.mutate({ slug })} disabled={promote.isPending}>
            Promote to registry
          </Button>
        )}

        {(status === "REGISTERED" || status === "CHANGES_REQUESTED") && (
          <Button onClick={() => submit.mutate({ slug })} disabled={submit.isPending}>
            Submit for review
          </Button>
        )}

        {status === "CERTIFIED" && (
          <Button
            onClick={() => {
              setPublishNote(null);
              publish.mutate({ slug });
            }}
            disabled={publish.isPending}
          >
            {publish.isPending ? "Publishing…" : "Publish to marketplace"}
          </Button>
        )}

        {/* Simulate run is always available (Demo #10). */}
        <Button
          variant="secondary"
          onClick={() => simulate.mutate({ slug })}
          disabled={simulate.isPending}
        >
          {simulate.isPending ? "Simulating…" : "Simulate run"}
        </Button>
      </div>

      {status === "IN_REVIEW" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="mb-2 text-sm font-medium text-amber-800">Reviewer decision</p>
          <textarea
            placeholder="Review notes…"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={2}
            className="mb-2 w-full rounded-md border border-amber-300 px-2 py-1 text-sm focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => approve.mutate({ slug, notes: reviewNotes || "Approved." })}
              disabled={approve.isPending}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                requestChanges.mutate({ slug, notes: reviewNotes || "Changes requested." })
              }
              disabled={requestChanges.isPending}
            >
              Request changes
            </Button>
            <Button
              variant="danger"
              onClick={() => reject.mutate({ slug, notes: reviewNotes || "Rejected." })}
              disabled={reject.isPending}
            >
              Reject
            </Button>
          </div>
        </div>
      )}

      {simulate.isSuccess && (
        <p className="text-sm text-emerald-700">Run recorded — metrics updated.</p>
      )}
      {publishNote && <p className="text-sm text-emerald-700">{publishNote}</p>}
    </div>
  );
}
