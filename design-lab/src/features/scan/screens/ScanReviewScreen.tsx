import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Modal } from "@design-system/atoms/Modal";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { PaymentChip } from "@design-system/molecules/PaymentChip";
import { PaymentPicker } from "@design-system/molecules/PaymentPicker";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import { GroupedCategoryPicker } from "../components/GroupedCategoryPicker";
import { LocationPicker } from "../components/LocationPicker";
import { DatePicker } from "../components/DatePicker";
import { TimePicker } from "../components/TimePicker";
import { ScanSaveConfirmScreen, type Correction } from "./ScanSaveConfirmScreen";
import { getCategoryToken } from "@lib/categoryTokens";
import { CASH, SAMPLE_CARDS } from "@lib/paymentMethods";
import { type TxnItem } from "@lib/transactionFixtures";
import {
  SAMPLE_RECEIPT,
  AVAILABLE_CURRENCIES,
  getCurrency,
  formatMoney,
  type ScanReceipt,
  type CurrencyCode,
} from "@lib/scanFixtures";

/**
 * ScanReviewScreen (DM-42) — simple-scan review with EDIT-IN-PLACE (legacy
 * BoletApp editor). Tap a field to edit where it sits:
 *   name      → inline text (30-char cap)
 *   category  → GroupedCategoryPicker (establishment: L1 group → L2 leaves)
 *   payment   → PaymentPicker
 *   location  → LocationPicker (country → city)
 *   date      → DatePicker (calendar grid)   ·  hora → TimePicker (clock)
 *   currency  → CurrencyPicker (drives price decimals)
 * Tapping an ITEM expands all its fields inline: name (text), category (item
 * GroupedCategoryPicker: L3 → L4), qty (decimal), unit price (decimals per
 * currency), total (read-only = unit×qty), delete; cancel reverts + collapses.
 * On Guardar, a ScanSaveConfirmScreen lists the storable corrections (est
 * name/category, item name/category) for keep-or-discard before saving.
 */
export interface ScanReviewScreenProps {
  receipt?: ScanReceipt;
  payment?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

const PAYMENT_METHODS = [CASH, ...SAMPLE_CARDS];
const NAME_CAP = 30;

function sanitizePrice(raw: string, decimals: 0 | 2): string {
  const s = raw.replace(/[^\d.]/g, "");
  if (decimals === 0) return s.replace(/\./g, "");
  const [int, dec] = s.split(".");
  return dec != null ? `${int}.${dec.slice(0, 2)}` : int;
}
function sanitizeQty(raw: string): string {
  const s = raw.replace(/[^\d.]/g, "");
  const [int, dec] = s.split(".");
  return dec != null ? `${int}.${dec.slice(0, 3)}` : int;
}

const inlineInput =
  "rounded-gt-md border-2 border-gt-primary bg-gt-surface px-gt-8 py-gt-2 font-gt-display font-extrabold text-gt-ink shadow-gt-xs focus:outline-none";

/** A tap-to-edit text value: text at rest, an input when active. */
function InlineText({ value, onChange, cap, className = "", ariaLabel }: { value: string; onChange: (v: string) => void; cap?: number; className?: string; ariaLabel: string }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        autoFocus aria-label={ariaLabel} className={`${inlineInput} ${className}`}
        value={value} maxLength={cap}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === "Enter") setEditing(false); }}
      />
    );
  }
  return (
    <button type="button" aria-label={ariaLabel} onClick={() => setEditing(true)} className={`text-left ${className}`}>{value}</button>
  );
}

/** Small tappable meta pill (location · date · hora · currency triggers). */
function MetaPill({ icon, onClick, children, ariaLabel }: { icon?: string; onClick: () => void; children: React.ReactNode; ariaLabel: string }) {
  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className="inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line bg-gt-surface px-gt-8 py-gt-2 font-gt-display text-gt-xs font-extrabold text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5 hover:border-gt-line-strong">
      {icon ? <PixelIcon name={icon} size={14} /> : null}
      {children}
    </button>
  );
}

// ── Currency picker (kept — full-screen list) ───────────────────────────
function CurrencyPicker({ open, onClose, selected, onSelect }: { open: boolean; onClose: () => void; selected: CurrencyCode; onSelect: (c: CurrencyCode) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Moneda">
      <ul className="flex flex-col gap-gt-6">
        {AVAILABLE_CURRENCIES.map((c) => {
          const active = c.code === selected;
          return (
            <li key={c.code}>
              <button type="button" onClick={() => { onSelect(c.code); onClose(); }} className={`flex w-full items-center gap-gt-10 rounded-gt-lg border-2 px-gt-12 py-gt-10 text-left font-gt-display text-gt-sm font-extrabold transition hover:-translate-y-0.5 ${active ? "border-gt-line-strong bg-gt-primary text-white" : "border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs"}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-gt-md border-2 ${active ? "border-white/40 bg-white/10" : "border-gt-line-strong bg-gt-bg-3"} font-gt-display text-gt-sm font-extrabold`}>{c.symbol}</span>
                <span className="flex-1">{c.code}</span>
                <span className={`text-gt-xs font-medium ${active ? "text-white/80" : "text-gt-ink-3"}`}>{c.decimals === 0 ? "Sin decimales" : "2 decimales"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

// ── Editable item row ───────────────────────────────────────────────────
function EditableItem({ item, currency, editing, onEnterEdit, onCommit, onCancelEdit, onChange, onDelete, onPickCategory }: {
  item: TxnItem;
  currency: CurrencyCode;
  editing: boolean;
  onEnterEdit: () => void;
  onCommit: () => void;
  onCancelEdit: () => void;
  onChange: (patch: Partial<TxnItem>) => void;
  onDelete: () => void;
  onPickCategory: () => void;
}) {
  const cur = getCurrency(currency);
  const total = item.unitPrice * item.units; // derived, read-only

  // collapsed — whole row taps into edit; no trailing icon.
  if (!editing) {
    return (
      <li>
        <button type="button" onClick={onEnterEdit} className="flex w-full items-center gap-gt-10 px-gt-12 py-gt-10 text-left transition hover:bg-gt-bg-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{item.name}</span>
            <span className="mt-gt-2 flex min-w-0 items-center gap-gt-6">
              <CategoryChip category={item.category} size="sm" />
              {item.subcategory ? (
                // free-text subcategory — plain text, category's prominent color, no icon.
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
        </button>
      </li>
    );
  }

  // expanded — all fields editable; only cancel/accept (no trash by the name).
  return (
    <li className="bg-gt-bg-3 p-gt-12">
      <div className="flex flex-col gap-gt-10">
        <label className="flex flex-col gap-gt-2">
          <span className="font-gt-display text-[10px] font-extrabold uppercase text-gt-ink-3">Nombre</span>
          <input autoFocus aria-label="Nombre del ítem" className={`${inlineInput} text-gt-sm`} value={item.name} maxLength={60} onChange={(e) => onChange({ name: e.target.value })} />
        </label>

        {/* category — just the chip (no outer container); tap to open the grouped picker.
            Subcategory (free text, not editable) sits next to it in the category color. */}
        <div className="flex flex-col items-start gap-gt-2">
          <span className="font-gt-display text-[10px] font-extrabold uppercase text-gt-ink-3">Categoría</span>
          <div className="flex items-center gap-gt-6">
            <button type="button" aria-label="Cambiar categoría del ítem" onClick={onPickCategory} className="transition hover:-translate-y-0.5">
              <CategoryChip category={item.category} size="sm" />
            </button>
            {item.subcategory ? (
              <span className="font-gt-display text-gt-xs font-extrabold" style={{ color: getCategoryToken(item.category).color }}>{item.subcategory}</span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-gt-8">
          <label className="flex flex-col gap-gt-2">
            <span className="font-gt-display text-[10px] font-extrabold uppercase text-gt-ink-3">Cantidad</span>
            <input inputMode="decimal" aria-label="Cantidad" className={`${inlineInput} text-gt-sm`} value={String(item.units)} onChange={(e) => onChange({ units: Number(sanitizeQty(e.target.value)) || 0 })} />
          </label>
          <label className="flex flex-col gap-gt-2">
            <span className="font-gt-display text-[10px] font-extrabold uppercase text-gt-ink-3">P. unit. ({cur.symbol})</span>
            <input inputMode="decimal" aria-label="Precio unitario" className={`${inlineInput} text-gt-sm`} value={String(item.unitPrice)} onChange={(e) => onChange({ unitPrice: Number(sanitizePrice(e.target.value, cur.decimals)) || 0 })} />
          </label>
          <label className="flex flex-col gap-gt-2">
            <span className="font-gt-display text-[10px] font-extrabold uppercase text-gt-ink-3">Total</span>
            <span className="rounded-gt-md border-2 border-gt-line bg-gt-surface px-gt-8 py-gt-2 font-gt-display text-gt-sm font-extrabold text-gt-ink-2">{formatMoney(total, currency)}</span>
          </label>
        </div>

        {/* full-width 3-col footer: ✕ cancel (left) · Eliminar (middle) · ✓ accept (right) */}
        <div className="grid grid-cols-3 gap-gt-8">
          <button type="button" aria-label="Cancelar" onClick={onCancelEdit} className="flex h-10 items-center justify-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5">
            <span className="font-gt-display text-gt-lg font-extrabold leading-none">✕</span>
          </button>
          <button type="button" aria-label="Eliminar ítem" onClick={onDelete} className="flex h-10 items-center justify-center gap-gt-4 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-negative shadow-gt-xs transition hover:-translate-y-0.5 hover:border-gt-negative">
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

/** Diff the original vs current receipt to collect storable corrections. */
function collectCorrections(orig: ScanReceipt, cur: ScanReceipt): Correction[] {
  const out: Correction[] = [];
  if (cur.merchant !== orig.merchant) {
    out.push({ id: "est-name", kind: "establishment-name", label: "Comercio", from: orig.merchant, to: cur.merchant });
  }
  if (cur.category !== orig.category) {
    out.push({ id: "est-cat", kind: "establishment-category", label: "Comercio", from: getCategoryToken(orig.category).label, to: getCategoryToken(cur.category).label });
  }
  const n = Math.min(orig.items.length, cur.items.length);
  for (let i = 0; i < n; i++) {
    const a = orig.items[i], b = cur.items[i];
    if (b.name !== a.name) out.push({ id: `item-name-${i}`, kind: "item-name", label: a.name, from: a.name, to: b.name });
    if (b.category !== a.category) out.push({ id: `item-cat-${i}`, kind: "item-category", label: b.name, from: getCategoryToken(a.category).label, to: getCategoryToken(b.category).label });
  }
  return out;
}

export function ScanReviewScreen({ receipt: initialReceipt = SAMPLE_RECEIPT, payment: initialPayment = "falabella", onSave, onCancel }: ScanReviewScreenProps) {
  const [original] = useState<ScanReceipt>(initialReceipt);
  const [receipt, setReceipt] = useState<ScanReceipt>(initialReceipt);
  const [payment, setPayment] = useState<string>(initialPayment);
  const [methods, setMethods] = useState(PAYMENT_METHODS);

  // item editing: which row is open + a snapshot for revert-on-cancel.
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editSnapshot, setEditSnapshot] = useState<TxnItem | null>(null);

  // open-picker state
  const [estCatOpen, setEstCatOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [curOpen, setCurOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [itemCatIdx, setItemCatIdx] = useState<number | null>(null);

  // save-confirm screen
  const [confirming, setConfirming] = useState(false);

  const total = receipt.items.reduce((s, it) => s + it.unitPrice * it.units, 0);

  function setField<K extends keyof ScanReceipt>(key: K, value: ScanReceipt[K]) {
    setReceipt((r) => ({ ...r, [key]: value }));
  }
  function setItem(idx: number, patch: Partial<TxnItem>) {
    setReceipt((r) => ({ ...r, items: r.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  }
  function deleteItem(idx: number) {
    setReceipt((r) => ({ ...r, items: r.items.filter((_, i) => i !== idx) }));
    setEditIdx(null); setEditSnapshot(null);
  }
  function enterEdit(idx: number) { setEditIdx(idx); setEditSnapshot({ ...receipt.items[idx] }); }
  function commitEdit() { setEditIdx(null); setEditSnapshot(null); }
  function cancelEdit() {
    if (editIdx != null && editSnapshot) setItem(editIdx, editSnapshot);
    setEditIdx(null); setEditSnapshot(null);
  }

  const corrections = collectCorrections(original, receipt);

  if (confirming) {
    return (
      <ScanSaveConfirmScreen
        corrections={corrections}
        onBack={() => setConfirming(false)}
        onConfirm={() => { setConfirming(false); onSave?.(); }}
      />
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Revisar boleta" onBack={onCancel ?? (() => {})} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="flex flex-col gap-gt-12 pt-gt-12">
          {/* editable establishment header */}
          <div className="flex items-start gap-gt-12 border-b-2 border-gt-line pb-gt-12">
            <ThumbnailBadge icon={receipt.storeIcon} category={receipt.category} size="md" />
            <div className="flex min-w-0 flex-1 flex-col gap-gt-6">
              <InlineText value={receipt.merchant} onChange={(v) => setField("merchant", v.slice(0, NAME_CAP))} cap={NAME_CAP} ariaLabel="Nombre del comercio" className="min-w-0 truncate text-gt-lg font-extrabold text-gt-ink" />
              <div className="flex flex-wrap items-center gap-gt-6">
                <button type="button" aria-label="Cambiar categoría" onClick={() => setEstCatOpen(true)}>
                  <CategoryChip category={receipt.category} size="sm" />
                </button>
                <button type="button" aria-label="Cambiar medio de pago" onClick={() => setPayOpen(true)}>
                  <PaymentChip method={payment} size="sm" />
                </button>
              </div>
              {/* meta row: location · date · hora · currency — each opens a picker */}
              <div className="flex flex-wrap items-center gap-gt-6">
                <MetaPill icon="nav-home" onClick={() => setLocOpen(true)} ariaLabel="Cambiar ubicación">{receipt.location}</MetaPill>
                <MetaPill icon="chart-calendar" onClick={() => setDateOpen(true)} ariaLabel="Cambiar fecha">{receipt.date}</MetaPill>
                <MetaPill onClick={() => setTimeOpen(true)} ariaLabel="Cambiar hora">{receipt.time}</MetaPill>
                <MetaPill onClick={() => setCurOpen(true)} ariaLabel="Cambiar moneda">{receipt.currency}</MetaPill>
              </div>
            </div>
          </div>

          {/* item list (receipt order) — tap a row to edit it inline */}
          <div className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
            <ul className="divide-y-2 divide-gt-line">
              {receipt.items.map((item, i) => (
                <EditableItem
                  key={i}
                  item={item}
                  currency={receipt.currency}
                  editing={editIdx === i}
                  onEnterEdit={() => enterEdit(i)}
                  onCommit={commitEdit}
                  onCancelEdit={cancelEdit}
                  onChange={(patch) => setItem(i, patch)}
                  onDelete={() => deleteItem(i)}
                  onPickCategory={() => setItemCatIdx(i)}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* footer — X cancel · save button with the Total folded in (label left, amount, ticket icon right) */}
      <div className="shrink-0 border-t-2 border-gt-line-strong bg-gt-surface px-gt-16 pb-gt-32 pt-gt-12">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-gt-10">
          <button type="button" aria-label="Cancelar" onClick={onCancel} className="grid h-12 w-12 place-items-center rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5">
            <span className="font-gt-display text-gt-xl font-extrabold leading-none">✕</span>
          </button>
          <button type="button" aria-label="Guardar transacción" onClick={() => (corrections.length > 0 ? setConfirming(true) : onSave?.())} className="flex h-12 w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-positive px-gt-12 font-gt-display font-extrabold text-white shadow-gt-sm transition hover:-translate-y-0.5">
            <span className="text-gt-sm uppercase tracking-wide text-white/80">Total</span>
            <span className="truncate text-gt-lg">{formatMoney(total, receipt.currency)}</span>
            <PixelIcon name="scan-success" size={24} className="shrink-0" />
          </button>
        </div>
      </div>

      {/* full-screen pickers */}
      <GroupedCategoryPicker open={estCatOpen} onClose={() => setEstCatOpen(false)} mode="establishment" selectedId={receipt.category} onSelect={(id) => setField("category", id)} />
      <GroupedCategoryPicker open={itemCatIdx != null} onClose={() => setItemCatIdx(null)} mode="item" selectedId={itemCatIdx != null ? receipt.items[itemCatIdx]?.category ?? "" : ""} onSelect={(id) => { if (itemCatIdx != null) setItem(itemCatIdx, { category: id }); }} />
      <PaymentPicker open={payOpen} onClose={() => setPayOpen(false)} methods={methods} selectedId={payment} onSelect={setPayment} onAddCard={(card) => setMethods((m) => [...m, card])} />
      <LocationPicker open={locOpen} onClose={() => setLocOpen(false)} selectedCity={receipt.location} onSelect={(v) => setField("location", v)} />
      <DatePicker open={dateOpen} onClose={() => setDateOpen(false)} value={receipt.date} onSelect={(label) => setField("date", label)} />
      <TimePicker open={timeOpen} onClose={() => setTimeOpen(false)} value={receipt.time} onSelect={(hhmm) => setField("time", hhmm)} />
      <CurrencyPicker open={curOpen} onClose={() => setCurOpen(false)} selected={receipt.currency} onSelect={(c) => setField("currency", c)} />
    </div>
  );
}
