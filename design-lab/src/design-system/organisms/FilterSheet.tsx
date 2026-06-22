import { useEffect, useRef, useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { SortIcon } from "@design-system/assets/icons";
import { periodLabel, type FilterFacet, type FilterFacetOption } from "@lib/browseFixtures";
import { IconOptionGrid, ListOptionChips, PeriodNavigator, SortFacetBody, facetKind } from "./FilterFacets";

/**
 * FilterSheet — Gustify FilterFlow port. A filter overlay with a header (eyebrow
 * + title + match-count), an accordion of facets in one bordered shell (one open
 * at a time, NO chevron — the row IS the toggle), and a 2-column Limpiar/Aplicar
 * footer. The parent owns the selection; FilterSheet calls back on apply/clear.
 *
 * Selection is array-valued per facet ("token" strings). Each facet row shows
 * selection SLOTS on the right (one per maxSelections): a filled chip (icon or
 * value) or a dashed "+" placeholder. On ADD, the option's NAME flashes over the
 * slots for 3s (Gustify behavior), then reverts. Facet body varies by kind:
 * icons (multi), list (single), period (4-dim navigator), sort (dim + direction).
 */

/** facetId → selected token ids (array; single-select facets hold 0–1). */
export interface FilterSelection {
  [facetId: string]: string[];
}

export interface FilterSheetProps {
  facets: FilterFacet[];
  selection: FilterSelection;
  title?: string;
  matchCount?: number;
  matchNoun?: string;
  onApply: (selection: FilterSelection) => void;
  onClear: () => void;
  onClose: () => void;
  className?: string;
}

/** Count of facets with at least one selection — for the Aplicar badge. */
export function selectionCount(sel: FilterSelection): number {
  return Object.values(sel).filter((v) => v && v.length > 0).length;
}

function FacetLeadIcon({ icon }: { icon: string }) {
  if (icon === "svg:sort") return <SortIcon className="h-7 w-7 text-gt-ink" />;
  return <PixelIcon name={icon} size={28} className="shrink-0" />;
}

// ── Selection slots + name flash ────────────────────────────────────────
/** Resolve a selected token to its display: icon + label (for the slot/flash). */
function resolveToken(facet: FilterFacet, token: string): { icon?: string; label: string; category?: string } {
  const kind = facetKind(facet);
  if (kind === "period") {
    return { label: periodLabel(token) ?? token };
  }
  if (kind === "sort") {
    const [dimId, dir] = token.split(":");
    const opt = facet.options.find((o) => o.id === dimId);
    const arrow = dir === "asc" ? "↑" : "↓";
    return { label: `${opt?.label ?? dimId} ${arrow}` };
  }
  const opt = facet.options.find((o: FilterFacetOption) => o.id === token);
  return { icon: opt?.icon, label: opt?.label ?? token, category: opt?.category };
}

function SlotChip({ facet, token }: { facet: FilterFacet; token: string }) {
  const r = resolveToken(facet, token);
  // Gustify slot: rounded-md, ink border, neutral surfaceMuted fill (no category tint).
  return (
    <span
      className="grid h-8 min-w-8 place-items-center rounded-gt-md border-2 border-gt-line-strong bg-gt-bg-3 px-gt-2 shadow-gt-xs"
      title={r.label}
    >
      {r.icon ? (
        <PixelIcon name={r.icon} size={24} />
      ) : (
        <span className="max-w-[64px] truncate px-gt-2 font-gt-display text-gt-xs font-extrabold leading-none text-gt-ink">{r.label}</span>
      )}
    </span>
  );
}

function EmptySlot() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-gt-md border-2 border-dashed border-gt-line bg-gt-surface">
      <span className="font-gt-display text-gt-lg font-extrabold leading-none text-gt-ink-3">+</span>
    </span>
  );
}

/** the just-added option's name + glyph, flashed over the slots. */
interface FlashState {
  label: string;
  icon?: string;
  /** bumped per flash so the capsule re-keys and the keyframe restarts. */
  id: number;
}

/**
 * The right-side slot region. On ADD, the picked name + icon POPS in
 * (gt-flash-in) and HOLDS while the slots are HIDDEN — only ONE of the two is
 * ever visible (no overlap). Removing a selection just drops its slot (no flash).
 */
function SelectionSlots({ facet, selected, flash }: { facet: FilterFacet; selected: string[]; flash: FlashState | null }) {
  const slotCount = facet.maxSelections ?? 1;
  const slots = Array.from({ length: slotCount }, (_, i) => selected[i]);
  return (
    <span className="relative ml-auto inline-flex shrink-0 items-center">
      {/* slots are fully hidden while the flash shows (not cross-faded) */}
      <span className={`inline-flex items-center gap-gt-6 ${flash ? "invisible" : ""}`}>
        {slots.map((token, i) => (token ? <SlotChip key={token} facet={facet} token={token} /> : <EmptySlot key={`empty-${i}`} />))}
      </span>
      {flash ? (
        <span
          key={flash.id}
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-gt-4"
          style={{ animation: "gt-flash-in 2000ms ease-out both" }}
        >
          <span className="max-w-[150px] truncate rounded-gt-pill px-gt-8 py-gt-2 font-gt-display text-gt-sm font-extrabold leading-none text-gt-ink" style={{ backgroundColor: "rgba(251,191,36,0.30)" }}>
            {flash.label}
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-gt-md border-2 border-gt-line-strong bg-gt-bg-3 shadow-gt-xs">
            {flash.icon ? <PixelIcon name={flash.icon} size={24} /> : <span className="h-2 w-2 rounded-gt-pill bg-gt-ink" />}
          </span>
        </span>
      ) : null}
    </span>
  );
}

// ── One facet (header row + disclosure body) ────────────────────────────
function Facet({
  facet,
  selected,
  open,
  onToggleOpen,
  onChange,
  onFlash,
  flash,
}: {
  facet: FilterFacet;
  selected: string[];
  open: boolean;
  onToggleOpen: () => void;
  onChange: (next: string[]) => void;
  /** fires only on ADD — flashes the picked name + icon. Removals are silent. */
  onFlash: (label: string, icon?: string) => void;
  flash: FlashState | null;
}) {
  const kind = facetKind(facet);
  const max = facet.maxSelections ?? 1;

  function toggleMulti(optionId: string) {
    const opt = facet.options.find((o) => o.id === optionId);
    if (selected.includes(optionId)) {
      onChange(selected.filter((id) => id !== optionId)); // remove → just drop the slot, no flash
    } else if (selected.length < max) {
      onChange([...selected, optionId]);
      if (opt) onFlash(opt.label, opt.icon);
    }
  }

  function setSingle(token: string | null) {
    const had = selected[0];
    onChange(token ? [token] : []);
    if (token && token !== had) {
      const r = resolveToken(facet, token);
      onFlash(r.label, r.icon); // set → flash; clear is silent
    }
  }

  return (
    <section className="border-b-2 border-gt-line last:border-b-0">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        className={`flex w-full items-center gap-gt-10 px-gt-12 py-gt-10 text-left transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/20 ${
          open ? "bg-gt-warning/25" : ""
        }`}
      >
        <FacetLeadIcon icon={facet.icon} />
        <span className="min-w-0 max-w-[42%] truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{facet.title}</span>
        <span className="min-w-0 flex-1" />
        <SelectionSlots facet={facet} selected={selected} flash={flash} />
      </button>

      <div className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-gt-bounce ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="p-gt-12">
            {kind === "icons" ? (
              <IconOptionGrid options={facet.options} selected={selected} max={max} onToggle={toggleMulti} />
            ) : kind === "period" ? (
              // tapping the committed period again clears it (toggle off)
              <PeriodNavigator selected={selected} onPick={(token) => setSingle(selected[0] === token ? null : token)} />
            ) : kind === "sort" ? (
              <SortFacetBody options={facet.options} selected={selected} onChange={setSingle} />
            ) : (
              <ListOptionChips
                options={facet.options}
                selected={selected}
                onToggle={(id) => setSingle(selected.includes(id) ? null : id)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FilterSheet ─────────────────────────────────────────────────────────
export function FilterSheet({
  facets,
  selection,
  title = "Buscar compras",
  matchCount,
  matchNoun = "resultados",
  onApply,
  onClear,
  onClose,
  className = "",
}: FilterSheetProps) {
  const [draft, setDraft] = useState<FilterSelection>(() => ({ ...selection }));
  const [openFacet, setOpenFacet] = useState<string>(facets[0]?.id ?? "");
  // per-facet 2.5s name flash on add/remove (Gustify parity). `id` re-keys the
  // capsule so the pop-in keyframe restarts on every pick.
  const [flash, setFlash] = useState<{ facetId: string; label: string; icon?: string; id: number } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashSeq = useRef(0);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  function triggerFlash(facetId: string, label: string, icon?: string) {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashSeq.current += 1;
    setFlash({ facetId, label, icon, id: flashSeq.current });
    flashTimer.current = setTimeout(() => setFlash(null), 2000);
  }

  const activeCount = selectionCount(draft);

  function updateFacet(facetId: string, next: string[]) {
    setDraft((prev) => ({ ...prev, [facetId]: next }));
  }

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-bg shadow-gt-md ${className}`}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-gt-10 px-gt-16 pb-gt-12 pt-gt-14">
        <span className="min-w-0">
          <p className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Filtros</p>
          <h2 className="truncate font-gt-display text-gt-3xl font-extrabold leading-tight text-gt-ink">{title}</h2>
          {typeof matchCount === "number" ? (
            <p className="mt-gt-2 text-gt-sm font-bold text-gt-ink-2">{matchCount} {matchNoun} coinciden</p>
          ) : null}
        </span>
        <button
          type="button"
          aria-label="Cerrar filtros"
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface font-gt-display text-gt-md font-extrabold leading-none text-gt-ink shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-gt-12 pb-gt-12">
        <div className="overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
          {facets.map((facet) => (
            <Facet
              key={facet.id}
              facet={facet}
              selected={draft[facet.id] ?? []}
              open={openFacet === facet.id}
              onToggleOpen={() => setOpenFacet((prev) => (prev === facet.id ? "" : facet.id))}
              onChange={(next) => updateFacet(facet.id, next)}
              onFlash={(label, icon) => triggerFlash(facet.id, label, icon)}
              flash={flash?.facetId === facet.id ? flash : null}
            />
          ))}
        </div>
      </div>

      <footer className="grid grid-cols-2 gap-gt-8 border-t-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12">
        <button
          type="button"
          onClick={() => {
            const cleared: FilterSelection = {};
            for (const f of facets) cleared[f.id] = [];
            setDraft(cleared);
            onClear();
          }}
          className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface py-gt-10 font-gt-display text-gt-sm font-extrabold text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={() => onApply(draft)}
          className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary py-gt-10 font-gt-display text-gt-sm font-extrabold text-white shadow-gt-sm transition hover:-translate-y-0.5"
        >
          Aplicar{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </footer>
    </div>
  );
}

/**
 * FilterTriggerButton — the header action that opens the filter sheet. Shows a
 * filter icon with an active-count badge (Gustify pattern).
 */
export function FilterTriggerButton({ activeCount = 0, onClick }: { activeCount?: number; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Filtros${activeCount > 0 ? ` (${activeCount} activos)` : ""}`}
      onClick={onClick}
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-gt-md border-2 border-gt-line bg-gt-surface transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:border-gt-line-strong hover:shadow-gt-xs"
    >
      <PixelIcon name="action-filter-e" size={32} />
      {activeCount > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-gt-surface bg-gt-primary text-[10px] font-extrabold leading-none text-white">
          {activeCount}
        </span>
      ) : null}
    </button>
  );
}
