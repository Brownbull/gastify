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
 */
export interface TransactionTotalProps {
  total: number;
  itemCount: number;
  /** payment-method id; when set, renders the "Pagado con" row. */
  payment?: string;
  onPaymentClick?: () => void;
  onSave?: () => void;
  saveLabel?: string;
  className?: string;
}

export function TransactionTotal({
  total,
  itemCount,
  payment,
  onPaymentClick,
  onSave,
  saveLabel = "Guardar",
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
      <Button variant="primary" fullWidth onClick={onSave} className="justify-between bg-gt-success px-gt-16 text-gt-ink!">
        <span className="flex items-center gap-gt-8">
          <PixelIcon name="scan-success" size={18} /> {saveLabel}
        </span>
        <span className="font-gt-display text-gt-xl">{clp(total)}</span>
      </Button>
    </div>
  );
}
