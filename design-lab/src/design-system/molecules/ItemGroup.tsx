import { useId, useState, type ReactNode } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { getCategoryToken } from "@lib/categoryTokens";
import { clp } from "@lib/transactionFixtures";

/**
 * ItemGroup (DM-16, tone-card) — a collapsible "Por Grupo" section as a color-
 * coded card (category color border + soft tint bg, like a Despensa zone).
 *
 * Header order (DM-15): icon · group name · count … subtotal · chevron.
 * (No gear / action button — toggle only.) Whole header row toggles. The count
 * is a round 28px badge; the chevron is a weightless CSS corner that rotates.
 * Body = full-width ItemRows separated by 1px hairlines on a surface panel.
 */
export interface ItemGroupProps {
  /** L3 familia id (drives border color, tint, icon, label). */
  familia: string;
  total: number;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function ItemGroup({ familia, total, count, defaultOpen = true, children, className = "" }: ItemGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const token = getCategoryToken(familia);
  const panelId = useId();

  return (
    <section
      className={`overflow-hidden rounded-gt-2xl border-2 shadow-gt-sm ${className}`}
      style={{ borderColor: token.color, backgroundColor: token.tint }}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-gt-8 px-gt-12 py-gt-10 text-left"
      >
        <PixelIcon name={token.icon} size={24} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{token.label}</span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface text-gt-sm font-extrabold leading-none text-gt-ink">
          {count}
        </span>
        <span className="ml-gt-2 shrink-0 font-gt-display text-gt-md font-extrabold text-gt-primary">{clp(total)}</span>
        <span
          aria-hidden="true"
          className={`ml-gt-2 h-2 w-2 shrink-0 border-b-2 border-r-2 border-gt-ink transition-transform duration-150 ease-gt-bounce ${
            open ? "-translate-y-px rotate-45" : "translate-y-px rotate-[-135deg]"
          }`}
        />
      </button>
      {open ? (
        <ul id={panelId} className="divide-y divide-gt-line bg-gt-surface">
          {children}
        </ul>
      ) : null}
    </section>
  );
}
