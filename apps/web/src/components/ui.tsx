import type { AgentStatus } from "@agent-network/shared";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { STATUS_STYLES, errorMessage } from "../lib/format.js";

/** Card container used across dashboard tiles, list rows, and detail panels. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h2>
  );
}

/** Lifecycle status badge — consistent color per status across every view. */
export function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400",
  secondary:
    "bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50",
  danger: "bg-rose-600 text-white hover:bg-rose-500 disabled:bg-rose-300",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:opacity-50",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  );
}

/** Generic loading placeholder for any data view. */
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 p-6 text-sm text-slate-500">
      <span className="h-3 w-3 animate-pulse rounded-full bg-slate-400" />
      {label}
    </div>
  );
}

/** Visible error surface (used for query failures AND the publish-gate 400). */
export function ErrorBanner({
  error,
  title = "Something went wrong",
}: {
  error: unknown;
  title?: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 whitespace-pre-wrap">{errorMessage(error)}</p>
    </div>
  );
}

/** Empty-state placeholder for zero-row data views. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
