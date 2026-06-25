import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@design-system/atoms/Badge";

/**
 * MetricCard / StatValue / SummaryStats — geometric numeric displays.
 * MetricCard is the hero metric (big Baloo value + label + delta). StatValue is
 * a small inline stat. SummaryStats lays a few StatValues in a divided row.
 */
export interface MetricCardProps {
  label: ReactNode;
  value: ReactNode;
  delta?: { tone: BadgeTone; label: ReactNode };
  /** custom delta node (e.g. a TrendChange pill) instead of the Badge delta. */
  deltaSlot?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function MetricCard({ label, value, delta, deltaSlot, icon, className = "" }: MetricCardProps) {
  return (
    <div className={`flex items-center justify-between gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-md ${className}`}>
      <div>
        <div className="mb-gt-2 flex items-center gap-gt-8">
          {icon}
          <span className="text-gt-sm font-extrabold uppercase tracking-[0.06em] text-gt-ink-3">{label}</span>
        </div>
        <p className="font-gt-display text-gt-4xl font-extrabold leading-none text-gt-ink">{value}</p>
      </div>
      {deltaSlot ? (
        <div className="flex flex-col items-end gap-gt-4">{deltaSlot}</div>
      ) : delta ? (
        <div className="flex flex-col items-end gap-gt-4">
          <Badge tone={delta.tone}>{delta.label}</Badge>
        </div>
      ) : null}
    </div>
  );
}

export interface StatValueProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}

export function StatValue({ label, value, className = "" }: StatValueProps) {
  return (
    <div className={`flex flex-col gap-gt-2 ${className}`}>
      <span className="font-gt-display text-gt-2xl font-extrabold leading-none text-gt-ink">{value}</span>
      <span className="text-gt-sm font-bold text-gt-ink-3">{label}</span>
    </div>
  );
}

export interface SummaryStatsProps {
  children: ReactNode;
  className?: string;
}

/** A row of StatValues separated by ink-soft dividers. */
export function SummaryStats({ children, className = "" }: SummaryStatsProps) {
  return (
    <div className={`flex items-stretch gap-gt-16 divide-x-2 divide-gt-line [&>*]:pl-gt-16 [&>*:first-child]:pl-gt-0 ${className}`}>
      {children}
    </div>
  );
}
