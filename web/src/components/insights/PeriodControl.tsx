import { ChevronLeftIcon } from "@/components/shell/icons";
import { useI18n } from "@/hooks/useI18n";
import { GRAINS, canStepNext, periodRange, stepAnchor, type Grain } from "@/lib/periodRange";

/**
 * PeriodControl — the shared Historial/analytics period selector: a Sem·Men·Tri·Anu
 * grain toggle + a ‹ period-label › stepper. Controlled; the host owns
 * {grain, anchor}. Ports the design-lab PeriodControl (the drag-pad gesture is a
 * deferred enhancement — the arrows + toggle carry the core interaction).
 */
export function PeriodControl({
  grain,
  anchor,
  onGrainChange,
  onAnchorChange,
}: {
  grain: Grain;
  anchor: Date;
  onGrainChange: (g: Grain) => void;
  onAnchorChange: (d: Date) => void;
}) {
  const { t, locale } = useI18n();
  const range = periodRange(grain, anchor, locale);
  const atNewest = !canStepNext(grain, anchor);
  const grainLabel: Record<Grain, string> = {
    week: t("history.grainWeek"),
    month: t("history.grainMonth"),
    quarter: t("history.grainQuarter"),
    year: t("history.grainYear"),
  };

  return (
    <div className="flex items-stretch gap-gt-8" style={{ height: 44 }} data-testid="period-control">
      <div
        role="group"
        aria-label={t("history.dimension")}
        className="inline-flex shrink-0 items-stretch gap-0.5 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface p-0.5"
      >
        {GRAINS.map((g) => {
          const active = g === grain;
          return (
            <button
              key={g}
              type="button"
              aria-pressed={active}
              onClick={() => onGrainChange(g)}
              className={`grid place-items-center rounded-gt-lg px-gt-8 font-gt-display text-gt-xs font-extrabold transition ${
                active ? "bg-gt-primary text-white shadow-gt-xs" : "text-gt-ink-2 hover:text-gt-ink"
              }`}
            >
              {grainLabel[g]}
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs">
        <button
          type="button"
          aria-label={t("dashboard.prevMonth")}
          onClick={() => onAnchorChange(stepAnchor(grain, anchor, -1))}
          className="grid w-9 shrink-0 place-items-center text-gt-ink transition hover:bg-gt-bg-3"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span
          data-testid="period-label"
          className="flex min-w-0 flex-1 items-center justify-center truncate px-gt-4 font-gt-display text-gt-sm font-extrabold capitalize text-gt-ink"
        >
          {range.label}
        </span>
        <button
          type="button"
          aria-label={t("dashboard.nextMonth")}
          disabled={atNewest}
          onClick={() => onAnchorChange(stepAnchor(grain, anchor, 1))}
          className="grid w-9 shrink-0 place-items-center text-gt-ink transition hover:bg-gt-bg-3 disabled:opacity-30"
        >
          <ChevronLeftIcon className="h-5 w-5 rotate-180" />
        </button>
      </div>
    </div>
  );
}
