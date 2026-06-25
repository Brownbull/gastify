import { useEffect, useState } from "react";
import { Modal } from "@design-system/atoms/Modal";
import { Button } from "@design-system/atoms/Button";
import { Switch } from "@design-system/atoms/Switch";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { CASH } from "@lib/paymentMethods";

/**
 * CashMethodSheet — the (minimal) editor for Efectivo. Cash can't be renamed,
 * re-styled or archived; the only choice is whether it's your default payment
 * method. Mirrors the AddCardForm's default toggle.
 */
export function CashMethodSheet({ open, isDefault, onClose, onSave }: { open: boolean; isDefault: boolean; onClose: () => void; onSave: (makeDefault: boolean) => void }) {
  const [makeDefault, setMakeDefault] = useState(isDefault);
  useEffect(() => { if (open) setMakeDefault(isDefault); }, [open, isDefault]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Efectivo"
      footer={
        <div className="flex gap-gt-8">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
          <Button variant="primary" fullWidth onClick={() => { onSave(makeDefault); onClose(); }}>Guardar</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-gt-16">
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-gt-8 rounded-gt-pill border-2 border-gt-line-strong bg-gt-bg-3 px-gt-12 py-gt-4 text-gt-sm font-extrabold text-gt-ink shadow-gt-xs">
            <PixelIcon name={CASH.icon ?? "fin-coin"} size={22} /> {CASH.label}
          </span>
        </div>
        <p className="text-center text-gt-sm font-medium text-gt-ink-3">El efectivo no se puede editar ni archivar.</p>
        <div className="flex items-center gap-gt-10 rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg-3 px-gt-12 py-gt-10">
          <PixelIcon name="scan-success" size={24} className="shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
            <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink">Método predeterminado</span>
            <span className="text-gt-xs font-medium text-gt-ink-3">Se preselecciona al registrar un gasto.</span>
          </span>
          <Switch checked={makeDefault} onChange={setMakeDefault} label="Método predeterminado" />
        </div>
      </div>
    </Modal>
  );
}
