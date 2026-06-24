import { Modal } from "@design-system/atoms/Modal";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { CADENCE_LABEL, CADENCE_ORDER, type TxnCadence } from "@lib/transactionFixtures";

/**
 * CadencePicker — recurrence chooser (Única vez / Semanal / … / Anual). Same row
 * grammar as PaymentPicker's MethodRow. Shared by the transaction detail and the
 * manual-entry form.
 */
export function CadencePicker({ open, value, onPick, onClose }: { open: boolean; value: TxnCadence; onPick: (c: TxnCadence) => void; onClose: () => void }) {
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
