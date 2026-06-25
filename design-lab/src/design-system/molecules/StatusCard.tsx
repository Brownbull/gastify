import type { ReactNode } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";

/**
 * StatusCard (DM-16) — inline notice/alert card. Two-layer tone: a low-alpha
 * tinted surface + a fully-saturated bordered icon DISC, so the color cue is
 * strong without a loud full-color card. Title is extrabold; body drops to
 * font-medium muted for readable copy (the system's one weight-drop).
 *
 * Used for over-budget warnings, scan results, sync notices, tips.
 */
export type StatusTone = "info" | "success" | "warning" | "error";

export interface StatusCardProps {
  tone?: StatusTone;
  title: ReactNode;
  children?: ReactNode;
  /** override the default per-tone pixel icon. */
  icon?: ReactNode;
  className?: string;
}

const toneSurface: Record<StatusTone, string> = {
  info: "bg-gt-primary-soft",
  success: "bg-gt-positive-bg",
  warning: "bg-gt-accent/30",
  error: "bg-gt-negative-bg",
};

// solid disc fill + text color
const toneDisc: Record<StatusTone, string> = {
  info: "bg-gt-primary text-white",
  success: "bg-gt-success text-gt-ink",
  warning: "bg-gt-accent text-gt-ink",
  error: "bg-gt-error text-white",
};

const toneIcon: Record<StatusTone, string> = {
  info: "status-info",
  success: "scan-success",
  warning: "status-warning",
  error: "scan-error",
};

export function StatusCard({ tone = "info", title, children, icon, className = "" }: StatusCardProps) {
  return (
    <div className={`flex gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong p-gt-14 shadow-gt-sm ${toneSurface[tone]} ${className}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong ${toneDisc[tone]}`}>
        {icon ?? <PixelIcon name={toneIcon[tone]} size={20} />}
      </span>
      <div className="flex flex-col gap-gt-4">
        <h4 className="font-gt-display text-gt-md font-extrabold leading-tight text-gt-ink">{title}</h4>
        {children ? <p className="text-gt-sm font-medium leading-relaxed text-gt-ink-2">{children}</p> : null}
      </div>
    </div>
  );
}
