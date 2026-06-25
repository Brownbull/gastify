import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { MerchantHeader } from "@design-system/molecules/MerchantHeader";
import { EditableItem } from "@design-system/molecules/EditableItem";
import { TransactionTotal } from "@design-system/molecules/TransactionTotal";
import { PaymentPicker } from "@design-system/molecules/PaymentPicker";
import { CadencePicker } from "@design-system/molecules/CadencePicker";
import { GroupedCategoryPicker } from "@design-system/molecules/GroupedCategoryPicker";
import { LocationPicker } from "@design-system/molecules/LocationPicker";
import { DatePicker } from "@design-system/molecules/DatePicker";
import { TimePicker } from "@design-system/molecules/TimePicker";
import { CurrencyPicker } from "@design-system/molecules/CurrencyPicker";
import { Modal } from "@design-system/atoms/Modal";
import { Button } from "@design-system/atoms/Button";
import type { Platform } from "@design-system/organisms/AppSurface";
import { type TxnCadence, type TxnDetail, type TxnItem } from "@lib/transactionFixtures";
import { CASH, SAMPLE_CARDS } from "@lib/paymentMethods";
import { formatMoney, type CurrencyCode } from "@lib/scanFixtures";

const PAYMENT_METHODS = [CASH, ...SAMPLE_CARDS];

/** a brand-new blank item row (no scan) — tapped open to be filled in. */
const blankItem = (): TxnItem => ({ name: "", total: 0, unitPrice: 0, units: 1, category: "Other" });

/** the empty starter — only `storeIcon` is read from it (MerchantHeader fallback). */
const BLANK_TXN: TxnDetail = {
  merchant: "",
  category: "otros",
  storeIcon: "store-minimarket",
  location: "—",
  date: "Hoy",
  time: "—",
  payment: CASH.id,
  cadence: "one-time",
  total: 0,
  groups: [],
};

export interface NewTransactionScreenProps {
  /** dismiss the form (the header X / a confirmed discard). */
  onCancel?: () => void;
  /** confirmed create — the host saves the transaction + closes the form. */
  onCreate?: () => void;
  platform?: Platform;
}

/**
 * NewTransactionScreen — manual transaction entry (no scan), the `+ Agregar`
 * path. Reuses the detail's edit-in-place pieces from a blank start: tap the
 * MerchantHeader fields to fill merchant/category/payment/cadence/location/date/
 * time/currency, add items one-by-one (each opens in edit mode), and the footer
 * folds the live total into a "Crear" CTA. Items are optional — a total-only
 * transaction is valid.
 */
export function NewTransactionScreen({ onCancel, onCreate, platform = "mobile" }: NewTransactionScreenProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("otros");
  const [cadence, setCadence] = useState<TxnCadence>("one-time");
  const [payment, setPayment] = useState(CASH.id);
  const [location, setLocation] = useState("—");
  const [date, setDate] = useState("Hoy");
  const [time, setTime] = useState("—");
  const [currency, setCurrency] = useState<CurrencyCode>("CLP");
  const [methods, setMethods] = useState(PAYMENT_METHODS);

  // pickers / modals
  const [cadenceOpen, setCadenceOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [curOpen, setCurOpen] = useState(false);

  // flat items (manual entry is one-by-one — no familia grouping).
  const [items, setItems] = useState<TxnItem[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editSnapshot, setEditSnapshot] = useState<TxnItem | null>(null);
  const [itemCatIdx, setItemCatIdx] = useState<number | null>(null);

  const setItem = (i: number, patch: Partial<TxnItem>) => setItems((prev) => prev.map((it, x) => (x === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => { setItems((prev) => prev.filter((_, x) => x !== i)); setEditIdx(null); setEditSnapshot(null); };
  const addItem = () => {
    setItems((prev) => { setEditIdx(prev.length); return [...prev, blankItem()]; });
    setEditSnapshot(blankItem());
  };
  const enterEdit = (i: number) => { setEditIdx(i); setEditSnapshot({ ...items[i] }); };
  const commitEdit = () => { setEditIdx(null); setEditSnapshot(null); };
  const cancelEdit = () => {
    if (editIdx != null) {
      const it = items[editIdx];
      // discard an untouched new row; otherwise restore the snapshot.
      if (it && it.name.trim() === "" && it.unitPrice === 0) setItems((prev) => prev.filter((_, x) => x !== editIdx));
      else if (editSnapshot) setItem(editIdx, editSnapshot);
    }
    setEditIdx(null);
    setEditSnapshot(null);
  };

  const itemCount = items.length;
  const total = items.reduce((s, it) => s + it.unitPrice * it.units, 0);
  const fmt = (n: number) => formatMoney(n, currency);
  const itemCatTarget = itemCatIdx != null ? items[itemCatIdx] : null;
  const contentMax = platform === "desktop" ? "44rem" : undefined;
  // anything entered? a dirty form confirms before discarding; an empty one just closes.
  const dirty = merchant.trim() !== "" || items.length > 0 || category !== "otros" || location !== "—" || payment !== CASH.id;
  const requestCancel = () => (dirty ? setConfirmCancel(true) : onCancel?.());

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Nueva transacción" onClose={requestCancel} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-12" style={{ maxWidth: contentMax }}>
          <MerchantHeader
            txn={BLANK_TXN}
            merchantValue={merchant}
            onMerchantChange={setMerchant}
            merchantPlaceholder="Nombre del comercio"
            categoryId={category}
            onCategoryClick={() => setCatOpen(true)}
            paymentId={payment}
            onPaymentClick={() => setPayOpen(true)}
            cadenceId={cadence}
            onCadenceClick={() => setCadenceOpen(true)}
            location={location}
            onLocationClick={() => setLocOpen(true)}
            date={date}
            onDateClick={() => setDateOpen(true)}
            time={time}
            onTimeClick={() => setTimeOpen(true)}
            currencyValue={currency}
            onCurrencyClick={() => setCurOpen(true)}
          />

          <section className="flex flex-col gap-gt-8">
            <div className="flex items-baseline justify-between px-gt-4">
              <p className="font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Ítems</p>
              {itemCount > 0 ? <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink-2">{itemCount} · {fmt(total)}</span> : null}
            </div>

            {items.length === 0 ? (
              <p className="rounded-gt-2xl border-2 border-gt-line bg-gt-surface px-gt-12 py-gt-12 text-center text-gt-sm font-medium text-gt-ink-3">
                Agrega los productos de tu compra. Es opcional — también puedes guardar solo el total.
              </p>
            ) : (
              <div className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
                <ul className="divide-y-2 divide-gt-line">
                  {items.map((item, i) => (
                    <EditableItem
                      key={i}
                      item={item}
                      currency={currency}
                      editing={editIdx === i}
                      onEnterEdit={() => enterEdit(i)}
                      onCommit={commitEdit}
                      onCancelEdit={cancelEdit}
                      onChange={(patch) => setItem(i, patch)}
                      onDelete={() => removeItem(i)}
                      onPickCategory={() => setItemCatIdx(i)}
                    />
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={addItem}
              className="flex w-full items-center justify-center gap-gt-6 rounded-gt-xl bg-gt-surface px-gt-12 py-gt-10 font-gt-display text-gt-sm font-extrabold text-gt-primary transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:bg-gt-primary-soft"
              style={{ border: "2px dashed var(--color-gt-line-strong)" }}
            >
              <span className="text-gt-lg leading-none">+</span> Agregar ítem
            </button>
          </section>
        </div>
      </div>

      {/* sticky footer: live total folded into the Crear CTA (no delete on a new entry) */}
      <div className="shrink-0 border-t-2 border-gt-line bg-gt-surface px-gt-16 py-gt-12">
        <div className="mx-auto w-full" style={{ maxWidth: contentMax }}>
          <TransactionTotal total={total} itemCount={itemCount} onSave={onCreate} saveLabel="Crear" format={fmt} />
        </div>
      </div>

      <CadencePicker open={cadenceOpen} value={cadence} onClose={() => setCadenceOpen(false)} onPick={setCadence} />
      <PaymentPicker
        open={payOpen}
        onClose={() => setPayOpen(false)}
        methods={methods}
        selectedId={payment}
        onSelect={setPayment}
        onAddCard={(card) => setMethods((m) => [...m, card])}
      />
      <GroupedCategoryPicker open={catOpen} onClose={() => setCatOpen(false)} mode="establishment" selectedId={category} onSelect={setCategory} />
      <GroupedCategoryPicker
        open={itemCatIdx != null}
        onClose={() => setItemCatIdx(null)}
        mode="item"
        selectedId={itemCatTarget?.category ?? ""}
        onSelect={(id) => { if (itemCatIdx != null) setItem(itemCatIdx, { category: id }); }}
      />
      <LocationPicker open={locOpen} onClose={() => setLocOpen(false)} selectedCity={location} onSelect={setLocation} />
      <DatePicker open={dateOpen} onClose={() => setDateOpen(false)} value={date} onSelect={setDate} />
      <TimePicker open={timeOpen} onClose={() => setTimeOpen(false)} value={time} onSelect={setTime} />
      <CurrencyPicker open={curOpen} onClose={() => setCurOpen(false)} selected={currency} onSelect={setCurrency} />

      {/* discard-confirm — guards an accidental cancel once the form is dirty */}
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="¿Descartar transacción?"
        footer={
          <div className="flex justify-end gap-gt-8">
            <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>Seguir editando</Button>
            <Button variant="danger" size="sm" onClick={() => { setConfirmCancel(false); onCancel?.(); }}>Descartar</Button>
          </div>
        }
      >
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">
          Perderás los datos que ingresaste. Esta transacción no se guardará.
        </p>
      </Modal>
    </div>
  );
}
