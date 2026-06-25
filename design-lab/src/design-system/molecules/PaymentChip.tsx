import { PixelIcon } from "@design-system/assets/PixelIcon";
import { getPaymentMethod, softBgFor, type PaymentMethod } from "@lib/paymentMethods";

/**
 * PaymentChip — the relational payment indicator (DM-8, revised DM-12). The
 * chip's BACKGROUND is the method's color softened to a ~15% tint (cash =
 * white); on top sit only the method's pixel icon + its name (no color swatch
 * circle). No card data is ever stored — just label, icon, and the (softened-
 * at-render) accent hue.
 *
 * Geometric grammar: pill, 2px ink border, extrabold, dark ink text. Pass
 * `onClick` to make it a button (taps open the payment picker).
 */
export type PaymentChipSize = "sm" | "md";

export interface PaymentChipProps {
  /** payment-method id or a resolved method. */
  method: string | PaymentMethod;
  size?: PaymentChipSize;
  onClick?: () => void;
  className?: string;
}

const sizeClasses: Record<PaymentChipSize, { chip: string; icon: number }> = {
  // DM-17e: bigger icon, reduced vertical padding → same pill height.
  sm: { chip: "gap-gt-6 px-gt-10 py-gt-0 text-gt-xs", icon: 22 },
  md: { chip: "gap-gt-8 px-gt-12 py-gt-2 text-gt-sm", icon: 26 },
};

export function PaymentChip({ method, size = "md", onClick, className = "" }: PaymentChipProps) {
  const m = typeof method === "string" ? getPaymentMethod(method) : method;
  const s = sizeClasses[size];
  const base = `inline-flex items-center overflow-hidden rounded-gt-pill border-2 border-gt-line-strong font-extrabold leading-none text-gt-ink ${s.chip} ${className}`;
  const style = { backgroundColor: softBgFor(m) };

  const content = (
    <>
      <PixelIcon name={m.icon ?? (m.kind === "cash" ? "fin-coin" : "fin-credit-card")} size={s.icon} />
      <span className="truncate">{m.label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={style}
        aria-label={`Método de pago: ${m.label}. Cambiar.`}
        className={`${base} transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25`}
      >
        {content}
      </button>
    );
  }
  return (
    <span className={base} style={style}>
      {content}
    </span>
  );
}
