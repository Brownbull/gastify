import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { MerchantHeader } from "@design-system/molecules/MerchantHeader";
import { ItemGroup } from "@design-system/molecules/ItemGroup";
import { EditableItem } from "@design-system/molecules/EditableItem";
import { TransactionTotal } from "@design-system/molecules/TransactionTotal";
import { PaymentPicker } from "@design-system/molecules/PaymentPicker";
import { CadencePicker } from "@design-system/molecules/CadencePicker";
import { GroupedCategoryPicker } from "@design-system/molecules/GroupedCategoryPicker";
import { LocationPicker } from "@design-system/molecules/LocationPicker";
import { DatePicker } from "@design-system/molecules/DatePicker";
import { TimePicker } from "@design-system/molecules/TimePicker";
import { CurrencyPicker } from "@design-system/molecules/CurrencyPicker";
import { SegmentedToggle } from "@design-system/atoms/SegmentedToggle";
import { Modal } from "@design-system/atoms/Modal";
import { Button } from "@design-system/atoms/Button";
import type { Platform } from "@design-system/organisms/AppSurface";
import { sampleTxn, type TxnCadence, type TxnDetail, type TxnItem } from "@lib/transactionFixtures";
import { CASH, SAMPLE_CARDS } from "@lib/paymentMethods";
import { formatMoney, type CurrencyCode } from "@lib/scanFixtures";

/**
 * TransactionDetail (Phase 9) — a SAVED boleta, reached by tapping a transaction
 * in PurchasesScreen. Full-surface (rides AppScaffold's overlay slot) with a
 * `detail` back header. Fields are edited in place by tapping them (no edit
 * pencil) — the payment and cadence chips open their pickers; a danger delete
 * button (left of the save CTA) confirms before removing the transaction.
 *
 *   header → MerchantHeader (merchant · category/payment/cadence/location/date/
 *            time/currency — all tap-to-edit)
 *   body   → one ItemGroup per L3 familia of EditableItems (tap an item to edit
 *            its name/category/qty/price; total is derived live)
 *   footer → TransactionTotal (delete button + total folded into the save CTA)
 */
export interface TransactionDetailProps {
  txn?: TxnDetail;
  onBack?: () => void;
  onSave?: () => void;
  /** confirmed deletion — the host removes the transaction + closes the detail. */
  onDelete?: () => void;
  platform?: Platform;
}

const PAYMENT_METHODS = [CASH, ...SAMPLE_CARDS];

export function TransactionDetail({ txn = sampleTxn, onBack, onSave, onDelete, platform = "mobile" }: TransactionDetailProps) {
  // editable transaction-level fields (tap to edit, like the scan review).
  const [merchant, setMerchant] = useState<string>(txn.merchant);
  const [category, setCategory] = useState<string>(txn.category);
  const [cadence, setCadence] = useState<TxnCadence>(txn.cadence);
  const [payment, setPayment] = useState<string>(txn.payment);
  const [location, setLocation] = useState<string>(txn.location);
  const [date, setDate] = useState<string>(txn.date);
  const [time, setTime] = useState<string>(txn.time);
  const [currency, setCurrency] = useState<CurrencyCode>("CLP");
  const [methods, setMethods] = useState(PAYMENT_METHODS);

  // which picker / modal is open
  const [cadenceOpen, setCadenceOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [curOpen, setCurOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // editable items (per familia group). editKey = `${groupIdx}-${itemIdx}`.
  const [groups, setGroups] = useState(txn.groups);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editSnapshot, setEditSnapshot] = useState<TxnItem | null>(null);
  const [itemCatKey, setItemCatKey] = useState<string | null>(null);
  // item view: "group" = by L3 familia · "original" = receipt order (as scanned)
  const [view, setView] = useState<"group" | "original">("group");

  const setItem = (gi: number, ii: number, patch: Partial<TxnItem>) =>
    setGroups((prev) => prev.map((g, x) => (x === gi ? { ...g, items: g.items.map((it, y) => (y === ii ? { ...it, ...patch } : it)) } : g)));
  const deleteItem = (gi: number, ii: number) => {
    setGroups((prev) => prev.map((g, x) => (x === gi ? { ...g, items: g.items.filter((_, y) => y !== ii) } : g)));
    setEditKey(null);
    setEditSnapshot(null);
  };
  const enterEdit = (gi: number, ii: number) => { setEditKey(`${gi}-${ii}`); setEditSnapshot({ ...groups[gi].items[ii] }); };
  const commitEdit = () => { setEditKey(null); setEditSnapshot(null); };
  const cancelEdit = () => {
    if (editKey && editSnapshot) { const [gi, ii] = editKey.split("-").map(Number); setItem(gi, ii, editSnapshot); }
    setEditKey(null);
    setEditSnapshot(null);
  };
  const itemCatTarget = itemCatKey ? groups[Number(itemCatKey.split("-")[0])]?.items[Number(itemCatKey.split("-")[1])] : null;

  // total + count are derived from the (edited) items so the footer stays live.
  const itemCount = groups.reduce((n, g) => n + g.items.length, 0);
  const total = groups.reduce((s, g) => s + g.items.reduce((t, it) => t + it.unitPrice * it.units, 0), 0);
  // all amounts on this screen follow the chosen currency.
  const fmt = (n: number) => formatMoney(n, currency);
  // flat receipt-order list (the "Original" view) — items as they came on the image.
  const flatItems = groups.flatMap((g, gi) => g.items.map((item, ii) => ({ gi, ii, item })));
  // one EditableItem wired to its (groupIdx, itemIdx) — reused by both views.
  const renderItem = (gi: number, ii: number, item: TxnItem) => {
    const key = `${gi}-${ii}`;
    return (
      <EditableItem
        key={key}
        item={item}
        currency={currency}
        editing={editKey === key}
        onEnterEdit={() => enterEdit(gi, ii)}
        onCommit={commitEdit}
        onCancelEdit={cancelEdit}
        onChange={(patch) => setItem(gi, ii, patch)}
        onDelete={() => deleteItem(gi, ii)}
        onPickCategory={() => setItemCatKey(key)}
      />
    );
  };
  // desktop: cap + center the single column (it never fills the wide pane).
  const contentMax = platform === "desktop" ? "44rem" : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Boleta" onBack={onBack} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-12" style={{ maxWidth: contentMax }}>
          <MerchantHeader
            txn={txn}
            merchantValue={merchant}
            onMerchantChange={setMerchant}
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

          {/* view toggle — Original (receipt order, as the image) vs Por grupo (L3 familia) */}
          <SegmentedToggle
            fill
            flush
            segments={[{ id: "group", label: "Por grupo" }, { id: "original", label: "Original" }]}
            value={view}
            onChange={(v) => setView(v as "group" | "original")}
          />

          {view === "group" ? (
            <div className="flex flex-col gap-gt-12">
              {groups.map((group, gi) => {
                if (group.items.length === 0) return null;
                const subtotal = group.items.reduce((sum, it) => sum + it.unitPrice * it.units, 0);
                return (
                  <ItemGroup key={group.familia} familia={group.familia} total={subtotal} count={group.items.length} format={fmt}>
                    {group.items.map((item, ii) => renderItem(gi, ii, item))}
                  </ItemGroup>
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
              <ul className="divide-y-2 divide-gt-line">
                {flatItems.map(({ gi, ii, item }) => renderItem(gi, ii, item))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* sticky footer: delete + the total folded into the save CTA */}
      <div className="shrink-0 border-t-2 border-gt-line bg-gt-surface px-gt-16 py-gt-12">
        <div className="mx-auto w-full" style={{ maxWidth: contentMax }}>
          <TransactionTotal total={total} itemCount={itemCount} onSave={onSave} onDelete={() => setConfirmDelete(true)} saveLabel="Guardar" format={fmt} />
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
        open={itemCatKey != null}
        onClose={() => setItemCatKey(null)}
        mode="item"
        selectedId={itemCatTarget?.category ?? ""}
        onSelect={(id) => { if (itemCatKey) { const [gi, ii] = itemCatKey.split("-").map(Number); setItem(gi, ii, { category: id }); } }}
      />
      <LocationPicker open={locOpen} onClose={() => setLocOpen(false)} selectedCity={location} onSelect={setLocation} />
      <DatePicker open={dateOpen} onClose={() => setDateOpen(false)} value={date} onSelect={setDate} />
      <TimePicker open={timeOpen} onClose={() => setTimeOpen(false)} value={time} onSelect={setTime} />
      <CurrencyPicker open={curOpen} onClose={() => setCurOpen(false)} selected={currency} onSelect={setCurrency} />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Eliminar transacción?"
        footer={
          <div className="flex justify-end gap-gt-8">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={() => { setConfirmDelete(false); onDelete?.(); }}>Eliminar</Button>
          </div>
        }
      >
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">
          Esta transacción se eliminará de forma permanente. Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
