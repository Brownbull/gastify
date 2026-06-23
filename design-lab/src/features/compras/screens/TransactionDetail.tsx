import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { MerchantHeader } from "@design-system/molecules/MerchantHeader";
import { ItemGroup } from "@design-system/molecules/ItemGroup";
import { ItemRow } from "@design-system/molecules/ItemRow";
import { TransactionTotal } from "@design-system/molecules/TransactionTotal";
import { PaymentPicker } from "@design-system/molecules/PaymentPicker";
import { Modal } from "@design-system/atoms/Modal";
import { Button } from "@design-system/atoms/Button";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import type { Platform } from "@design-system/organisms/AppSurface";
import { CADENCE_LABEL, CADENCE_ORDER, sampleTxn, type TxnCadence, type TxnDetail } from "@lib/transactionFixtures";
import { CASH, SAMPLE_CARDS } from "@lib/paymentMethods";

/**
 * TransactionDetail (Phase 9) — a SAVED boleta, reached by tapping a transaction
 * in ComprasScreen. Full-surface (rides AppScaffold's overlay slot) with a
 * `detail` back header. Fields are edited in place by tapping them (no edit
 * pencil) — the payment and cadence chips open their pickers; a danger delete
 * button (left of the save CTA) confirms before removing the transaction.
 *
 *   header → MerchantHeader (thumbnail · merchant · category/payment/cadence)
 *   body   → one ItemGroup per L3 familia, each holding its ItemRows (L4)
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

/** Cadence picker — same row grammar as PaymentPicker's MethodRow. */
function CadencePicker({ open, value, onPick, onClose }: { open: boolean; value: TxnCadence; onPick: (c: TxnCadence) => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Cadencia">
      <div className="flex flex-col gap-gt-8">
        {CADENCE_ORDER.map((c) => {
          const active = c === value;
          return (
            <button
              key={c}
              type="button"
              onClick={() => { onPick(c); onClose(); }}
              aria-pressed={active}
              className={`flex w-full items-center gap-gt-12 rounded-gt-xl border-2 px-gt-12 py-gt-10 text-left transition duration-150 ease-gt-bounce ${
                active ? "border-gt-line-strong bg-gt-primary-soft shadow-gt-xs" : "border-gt-line bg-gt-surface hover:bg-gt-bg-3"
              }`}
            >
              <PixelIcon name={c === "one-time" ? "chart-calendar" : "status-sync"} size={32} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-gt-md font-extrabold text-gt-ink">{CADENCE_LABEL[c]}</span>
              {active ? <PixelIcon name="scan-success" size={22} /> : null}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function TransactionDetail({ txn = sampleTxn, onBack, onSave, onDelete, platform = "mobile" }: TransactionDetailProps) {
  const [cadence, setCadence] = useState<TxnCadence>(txn.cadence);
  const [cadenceOpen, setCadenceOpen] = useState(false);
  const [payment, setPayment] = useState<string>(txn.payment);
  const [methods, setMethods] = useState(PAYMENT_METHODS);
  const [payOpen, setPayOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const itemCount = txn.groups.reduce((n, g) => n + g.items.length, 0);
  // desktop: cap + center the single column (it never fills the wide pane).
  const contentMax = platform === "desktop" ? "44rem" : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Boleta" onBack={onBack} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-12" style={{ maxWidth: contentMax }}>
          <MerchantHeader
            txn={txn}
            paymentId={payment}
            onPaymentClick={() => setPayOpen(true)}
            cadenceId={cadence}
            onCadenceClick={() => setCadenceOpen(true)}
          />

          <div className="flex flex-col gap-gt-12">
            {txn.groups.map((group) => {
              const subtotal = group.items.reduce((sum, it) => sum + it.total, 0);
              return (
                <ItemGroup key={group.familia} familia={group.familia} total={subtotal} count={group.items.length}>
                  {group.items.map((item, i) => (
                    <ItemRow key={`${group.familia}-${i}`} item={item} />
                  ))}
                </ItemGroup>
              );
            })}
          </div>
        </div>
      </div>

      {/* sticky footer: delete + the total folded into the save CTA */}
      <div className="shrink-0 border-t-2 border-gt-line bg-gt-surface px-gt-16 py-gt-12">
        <div className="mx-auto w-full" style={{ maxWidth: contentMax }}>
          <TransactionTotal total={txn.total} itemCount={itemCount} onSave={onSave} onDelete={() => setConfirmDelete(true)} saveLabel="Guardar cambios" />
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
