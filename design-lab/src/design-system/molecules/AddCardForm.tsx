import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { Input } from "@design-system/atoms/Input";
import { Modal } from "@design-system/atoms/Modal";
import { CARD_COLOR_CHOICES, CARD_ICON_CHOICES, hexToRgba, type PaymentMethod } from "@lib/paymentMethods";

/**
 * AddCardForm — the "Agregar tarjeta" popup (DM-10). Pick an alias, a fin-*
 * pixel icon, and an accent color. No card data is stored — these are display
 * attributes only. On save, emits a new card PaymentMethod (kind "card").
 */
export interface AddCardFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (card: PaymentMethod) => void;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "card";
}

export function AddCardForm({ open, onClose, onSave }: AddCardFormProps) {
  const [alias, setAlias] = useState("");
  const [icon, setIcon] = useState<string>(CARD_ICON_CHOICES[0]);
  const [color, setColor] = useState<string>(CARD_COLOR_CHOICES[0]);

  const reset = () => {
    setAlias("");
    setIcon(CARD_ICON_CHOICES[0]);
    setColor(CARD_COLOR_CHOICES[0]);
  };

  const handleSave = () => {
    const label = alias.trim() || "Nueva tarjeta";
    onSave({ id: slug(label), kind: "card", label, icon, color });
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agregar tarjeta"
      footer={
        <div className="flex gap-gt-8">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" fullWidth onClick={handleSave}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-gt-20">
        {/* live preview — soft tinted chip (icon + name only, no swatch) */}
        <div className="flex items-center justify-center">
          <span
            className="inline-flex items-center gap-gt-8 rounded-gt-pill border-2 border-gt-line-strong px-gt-12 py-gt-4 text-gt-sm font-extrabold text-gt-ink shadow-gt-xs"
            style={{ backgroundColor: hexToRgba(color, 0.15) }}
          >
            <PixelIcon name={icon} size={22} />
            {alias.trim() || "Nueva tarjeta"}
          </span>
        </div>

        <Input label="Alias" placeholder="Falabella, Débito BCI…" value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={20} />

        {/* icon picker */}
        <div className="flex flex-col gap-gt-8">
          <span className="text-gt-sm font-extrabold text-gt-ink">Ícono</span>
          <div className="flex flex-wrap gap-gt-8">
            {CARD_ICON_CHOICES.map((ic) => (
              <button
                key={ic}
                type="button"
                aria-label={ic}
                aria-pressed={icon === ic}
                onClick={() => setIcon(ic)}
                className={`grid h-12 w-12 place-items-center rounded-gt-lg border-2 transition duration-150 ease-gt-bounce ${
                  icon === ic ? "border-gt-line-strong bg-gt-primary-soft shadow-gt-xs" : "border-gt-line bg-gt-surface hover:bg-gt-bg-3"
                }`}
              >
                <PixelIcon name={ic} size={28} />
              </button>
            ))}
          </div>
        </div>

        {/* color picker */}
        <div className="flex flex-col gap-gt-8">
          <span className="text-gt-sm font-extrabold text-gt-ink">Color</span>
          <div className="flex flex-wrap gap-gt-8">
            {CARD_COLOR_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-full border-2 transition duration-150 ease-gt-bounce ${
                  color === c ? "border-gt-line-strong ring-4 ring-gt-primary/25" : "border-gt-line-strong hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
