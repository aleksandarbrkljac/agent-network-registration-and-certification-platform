import type { AgentStatus } from "@agent-network/shared";

/** Tailwind classes per lifecycle status, for status badges across the app. */
export const STATUS_STYLES: Record<AgentStatus, string> = {
  DISCOVERED: "bg-slate-100 text-slate-700 ring-slate-300",
  REGISTERED: "bg-sky-100 text-sky-800 ring-sky-300",
  IN_REVIEW: "bg-amber-100 text-amber-800 ring-amber-300",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800 ring-orange-300",
  CERTIFIED: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  REJECTED: "bg-rose-100 text-rose-800 ring-rose-300",
  DEPRECATED: "bg-zinc-200 text-zinc-700 ring-zinc-400",
  SUSPENDED: "bg-red-100 text-red-800 ring-red-300",
};

/** Human-readable error message from a thrown value (tRPC errors included). */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong.";
}

/** Short, locale-stable date/time for run history and review timelines. */
export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/** `1500` -> `1.5s`; null -> `—`. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
