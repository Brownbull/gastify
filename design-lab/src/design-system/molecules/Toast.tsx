import { useState, type ReactNode } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { XIcon, ChevronDownIcon } from "@design-system/assets/icons";

/**
 * Toast (pick C — compact single-line pill with disclosure). Tone-tinted
 * surface, pixel status icon, single-line title, dismiss X. When `detail` is
 * provided a toggle arrow expands to reveal the full message below.
 */
export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastProps {
  tone?: ToastTone;
  title: ReactNode;
  /** Expandable detail text — shown when the user clicks the disclosure arrow. */
  detail?: ReactNode;
  /** Override the default per-tone pixel icon. */
  icon?: ReactNode;
  onDismiss?: () => void;
  /** Force expanded state (controlled). */
  expanded?: boolean;
  className?: string;
}

const toneBg: Record<ToastTone, string> = {
  info: "bg-gt-primary-soft",
  success: "bg-gt-positive-bg",
  warning: "bg-gt-accent/40",
  error: "bg-gt-negative-bg",
};

const toneIcon: Record<ToastTone, string> = {
  info: "status-info",
  success: "scan-success",
  warning: "status-warning",
  error: "scan-error",
};

export function Toast({ tone = "info", title, detail, icon, onDismiss, expanded: controlledExpanded, className = "" }: ToastProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;

  return (
    <div
      role="status"
      // Always a rounded RECTANGLE (straight sides, rounded corners) so expanding
      // the detail below keeps the same side edges — the whole thing stays one
      // shape, no re-rounded per-row ends, no divider.
      className={`overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong shadow-gt-sm ${toneBg[tone]} ${className}`}
    >
      <div className="flex items-center gap-gt-10 py-gt-8 pl-gt-12 pr-gt-8">
        <span className="shrink-0">{icon ?? <PixelIcon name={toneIcon[tone]} size={20} />}</span>
        <span className="min-w-0 flex-1 truncate text-gt-sm font-bold text-gt-ink">{title}</span>
        {detail ? (
          <button
            type="button"
            aria-label={isExpanded ? "Ocultar detalle" : "Ver detalle"}
            aria-expanded={isExpanded}
            onClick={() => setInternalExpanded((p) => !p)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-gt-md text-gt-ink-2 transition duration-150 ease-gt-bounce hover:bg-gt-surface/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onDismiss}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-gt-md text-gt-ink-2 transition duration-150 ease-gt-bounce hover:bg-gt-surface/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
          >
            <XIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {isExpanded && detail ? (
        <div className="px-gt-12 pb-gt-8 pt-gt-0 text-gt-sm font-semibold text-gt-ink-2">{detail}</div>
      ) : null}
    </div>
  );
}
