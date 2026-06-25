import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@design-system/assets/icons";
import { useLongPress } from "@design-system/hooks/useLongPress";

/**
 * CompactRow / CompactRowList — geometric list rows (transactions, items,
 * settings). A row has a leading slot (ThumbnailBadge, icon tile), a title +
 * meta + tags stack, and a trailing COLUMN (amount on top, an expand control —
 * with optional count label — below it). The expandable detail panel is
 * revealed by the chevron under the amount.
 *
 *   - `meta`  — the inline date · location line.
 *   - `tags`  — category chip + flags (e.g. "duplicado"), STACKED vertically
 *               below the meta (a flag sits on its own line after the category).
 *   - `detailLabel` — small label beside the expand chevron (e.g. "12 ítems").
 *
 * DM-7 pick B, refined: the trailing is a vertical stack so the amount stays
 * prominent and the expand affordance sits beneath it (not crammed alongside).
 */
export interface CompactRowProps {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  /** category chip + flags, stacked below the meta (each on its own line). */
  tags?: ReactNode;
  trailing?: ReactNode;
  /** Expandable detail content — when provided, a chevron toggle appears below the trailing. */
  detail?: ReactNode;
  /** small label shown beside the expand chevron (e.g. "12 ítems"). */
  detailLabel?: ReactNode;
  /** Controlled expanded state. */
  expanded?: boolean;
  onClick?: () => void;
  /** long-press the row (e.g. enter batch-select on mobile). Touch + mouse. */
  onLongPress?: () => void;
  /** accessible name for the whole-row click target (so it isn't the concatenated
   * row text). Only used when `onClick` is set. */
  clickLabel?: string;
  className?: string;
}

export function CompactRow({ leading, title, meta, tags, trailing, detail, detailLabel, expanded: controlledExpanded, onClick, onLongPress, clickLabel, className = "" }: CompactRowProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const longPress = useLongPress(onLongPress);
  const isExpanded = controlledExpanded ?? internalExpanded;
  const hasDetail = detail != null;

  const toggleExpand = () => setInternalExpanded((p) => !p);

  const row = (
    <div className={`flex w-full items-start gap-gt-12 px-gt-12 py-gt-10 text-left ${className}`}>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className="truncate text-gt-md font-extrabold leading-tight text-gt-ink">{title}</span>
        {meta ? <span className="flex flex-wrap items-center gap-gt-4 text-gt-sm text-gt-ink-3">{meta}</span> : null}
        {tags ? <span className="flex flex-col items-start gap-gt-4 pt-gt-2">{tags}</span> : null}
      </span>
      {trailing || hasDetail ? (
        <span className="flex shrink-0 flex-col items-end gap-gt-4">
          {trailing}
          {hasDetail ? (
            <button
              type="button"
              aria-label={isExpanded ? "Contraer" : "Ver detalle"}
              aria-expanded={isExpanded}
              onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
              className="pointer-events-auto relative flex items-center gap-gt-2 rounded-gt-md px-gt-4 py-gt-2 text-gt-ink-3 transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/20"
            >
              {detailLabel ? <span className="whitespace-nowrap text-gt-xs font-bold">{detailLabel}</span> : null}
              <ChevronDownIcon className={`h-4 w-4 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`} />
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );

  // When a row is both clickable (opens) AND has an expand chevron (a button),
  // a button-wrapping-button would be invalid HTML. Use the "stretched-link"
  // pattern instead: an absolutely-positioned click target behind the content,
  // with the content non-interactive except the chevron (pointer-events-auto).
  return (
    <li>
      <div className="relative">
        {onClick ? (
          <button
            type="button"
            onClick={() => { if (longPress.consumeClick()) return; onClick(); }}
            onPointerDown={longPress.onPointerDown}
            onPointerUp={longPress.onPointerUp}
            onPointerLeave={longPress.onPointerLeave}
            onPointerMove={longPress.onPointerMove}
            aria-label={clickLabel}
            className="absolute inset-0 rounded-gt-lg transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20"
          />
        ) : null}
        <div className={onClick ? "pointer-events-none relative" : undefined}>{row}</div>
      </div>
      {isExpanded && detail ? (
        <div className="px-gt-12 pb-gt-10">{detail}</div>
      ) : null}
    </li>
  );
}

export interface CompactRowListProps {
  children: ReactNode;
  className?: string;
}

export function CompactRowList({ children, className = "" }: CompactRowListProps) {
  return <ul className={`flex flex-col divide-y-2 divide-gt-line ${className}`}>{children}</ul>;
}
