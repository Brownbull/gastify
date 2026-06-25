import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Modal } from "@design-system/atoms/Modal";
import { AddCardForm } from "./AddCardForm";
import { CASH, MAX_CARDS, type PaymentMethod } from "@lib/paymentMethods";

/**
 * PaymentPicker — the payment-method popup (DM-10). Lists Efectivo + the user's
 * cards as selectable rows, plus "Agregar tarjeta" (when under MAX_CARDS) which
 * opens the AddCardForm. Selecting a row commits and closes.
 *
 * Stateful over its card list so the add-card flow is fully interactive in the
 * mockup; the real app would lift this to a store.
 */
export interface PaymentPickerProps {
  open: boolean;
  onClose: () => void;
  /** the available methods (cash first, then cards). */
  methods: PaymentMethod[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** called when a new card is added (so the parent can persist it). */
  onAddCard?: (card: PaymentMethod) => void;
}

function MethodRow({ method, selected, onClick }: { method: PaymentMethod; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-gt-12 rounded-gt-xl border-2 px-gt-12 py-gt-10 text-left transition duration-150 ease-gt-bounce ${
        selected ? "border-gt-line-strong bg-gt-primary-soft shadow-gt-xs" : "border-gt-line bg-gt-surface hover:bg-gt-bg-3"
      }`}
    >
      {/* bare icon — no container, no background tint */}
      <PixelIcon name={method.icon ?? (method.kind === "cash" ? "fin-coin" : "fin-credit-card")} size={32} className="shrink-0" />

      <span className="min-w-0 flex-1 truncate text-gt-md font-extrabold text-gt-ink">{method.label}</span>
      {selected ? <PixelIcon name="scan-success" size={22} /> : null}
    </button>
  );
}

export function PaymentPicker({ open, onClose, methods, selectedId, onSelect, onAddCard }: PaymentPickerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const cardCount = methods.filter((m) => m.kind === "card").length;

  const choose = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Método de pago">
        <div className="flex flex-col gap-gt-8">
          {methods.map((m) => (
            <MethodRow key={m.id} method={m} selected={m.id === selectedId} onClick={() => choose(m.id)} />
          ))}
          {cardCount < MAX_CARDS ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-dashed border-gt-line-strong px-gt-12 py-gt-10 text-gt-md font-extrabold text-gt-primary transition duration-150 ease-gt-bounce hover:bg-gt-primary-soft"
            >
              <PixelIcon name="action-add" size={18} /> Agregar tarjeta
            </button>
          ) : (
            <p className="px-gt-4 text-gt-sm font-bold text-gt-ink-3">Máximo {MAX_CARDS} tarjetas.</p>
          )}
        </div>
      </Modal>
      <AddCardForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(card) => {
          onAddCard?.(card);
          onSelect(card.id);
        }}
      />
    </>
  );
}

/** Convenience: PaymentPicker preseeded with the sample methods + local add state. */
export { CASH };
