import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { PaymentChip } from "@design-system/molecules/PaymentChip";
import { PaymentPicker } from "@design-system/molecules/PaymentPicker";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import { GroupedCategoryPicker } from "@design-system/molecules/GroupedCategoryPicker";
import { LocationPicker } from "@design-system/molecules/LocationPicker";
import { DatePicker } from "@design-system/molecules/DatePicker";
import { TimePicker } from "@design-system/molecules/TimePicker";
import { InlineText } from "@design-system/molecules/InlineText";
import { CurrencyPicker } from "@design-system/molecules/CurrencyPicker";
import { EditableItem } from "@design-system/molecules/EditableItem";
import { MetaPill } from "@design-system/atoms/MetaPill";
import { ScanSaveConfirmScreen, type Correction } from "./ScanSaveConfirmScreen";
import { getCategoryToken } from "@lib/categoryTokens";
import { CASH, SAMPLE_CARDS } from "@lib/paymentMethods";
import { type TxnItem } from "@lib/transactionFixtures";
import {
  SAMPLE_RECEIPT,
  formatMoney,
  type ScanReceipt,
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
  /** the extraction flagged the scan for review — math gate failed / low confidence. */
  review?: { kind: "math" | "confidence" };
  onSave?: () => void;
  onCancel?: () => void;
}

const PAYMENT_METHODS = [CASH, ...SAMPLE_CARDS];
const NAME_CAP = 30;

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

export function ScanReviewScreen({ receipt: initialReceipt = SAMPLE_RECEIPT, payment: initialPayment = "falabella", review, onSave, onCancel }: ScanReviewScreenProps) {
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
          {/* needs-review banner — math gate failed / low extraction confidence */}
          {review ? (
            <div className="flex items-start gap-gt-10 rounded-gt-xl border-2 border-gt-warning bg-gt-bg-3 px-gt-12 py-gt-10">
              <PixelIcon name="status-alert" size={24} className="shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
                <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink">{review.kind === "math" ? "Los montos no cuadran" : "Revisa los datos extraídos"}</span>
                <span className="text-gt-xs font-medium text-gt-ink-2">
                  {review.kind === "math"
                    ? "La suma de los ítems no coincide con el total de la boleta. Corrígelo antes de guardar."
                    : "No pudimos leer algunos campos con seguridad. Verifica el comercio, el total y los ítems."}
                </span>
              </span>
            </div>
          ) : null}

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
                <MetaPill icon={<PixelIcon name="nav-home" size={14} />} onClick={() => setLocOpen(true)} ariaLabel="Cambiar ubicación">{receipt.location}</MetaPill>
                <MetaPill icon={<PixelIcon name="chart-calendar" size={14} />} onClick={() => setDateOpen(true)} ariaLabel="Cambiar fecha">{receipt.date}</MetaPill>
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
          <Button variant="success" size="lg" fullWidth aria-label="Guardar transacción" onClick={() => (corrections.length > 0 ? setConfirming(true) : onSave?.())}>
            <span className="text-gt-sm uppercase tracking-wide text-white/80">Total</span>
            <span className="truncate text-gt-lg">{formatMoney(total, receipt.currency)}</span>
            <PixelIcon name="scan-success" size={24} className="shrink-0" />
          </Button>
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
