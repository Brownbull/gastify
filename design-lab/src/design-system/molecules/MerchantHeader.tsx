import { PixelIcon } from "@design-system/assets/PixelIcon";
import { MapPinIcon } from "@design-system/assets/icons";
import { CategoryChip } from "./CategoryChip";
import { PaymentChip } from "./PaymentChip";
import { ThumbnailBadge } from "./ThumbnailBadge";
import type { TxnDetail } from "@lib/transactionFixtures";

/**
 * MerchantHeader — the transaction-detail header block (compact variant, the
 * picked "B" treatment): ThumbnailBadge (store icon + category overlay),
 * merchant name + edit affordance, CategoryChip + PaymentChip on one line, and
 * an inline location · date · time metadata line.
 *
 * Built on ThumbnailBadge + CategoryChip + PaymentChip. Header variations live
 * in the MerchantHeader spike; this is the settled compact form.
 */
export interface MerchantHeaderProps {
  txn: TxnDetail;
  onEdit?: () => void;
  /** tap the payment chip — opens the PaymentPicker (parent-owned). */
  onPaymentClick?: () => void;
  /** override the displayed payment method id (defaults to txn.payment). */
  paymentId?: string;
  className?: string;
}

export function MerchantHeader({ txn, onEdit, onPaymentClick, paymentId, className = "" }: MerchantHeaderProps) {
  return (
    <div className={`flex items-center gap-gt-12 border-b-2 border-gt-line pb-gt-12 ${className}`}>
      <ThumbnailBadge icon={txn.storeIcon} category={txn.category} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-gt-6">
        <div className="flex items-center gap-gt-6">
          <h2 className="min-w-0 truncate text-gt-lg font-extrabold text-gt-ink">{txn.merchant}</h2>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Editar"
              className="shrink-0 rounded-gt-md p-gt-2 opacity-40 transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/20"
            >
              <PixelIcon name="action-edit" size={18} />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-gt-6">
          <CategoryChip category={txn.category} size="sm" />
          <PaymentChip method={paymentId ?? txn.payment} size="sm" onClick={onPaymentClick} />
        </div>
        <div className="flex items-center gap-gt-4 text-gt-xs font-bold text-gt-ink-3">
          <MapPinIcon className="h-3 w-3" />
          <span className="truncate">{txn.location}</span>
          <span className="text-gt-line-strong">·</span>
          <PixelIcon name="chart-calendar" size={14} />
          <span>{txn.date}</span>
          <span className="text-gt-line-strong">·</span>
          <span>{txn.time}</span>
        </div>
      </div>
    </div>
  );
}
