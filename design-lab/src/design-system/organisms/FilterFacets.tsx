import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import {
  PERIOD_WEEKS,
  PERIOD_DIM_NOUN,
  periodToken,
  parsePeriodToken,
  periodDimLabel,
  stepPeriod,
  canStepPeriod,
  type FilterFacet,
  type FilterFacetOption,
  type PeriodDimId,
} from "@lib/browseFixtures";

/**
 * Facet content renderers for FilterSheet — the expanded body of each facet:
 *   - IconOptionGrid  → multi-select icon chips (category bg color, count, max N)
 *   - ListOptionChips → single-select label chips (Location)
 *   - PeriodNavigator → 4 always-visible center-value carousels (year…week)
 *   - SortFacetBody   → dimension single-select + direction up/down toggle
 *
 * All selection state is array-valued ("token strings"); the parent FilterSheet
 * owns it and passes value + onChange. No labels render inline on icon grids —
 * the label surfaces via the slot name-flash (handled by the parent).
 */

// ── Icon grid (Category): multi-select, category color, count, max N ─────
export function IconOptionGrid({
  options,
  selected,
  max,
  onToggle,
}: {
  options: FilterFacetOption[];
  selected: string[];
  max: number;
  onToggle: (optionId: string) => void;
}) {
  const atLimit = selected.length >= max;
  // Gustify FilterFlow parity: icons sit DIRECTLY on a surfaceMuted grid (no
  // per-icon tinted disc, no count); the selected one gets an ink ring, hover
  // pops (scale-105). Transparent border keeps unselected icons borderless.
  return (
    <div className="grid grid-cols-5 gap-gt-6 rounded-gt-lg border-2 border-gt-line bg-gt-bg-3 p-gt-8">
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        const disabled = !active && atLimit;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            title={opt.label}
            onClick={() => onToggle(opt.id)}
            className={`mx-auto grid h-12 w-12 place-items-center rounded-gt-pill border-2 bg-transparent transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 ${
              disabled ? "cursor-not-allowed opacity-35" : "hover:scale-105"
            } ${active ? "border-gt-line-strong shadow-gt-xs" : "border-transparent"}`}
          >
            {opt.icon ? <PixelIcon name={opt.icon} size={32} /> : null}
          </button>
        );
      })}
    </div>
  );
}

// ── List chips (Location): single-select labels ─────────────────────────
export function ListOptionChips({
  options,
  selected,
  onToggle,
}: {
  options: FilterFacetOption[];
  selected: string[];
  onToggle: (optionId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-gt-8 rounded-gt-xl border-2 border-gt-line bg-gt-bg-3 p-gt-10">
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(opt.id)}
            className={`inline-flex items-center gap-gt-6 rounded-gt-pill border-2 px-gt-10 py-gt-6 font-gt-display text-gt-sm font-extrabold shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 ${
              active ? "border-gt-line-strong bg-gt-primary text-white" : "border-gt-line-strong bg-gt-surface text-gt-ink hover:shadow-gt-sm"
            }`}
          >
            {opt.label}
            {opt.count != null ? <span className={active ? "text-white/80" : "text-gt-ink-3"}>({opt.count})</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// ── Period navigator: one linked timeline, 4 big-arrow steppers ─────────
//
// All 4 steppers share a single anchor week (`anchorIndex`). Stepping any
// dimension moves the anchor at that grain (week±1, or jump to the first week
// of the next/prev month/quarter/year) — rolling over the higher dims for free.
// Tapping a stepper's center value COMMITS that dimension as the granularity.

const PERIOD_DIM_ORDER: PeriodDimId[] = ["year", "quarter", "month", "week"];

/** A big ‹ value › stepper (Cantidad-style): wide arrow buttons + center value. */
function DimensionStepper({
  dim,
  label,
  selected,
  canPrev,
  canNext,
  onStep,
  onPick,
}: {
  dim: PeriodDimId;
  label: string;
  selected: boolean;
  canPrev: boolean;
  canNext: boolean;
  onStep: (dir: -1 | 1) => void;
  onPick: () => void;
}) {
  const noun = PERIOD_DIM_NOUN[dim];
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-gt-8">
      <button
        type="button"
        aria-label={`${noun} anterior`}
        disabled={!canPrev}
        onClick={() => onStep(-1)}
        className="grid h-12 w-11 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-sm disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-gt-xs"
      >
        <span aria-hidden="true" className="ml-0.5 h-2.5 w-2.5 rotate-45 border-b-2 border-l-2 border-current" />
      </button>
      <button
        type="button"
        onClick={onPick}
        aria-pressed={selected}
        title={`${noun}: ${label}`}
        className={`grid h-12 min-w-0 place-items-center rounded-gt-lg border-2 px-gt-8 text-center font-gt-display text-gt-md font-extrabold leading-none transition duration-150 ease-gt-bounce ${
          selected
            ? "border-gt-line-strong bg-gt-primary text-white shadow-gt-sm"
            : "border-gt-line-strong bg-gt-bg-3 text-gt-ink shadow-gt-xs hover:-translate-y-0.5 hover:shadow-gt-sm"
        }`}
      >
        <span className="truncate">{label}</span>
      </button>
      <button
        type="button"
        aria-label={`${noun} siguiente`}
        disabled={!canNext}
        onClick={() => onStep(1)}
        className="grid h-12 w-11 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-sm disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-gt-xs"
      >
        <span aria-hidden="true" className="mr-0.5 h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-current" />
      </button>
    </div>
  );
}

export function PeriodNavigator({
  selected,
  onPick,
}: {
  /** single token "dim:weekIndex" or empty. */
  selected: string[];
  onPick: (token: string) => void;
}) {
  const parsed = selected[0] ? parsePeriodToken(selected[0]) : null;
  // anchor week: from the committed selection, else default to the latest week.
  const [anchorIndex, setAnchorIndex] = useState<number>(parsed ? parsed.index : PERIOD_WEEKS.length - 1);
  const activeDim = parsed?.dim ?? null;
  const anchor = PERIOD_WEEKS[anchorIndex] ?? PERIOD_WEEKS[PERIOD_WEEKS.length - 1];

  function step(dim: PeriodDimId, dir: -1 | 1) {
    const next = stepPeriod(dim, anchorIndex, dir);
    if (next == null) return;
    setAnchorIndex(next);
    // if this dim is the committed granularity, keep the selection in sync.
    if (activeDim === dim) onPick(periodToken(dim, next));
  }

  return (
    <div className="flex flex-col gap-gt-8 rounded-gt-xl border-2 border-gt-line bg-gt-bg-3 p-gt-12">
      {PERIOD_DIM_ORDER.map((dim) => (
        <DimensionStepper
          key={dim}
          dim={dim}
          label={periodDimLabel(dim, anchor)}
          selected={activeDim === dim}
          canPrev={canStepPeriod(dim, anchorIndex, -1)}
          canNext={canStepPeriod(dim, anchorIndex, 1)}
          onStep={(dir) => step(dim, dir)}
          onPick={() => onPick(periodToken(dim, anchorIndex))}
        />
      ))}
    </div>
  );
}

// ── Sort facet: dimension single-select + direction up/down toggle ──────
export function SortFacetBody({
  options,
  selected,
  onChange,
}: {
  options: FilterFacetOption[];
  /** single token "dim:dir" or empty. */
  selected: string[];
  onChange: (token: string | null) => void;
}) {
  const token = selected[0] ?? null;
  const [dim, dir] = token ? token.split(":") : [null, "desc"];
  const direction = (dir as "asc" | "desc") ?? "desc";

  function pickDim(optionId: string) {
    if (dim === optionId) {
      onChange(null); // tapping the active dim clears it
    } else {
      onChange(`${optionId}:${direction}`);
    }
  }

  function toggleDir() {
    if (!dim) return;
    onChange(`${dim}:${direction === "desc" ? "asc" : "desc"}`);
  }

  return (
    <div className="flex flex-col gap-gt-10 rounded-gt-xl border-2 border-gt-line bg-gt-bg-3 p-gt-12">
      <div className="flex flex-wrap gap-gt-8">
        {options.map((opt) => {
          const active = dim === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              onClick={() => pickDim(opt.id)}
              className={`inline-flex items-center gap-gt-6 rounded-gt-pill border-2 px-gt-10 py-gt-6 font-gt-display text-gt-sm font-extrabold shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 ${
                active ? "border-gt-line-strong bg-gt-primary text-white" : "border-gt-line-strong bg-gt-surface text-gt-ink hover:shadow-gt-sm"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* direction toggle — only enabled once a dimension is chosen */}
      <div className="flex items-center gap-gt-8 border-t-2 border-gt-line pt-gt-10">
        <span className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Dirección</span>
        <span className="flex-1" />
        <button
          type="button"
          disabled={!dim}
          aria-label={direction === "desc" ? "Descendente" : "Ascendente"}
          onClick={toggleDir}
          className={`inline-flex items-center gap-gt-4 rounded-gt-pill border-2 px-gt-10 py-gt-4 font-gt-display text-gt-sm font-extrabold transition duration-150 ease-gt-bounce ${
            !dim
              ? "cursor-not-allowed border-gt-line bg-gt-surface text-gt-ink-3 opacity-50"
              : "border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs hover:-translate-y-0.5"
          }`}
        >
          <span aria-hidden="true" className={`inline-block transition-transform duration-150 ${direction === "asc" ? "rotate-180" : ""}`}>
            ↓
          </span>
          {direction === "desc" ? "Mayor a menor" : "Menor a mayor"}
        </button>
      </div>
    </div>
  );
}

/** Facet kind type guard helpers re-exported for FilterSheet convenience. */
export function facetKind(facet: FilterFacet): NonNullable<FilterFacet["kind"]> {
  return facet.kind ?? "list";
}
