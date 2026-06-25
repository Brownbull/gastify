import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { PaymentChip } from "./PaymentChip";
import { clp } from "@lib/transactionFixtures";

/**
 * TransactionTotal — the detail footer (DM-9 pick C: "amount on CTA"). An
 * optional "Pagado con" payment row, then the total folded INTO the save
 * button (label left, amount right). Built on PaymentChip + Button.
 *
 * Tapping the payment chip opens the picker (parent-owned via onPaymentClick).
 * `payment` undefined hides the payment row (it lives only in the header).
 * `onDelete` (for already-saved transactions) renders a danger delete icon
 * button immediately to the LEFT of the save CTA.
 */
export interface TransactionTotalProps {
  total: number;
  itemCount: number;
  /** payment-method id; when set, renders the "Pagado con" row. */
  payment?: string;
  onPaymentClick?: () => void;
  onSave?: () => void;
  /** when set, a danger delete-icon button sits left of the save CTA. */
  onDelete?: () => void;
  saveLabel?: string;
  /** amount formatter for the total (defaults to CLP). */
  format?: (n: number) => string;
  className?: string;
}

export function TransactionTotal({
  total,
  itemCount,
  payment,
  onPaymentClick,
  onSave,
  onDelete,
  saveLabel = "Guardar",
  format = clp,
  className = "",
}: TransactionTotalProps) {
  return (
    <div className={`flex flex-col gap-gt-12 ${className}`}>
      {payment ? (
        <div className="flex items-center justify-between gap-gt-8 px-gt-4">
          <span className="text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">
            Pagado con · {itemCount} items
          </span>
          <PaymentChip method={payment} onClick={onPaymentClick} />
        </div>
      ) : null}
      <div className={`grid items-stretch gap-gt-8 ${onDelete ? "grid-cols-[3fr_7fr]" : "grid-cols-1"}`}>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Eliminar transacción"
            className="grid place-items-center rounded-gt-xl border-2 border-gt-line-strong bg-gt-negative-bg py-gt-10 text-gt-negative shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md active:translate-y-0 active:shadow-gt-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30"
          >
            <PixelIcon name="action-delete" size={34} />
          </button>
        ) : null}
        <Button variant="primary" onClick={onSave} className="justify-between bg-gt-positive-bg! px-gt-16 text-gt-ink!">
          <span className="flex items-center gap-gt-8">
            <PixelIcon name="scan-success" size={24} /> {saveLabel}
          </span>
          <span className="font-gt-display text-gt-xl">{format(total)}</span>
        </Button>
      </div>
    </div>
  );
}
