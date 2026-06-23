import { PixelIcon } from "@design-system/assets/PixelIcon";
import { MapPinIcon } from "@design-system/assets/icons";
import { CategoryChip } from "./CategoryChip";
import { PaymentChip } from "./PaymentChip";
import { ThumbnailBadge } from "./ThumbnailBadge";
import { CADENCE_LABEL, type TxnCadence, type TxnDetail } from "@lib/transactionFixtures";

/**
 * MerchantHeader — the transaction-detail header block (compact variant, the
 * picked "B" treatment): ThumbnailBadge (store icon + category overlay), the
 * merchant name, a chip row (category · payment · cadence) and an inline
 * location · date · time line.
 *
 * No explicit edit affordance — fields are edited by tapping them (the payment
 * and cadence chips open their pickers; the merchant/category are tap-to-edit).
 */
export interface MerchantHeaderProps {
  txn: TxnDetail;
  /** tap the payment chip — opens the PaymentPicker (parent-owned). */
  onPaymentClick?: () => void;
  /** override the displayed payment method id (defaults to txn.payment). */
  paymentId?: string;
  /** tap the cadence chip — opens the cadence picker (parent-owned). */
  onCadenceClick?: () => void;
  /** override the displayed cadence (defaults to txn.cadence). */
  cadenceId?: TxnCadence;
  className?: string;
}

/** Recurrence chip — calendar (one-time) or sync (recurring) + label; tappable. */
function CadenceChip({ cadence, onClick }: { cadence: TxnCadence; onClick?: () => void }) {
  const recurring = cadence !== "one-time";
  const base = `inline-flex items-center gap-gt-6 overflow-hidden rounded-gt-pill border-2 border-gt-line-strong px-gt-10 py-gt-0 text-gt-xs font-extrabold leading-none text-gt-ink ${recurring ? "bg-gt-primary-soft" : "bg-gt-bg-3"}`;
  const content = (
    <>
      <PixelIcon name={recurring ? "status-sync" : "chart-calendar"} size={22} />
      <span className="truncate">{CADENCE_LABEL[cadence]}</span>
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Cadencia: ${CADENCE_LABEL[cadence]}. Cambiar.`}
      className={`${base} transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25`}
    >
      {content}
    </button>
  ) : (
    <span className={base}>{content}</span>
  );
}

export function MerchantHeader({ txn, onPaymentClick, paymentId, onCadenceClick, cadenceId, className = "" }: MerchantHeaderProps) {
  return (
    <div className={`flex items-center gap-gt-12 border-b-2 border-gt-line pb-gt-12 ${className}`}>
      <ThumbnailBadge icon={txn.storeIcon} category={txn.category} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-gt-6">
        <h2 className="min-w-0 truncate text-gt-lg font-extrabold text-gt-ink">{txn.merchant}</h2>
        <div className="flex flex-wrap items-center gap-gt-6">
          <CategoryChip category={txn.category} size="sm" />
          <PaymentChip method={paymentId ?? txn.payment} size="sm" onClick={onPaymentClick} />
          <CadenceChip cadence={cadenceId ?? txn.cadence} onClick={onCadenceClick} />
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
