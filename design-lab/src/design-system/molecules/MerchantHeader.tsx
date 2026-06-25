import { PixelIcon } from "@design-system/assets/PixelIcon";
import { MapPinIcon } from "@design-system/assets/icons";
import { MetaPill } from "@design-system/atoms/MetaPill";
import { CategoryChip } from "./CategoryChip";
import { PaymentChip } from "./PaymentChip";
import { ThumbnailBadge } from "./ThumbnailBadge";
import { InlineText } from "./InlineText";
import { CADENCE_LABEL, type TxnCadence, type TxnDetail } from "@lib/transactionFixtures";

/**
 * MerchantHeader — the transaction-detail header block: ThumbnailBadge (store
 * icon + category overlay), the merchant name, a chip row (category · payment ·
 * cadence) and a meta line (location · date · time).
 *
 * Progressive edit-in-place (no edit pencil): when an `on*` handler / `*Change`
 * is passed, that field becomes tappable to edit (merchant → inline text;
 * category/payment/cadence → their pickers; location/date/time → MetaPills that
 * open their pickers). Without handlers it renders display-only.
 */
const NAME_CAP = 30;

export interface MerchantHeaderProps {
  txn: TxnDetail;
  /** merchant name override + inline-edit handler (defaults to txn.merchant). */
  merchantValue?: string;
  onMerchantChange?: (v: string) => void;
  /** muted hint when the merchant name is empty (manual entry). */
  merchantPlaceholder?: string;
  /** category id override + tap handler (defaults to txn.category). */
  categoryId?: string;
  onCategoryClick?: () => void;
  /** payment-method id override + tap handler (defaults to txn.payment). */
  paymentId?: string;
  onPaymentClick?: () => void;
  /** cadence override + tap handler (defaults to txn.cadence). */
  cadenceId?: TxnCadence;
  onCadenceClick?: () => void;
  /** meta overrides + tap handlers (default to txn.*). */
  location?: string;
  onLocationClick?: () => void;
  date?: string;
  onDateClick?: () => void;
  time?: string;
  onTimeClick?: () => void;
  /** currency code override + tap handler (defaults to "CLP"). */
  currencyValue?: string;
  onCurrencyClick?: () => void;
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

export function MerchantHeader({
  txn,
  merchantValue,
  onMerchantChange,
  merchantPlaceholder,
  categoryId,
  onCategoryClick,
  paymentId,
  onPaymentClick,
  cadenceId,
  onCadenceClick,
  location,
  onLocationClick,
  date,
  onDateClick,
  time,
  onTimeClick,
  currencyValue,
  onCurrencyClick,
  className = "",
}: MerchantHeaderProps) {
  const merchant = merchantValue ?? txn.merchant;
  const category = categoryId ?? txn.category;
  const loc = location ?? txn.location;
  const day = date ?? txn.date;
  const hour = time ?? txn.time;
  const currency = currencyValue ?? "CLP";

  return (
    <div className={`flex items-center gap-gt-12 border-b-2 border-gt-line pb-gt-12 ${className}`}>
      <ThumbnailBadge icon={txn.storeIcon} category={category} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-gt-6">
        {onMerchantChange ? (
          <InlineText value={merchant} onChange={(v) => onMerchantChange(v.slice(0, NAME_CAP))} cap={NAME_CAP} placeholder={merchantPlaceholder} ariaLabel="Nombre del comercio" className="min-w-0 truncate text-gt-lg font-extrabold text-gt-ink" />
        ) : (
          <h2 className="min-w-0 truncate text-gt-lg font-extrabold text-gt-ink">{merchant}</h2>
        )}

        {/* row 1 — category · payment */}
        <div className="flex flex-wrap items-center gap-gt-6">
          {onCategoryClick ? (
            <button type="button" aria-label="Cambiar categoría" onClick={onCategoryClick} className="rounded-gt-pill transition duration-150 ease-gt-bounce hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25">
              <CategoryChip category={category} size="sm" />
            </button>
          ) : (
            <CategoryChip category={category} size="sm" />
          )}
          <PaymentChip method={paymentId ?? txn.payment} size="sm" onClick={onPaymentClick} />
        </div>

        {/* row 2 — cadence · location */}
        <div className="flex flex-wrap items-center gap-gt-6">
          <CadenceChip cadence={cadenceId ?? txn.cadence} onClick={onCadenceClick} />
          <MetaPill icon={<MapPinIcon className="h-3 w-3" />} onClick={onLocationClick} ariaLabel="Cambiar ubicación">{loc}</MetaPill>
        </div>

        {/* row 3 — date · time · currency */}
        <div className="flex flex-wrap items-center gap-gt-6">
          <MetaPill icon={<PixelIcon name="chart-calendar" size={14} />} onClick={onDateClick} ariaLabel="Cambiar fecha">{day}</MetaPill>
          <MetaPill onClick={onTimeClick} ariaLabel="Cambiar hora">{hour}</MetaPill>
          <MetaPill onClick={onCurrencyClick} ariaLabel="Cambiar moneda">{currency}</MetaPill>
        </div>
      </div>
    </div>
  );
}
