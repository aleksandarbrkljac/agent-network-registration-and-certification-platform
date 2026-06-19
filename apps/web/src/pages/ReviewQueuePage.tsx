import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, EmptyState, ErrorBanner, Loading } from "../components/ui.js";
import { formatDateTime } from "../lib/format.js";
import { trpc } from "../lib/trpc.js";

/**
 * Review Queue (`/review`) — Demo #5. Lists IN_REVIEW agents with approve /
 * request-changes / reject and shows each agent's review history. Decisions go
 * through the certification router (the service writes a review + transitions).
 */
export function ReviewQueuePage() {
  const utils = trpc.useUtils();
  const inReview = trpc.agents.list.useQuery({ status: "IN_REVIEW" });

  function refresh() {
    void utils.agents.list.invalidate();
    void utils.dashboard.invalidate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Review Queue</h1>
        <p className="text-sm text-slate-500">
          Agents awaiting certification. Approve to certify, request changes, or reject.
        </p>
      </div>

      {inReview.isLoading ? (
        <Loading />
      ) : inReview.isError ? (
        <ErrorBanner error={inReview.error} />
      ) : !inReview.data ? (
        <Loading />
      ) : inReview.data.length === 0 ? (
        <EmptyState>Nothing in review right now.</EmptyState>
      ) : (
        <div className="space-y-4">
          {inReview.data.map((agent) => (
            <ReviewCard key={agent.id} slug={agent.slug} name={agent.name} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  slug,
  name,
  onChanged,
}: {
  slug: string;
  name: string;
  onChanged: () => void;
}) {
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();
  const reviews = trpc.certification.listReviews.useQuery({ slug });

  function afterDecision() {
    void utils.certification.listReviews.invalidate({ slug });
    onChanged();
  }

  const approve = trpc.certification.approve.useMutation({ onSuccess: afterDecision });
  const requestChanges = trpc.certification.requestChanges.useMutation({
    onSuccess: afterDecision,
  });
  const reject = trpc.certification.reject.useMutation({ onSuccess: afterDecision });
  const error = [approve, requestChanges, reject].find((m) => m.isError)?.error;
  const pending = approve.isPending || requestChanges.isPending || reject.isPending;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Link to={`/agents/${slug}`} className="text-lg font-medium text-slate-900 hover:underline">
          {name}
        </Link>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorBanner error={error} title="Decision failed" />
        </div>
      )}

      <textarea
        placeholder="Review notes…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="mt-3 w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          onClick={() => approve.mutate({ slug, notes: notes || "Approved." })}
          disabled={pending}
        >
          Approve
        </Button>
        <Button
          variant="secondary"
          onClick={() => requestChanges.mutate({ slug, notes: notes || "Changes requested." })}
          disabled={pending}
        >
          Request changes
        </Button>
        <Button
          variant="danger"
          onClick={() => reject.mutate({ slug, notes: notes || "Rejected." })}
          disabled={pending}
        >
          Reject
        </Button>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Review history</p>
        {reviews.isLoading ? (
          <Loading />
        ) : reviews.isError ? (
          <ErrorBanner error={reviews.error} />
        ) : !reviews.data ? (
          <Loading />
        ) : reviews.data.length === 0 ? (
          <p className="text-sm text-slate-400">No prior reviews.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {reviews.data.map((review) => (
              <li key={review.id} className="flex items-start justify-between gap-3">
                <span>
                  <span className="font-medium text-slate-800">{review.decision}</span>
                  <span className="text-slate-500"> — {review.notes}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatDateTime(review.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
