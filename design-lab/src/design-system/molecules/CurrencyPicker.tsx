import { Modal } from "@design-system/atoms/Modal";
import { AVAILABLE_CURRENCIES, type CurrencyCode } from "@lib/scanFixtures";

/**
 * CurrencyPicker — a Modal list of the available currencies (drives the price
 * decimal rule). Shared by the scan review and the saved-transaction detail.
 * Selecting a row commits and closes.
 */
export interface CurrencyPickerProps {
  open: boolean;
  onClose: () => void;
  selected: CurrencyCode;
  onSelect: (c: CurrencyCode) => void;
}

export function CurrencyPicker({ open, onClose, selected, onSelect }: CurrencyPickerProps) {
  return (
    <Modal open={open} onClose={onClose} title="Moneda">
      <ul className="flex flex-col gap-gt-6">
        {AVAILABLE_CURRENCIES.map((c) => {
          const active = c.code === selected;
          return (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => { onSelect(c.code); onClose(); }}
                aria-pressed={active}
                className={`flex w-full items-center gap-gt-10 rounded-gt-lg border-2 px-gt-12 py-gt-10 text-left font-gt-display text-gt-sm font-extrabold transition duration-150 ease-gt-bounce hover:-translate-y-0.5 ${
                  active ? "border-gt-line-strong bg-gt-primary text-white" : "border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs"
                }`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-gt-md border-2 ${active ? "border-white/40 bg-white/10" : "border-gt-line-strong bg-gt-bg-3"} font-gt-display text-gt-sm font-extrabold`}>
                  {c.symbol}
                </span>
                <span className="flex-1">{c.code}</span>
                <span className={`text-gt-xs font-medium ${active ? "text-white/80" : "text-gt-ink-3"}`}>
                  {c.decimals === 0 ? "Sin decimales" : "2 decimales"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
