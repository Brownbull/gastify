import { useEffect, useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { CategoryChip } from "./CategoryChip";
import { inlineInputClass } from "./InlineText";
import { getCategoryToken } from "@lib/categoryTokens";
import { getCurrency, formatMoney, type CurrencyCode } from "@lib/scanFixtures";
import { type TxnItem } from "@lib/transactionFixtures";

/** Strip a price input to digits (+ up to N decimals per the currency). */
function sanitizePrice(raw: string, decimals: 0 | 2): string {
  const s = raw.replace(/[^\d.]/g, "");
  if (decimals === 0) return s.replace(/\./g, "");
  const [int, dec] = s.split(".");
  return dec != null ? `${int}.${dec.slice(0, 2)}` : int;
}
/** Strip a quantity input to digits (+ up to 3 decimals). */
function sanitizeQty(raw: string): string {
  const s = raw.replace(/[^\d.]/g, "");
  const [int, dec] = s.split(".");
  return dec != null ? `${int}.${dec.slice(0, 3)}` : int;
}

export interface EditableItemProps {
  item: TxnItem;
  currency: CurrencyCode;
  editing: boolean;
  onEnterEdit: () => void;
  onCommit: () => void;
  onCancelEdit: () => void;
  onChange: (patch: Partial<TxnItem>) => void;
  onDelete: () => void;
  onPickCategory: () => void;
  /** display-only: the collapsed row is not tappable (locked transactions). */
  readOnly?: boolean;
}

/**
 * EditableItem — a transaction item row that edits in place (legacy BoletApp
 * editor). Collapsed: name · category chip · total / unit×qty. Tapping it
 * expands all fields inline — name (text), category (grouped picker via
 * onPickCategory), quantity + unit price (decimals per currency), read-only
 * total — plus cancel · delete · accept. Shared by the scan review and the
 * saved-transaction detail.
 */
export function EditableItem({ item, currency, editing, onEnterEdit, onCommit, onCancelEdit, onChange, onDelete, onPickCategory, readOnly = false }: EditableItemProps) {
  const cur = getCurrency(currency);
  const total = item.unitPrice * item.units; // derived, read-only

  // Hold qty/price as in-progress STRINGS so a trailing decimal survives typing
  // (the parent stores numbers, but rendering String(number) would drop "1.").
  const [qtyDraft, setQtyDraft] = useState(String(item.units));
  const [priceDraft, setPriceDraft] = useState(String(item.unitPrice));
  useEffect(() => {
    if (editing) { setQtyDraft(String(item.units)); setPriceDraft(String(item.unitPrice)); }
    // reset drafts only when the editor (re)opens — not on every keystroke patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // collapsed — whole row taps into edit; no trailing icon.
  if (!editing) {
    const content = (
      <>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{item.name}</span>
          <span className="mt-gt-2 flex min-w-0 items-center gap-gt-6">
            <CategoryChip category={item.category} size="sm" />
            {item.flagged ? (
              <span className="inline-flex shrink-0 items-center gap-gt-2 rounded-gt-pill border-2 border-gt-warning bg-gt-bg-3 px-gt-4 py-gt-0 font-gt-display text-gt-xs font-extrabold text-gt-warning">
                <PixelIcon name="status-alert" size={13} /> Marcada
              </span>
            ) : null}
            {item.subcategory ? (
              <span className="truncate font-gt-display text-gt-xs font-extrabold" style={{ color: getCategoryToken(item.category).color }}>
                {item.subcategory}
              </span>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{formatMoney(total, currency)}</span>
          <span className="text-gt-xs font-medium text-gt-ink-2">{formatMoney(item.unitPrice, currency)} ×{item.units}</span>
        </span>
      </>
    );
    return (
      <li>
        {readOnly ? (
          <div className="flex w-full items-center gap-gt-10 px-gt-12 py-gt-10">{content}</div>
        ) : (
          <button type="button" onClick={onEnterEdit} className="flex w-full items-center gap-gt-10 px-gt-12 py-gt-10 text-left transition hover:bg-gt-bg-3">{content}</button>
        )}
      </li>
    );
  }

  // expanded — all fields editable; cancel · delete · accept.
  return (
    <li className="bg-gt-bg-3 p-gt-12">
      <div className="flex flex-col gap-gt-10">
        <label className="flex flex-col gap-gt-2">
          <span className="font-gt-display text-[10px] font-extrabold uppercase text-gt-ink-2">Nombre</span>
          <input autoFocus aria-label="Nombre del ítem" className={`${inlineInputClass} text-gt-sm`} value={item.name} maxLength={60} onChange={(e) => onChange({ name: e.target.value })} />
        </label>

        <div className="flex flex-col items-start gap-gt-2">
          <span className="font-gt-display text-[10px] font-extrabold uppercase text-gt-ink-2">Categoría</span>
          <div className="flex items-center gap-gt-6">
            <button type="button" aria-label="Cambiar categoría del ítem" onClick={onPickCategory} className="rounded-gt-pill transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25">
              <CategoryChip category={item.category} size="sm" />
            </button>
            {item.subcategory ? (
              <span className="font-gt-display text-gt-xs font-extrabold" style={{ color: getCategoryToken(item.category).color }}>{item.subcategory}</span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-gt-8">
          <label className="flex flex-col gap-gt-2">
            <span className="font-gt-display text-[10px] font-extrabold uppercase text-gt-ink-2">Cantidad</span>
            <input inputMode="decimal" aria-label="Cantidad" className={`${inlineInputClass} text-gt-sm`} value={qtyDraft} onChange={(e) => { const s = sanitizeQty(e.target.value); setQtyDraft(s); onChange({ units: Number(s) || 0 }); }} />
          </label>
          <label className="flex flex-col gap-gt-2">
            <span className="font-gt-display text-[10px] font-extrabold uppercase text-gt-ink-2">P. unit. ({cur.symbol})</span>
            <input inputMode="decimal" aria-label="Precio unitario" className={`${inlineInputClass} text-gt-sm`} value={priceDraft} onChange={(e) => { const s = sanitizePrice(e.target.value, cur.decimals); setPriceDraft(s); onChange({ unitPrice: Number(s) || 0 }); }} />
          </label>
          <label className="flex flex-col gap-gt-2">
            <span className="font-gt-display text-[10px] font-extrabold uppercase text-gt-ink-2">Total</span>
            <span className="rounded-gt-md border-2 border-gt-line bg-gt-surface px-gt-8 py-gt-2 font-gt-display text-gt-sm font-extrabold text-gt-ink-2">{formatMoney(total, currency)}</span>
          </label>
        </div>

        {/* personal flag (REQ-11) — excluded from analytics + groups; total unchanged */}
        <button
          type="button"
          aria-pressed={!!item.flagged}
          onClick={() => onChange({ flagged: !item.flagged })}
          className={`flex items-center gap-gt-8 rounded-gt-lg border-2 px-gt-10 py-gt-6 text-left transition ${item.flagged ? "border-gt-warning bg-gt-surface" : "border-gt-line bg-gt-surface hover:bg-gt-bg-3"}`}
        >
          <PixelIcon name="status-alert" size={20} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block font-gt-display text-gt-xs font-extrabold text-gt-ink">{item.flagged ? "Ítem marcado" : "Marcar ítem"}</span>
            <span className="block text-[10px] font-medium text-gt-ink-3">Alergias, dieta… — se excluye de los análisis y de los grupos.</span>
          </span>
          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-gt-md border-2 ${item.flagged ? "border-gt-warning bg-gt-warning text-white" : "border-gt-line-strong bg-gt-surface"}`}>
            {item.flagged ? <span className="text-[10px] font-extrabold leading-none">✓</span> : null}
          </span>
        </button>

        <div className="grid grid-cols-3 gap-gt-8">
          <button type="button" aria-label="Cancelar" onClick={onCancelEdit} className="flex h-10 items-center justify-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5">
            <span className="font-gt-display text-gt-lg font-extrabold leading-none">✕</span>
          </button>
          <button type="button" aria-label="Eliminar ítem" onClick={onDelete} className="flex h-10 items-center justify-center gap-gt-4 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-ink-2 shadow-gt-xs transition hover:-translate-y-0.5 hover:border-gt-negative hover:text-gt-negative">
            <PixelIcon name="action-delete" size={18} />
            <span className="font-gt-display text-gt-xs font-extrabold">Eliminar</span>
          </button>
          <button type="button" aria-label="Aceptar" onClick={onCommit} className="flex h-10 items-center justify-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-positive text-white shadow-gt-sm transition hover:-translate-y-0.5">
            <PixelIcon name="scan-success" size={22} />
          </button>
        </div>
      </div>
    </li>
  );
}
