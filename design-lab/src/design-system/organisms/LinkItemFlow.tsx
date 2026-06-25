import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import type { HistoryItem } from "@lib/transactionFixtures";

/**
 * Cross-app item linking flow (DM-19) — connect a scanned item to a known
 * ingredient / prepared meal (Gustify) or a Gastify catalog entry.
 *
 *   LinkSourcePopup → choose "Buscar en Gustify" or "Buscar en Gastify"
 *   AddItemSheet    → the search sheet (Gustify: Ingrediente/Preparado type;
 *                     Gastify: a non-edible category-type picker), search + cancel.
 *
 * Presentational for the mockup — the search field is non-functional; the point
 * is the flow + layout (ported from Gustify's Despensa add-sheet pattern).
 */

export type LinkSource = "gustify" | "gastify";

// ── Source chooser popup ────────────────────────────────────────────────
export function LinkSourcePopup({
  item,
  onPick,
  onClose,
}: {
  item: HistoryItem;
  onPick: (source: LinkSource) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 p-gt-16" onClick={onClose}>
      <div
        className="w-full max-w-[320px] overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b-2 border-gt-line px-gt-16 pb-gt-10 pt-gt-12">
          <p className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Vincular producto</p>
          <h2 className="truncate font-gt-display text-gt-lg font-extrabold text-gt-ink">{item.name}</h2>
        </div>
        <div className="flex flex-col gap-gt-8 p-gt-12">
          <SourceOption
            icon="familia-food-fresh"
            title="Buscar en Gustify"
            subtitle="Ingredientes y platos preparados"
            onClick={() => onPick("gustify")}
          />
          <SourceOption
            icon="item-pantry"
            title="Buscar en Gastify"
            subtitle="Catálogo de productos y servicios"
            onClick={() => onPick("gastify")}
          />
        </div>
        <div className="px-gt-12 pb-gt-12">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface py-gt-8 font-gt-display text-gt-sm font-extrabold text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function SourceOption({ icon, title, subtitle, onClick }: { icon: string; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-gt-10 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface p-gt-10 text-left shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:border-gt-primary hover:shadow-gt-sm"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-bg-3">
        <PixelIcon name={icon} size={28} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{title}</span>
        <span className="truncate text-gt-xs font-medium text-gt-ink-3">{subtitle}</span>
      </span>
      <span aria-hidden="true" className="h-2.5 w-2.5 rotate-[-45deg] border-r-2 border-t-2 border-gt-ink-3" />
    </button>
  );
}

// ── Add sheet (Gustify + Gastify variants) ──────────────────────────────
interface TypeOption {
  id: string;
  label: string;
  icon: string;
}

const GUSTIFY_TYPES: TypeOption[] = [
  { id: "ingredient", label: "Ingrediente", icon: "familia-food-fresh" },
  { id: "prepared", label: "Preparado", icon: "familia-food-prepared" },
];

// Placeholder Gastify (non-edible) taxonomy — refined later when scoped.
const GASTIFY_TYPES: TypeOption[] = [
  { id: "product", label: "Producto", icon: "item-pantry" },
  { id: "service", label: "Servicio", icon: "rubro-servicios-finanzas" },
];

export function AddItemSheet({
  item,
  source,
  onClose,
  onConfirm,
  className = "",
}: {
  item: HistoryItem;
  source: LinkSource;
  onClose: () => void;
  onConfirm: (typeId: string) => void;
  className?: string;
}) {
  const types = source === "gustify" ? GUSTIFY_TYPES : GASTIFY_TYPES;
  const [type, setType] = useState<string>(types[0].id);
  const [query, setQuery] = useState("");
  const sourceName = source === "gustify" ? "Gustify" : "Gastify";

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-bg shadow-gt-md ${className}`}>
      {/* header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-gt-10 px-gt-16 pb-gt-12 pt-gt-14">
        <span className="min-w-0">
          <p className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Buscar en {sourceName}</p>
          <h2 className="truncate font-gt-display text-gt-2xl font-extrabold leading-tight text-gt-ink">{item.name}</h2>
        </span>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface font-gt-display text-gt-md font-extrabold leading-none text-gt-ink shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md"
        >
          ✕
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-gt-12 overflow-y-auto px-gt-16">
        {/* step 1 — type picker (Ingrediente/Preparado · Producto/Servicio) */}
        <section className="flex flex-col gap-gt-8">
          <p className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">¿Qué es?</p>
          <div className="grid grid-cols-2 gap-gt-8">
            {types.map((t) => {
              const active = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setType(t.id)}
                  className={`flex min-h-[44px] items-center justify-center gap-gt-8 rounded-gt-lg border-2 px-gt-12 py-gt-8 font-gt-display text-gt-sm font-extrabold shadow-gt-xs transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 ${
                    active ? "border-gt-line-strong bg-gt-primary text-white" : "border-gt-line bg-gt-surface text-gt-ink hover:border-gt-line-strong"
                  }`}
                >
                  <PixelIcon name={t.icon} size={22} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* step 2 — search field (presentational) */}
        <section className="flex flex-col gap-gt-8">
          <p className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Buscar</p>
          <label className="flex items-center gap-gt-8 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-10 shadow-gt-xs focus-within:border-gt-primary">
            <PixelIcon name="action-search" size={22} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Buscar en ${sourceName}…`}
              className="min-w-0 flex-1 bg-transparent font-gt-display text-gt-sm font-bold text-gt-ink placeholder:text-gt-ink-3 focus:outline-none"
            />
          </label>
          <p className="rounded-gt-lg border-2 border-dashed border-gt-line bg-gt-surface px-gt-12 py-gt-10 text-center text-gt-xs font-bold text-gt-ink-3">
            Escribe para buscar coincidencias en {sourceName}.
          </p>
        </section>
      </div>

      {/* footer — Cancelar / Vincular */}
      <footer className="grid grid-cols-2 gap-gt-8 border-t-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12">
        <button
          type="button"
          onClick={onClose}
          className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface py-gt-10 font-gt-display text-gt-sm font-extrabold text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={query.trim().length === 0}
          onClick={() => onConfirm(type)}
          className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary py-gt-10 font-gt-display text-gt-sm font-extrabold text-white shadow-gt-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
        >
          Vincular
        </button>
      </footer>
    </div>
  );
}
