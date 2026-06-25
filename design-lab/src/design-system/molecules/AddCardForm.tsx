import { useEffect, useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { Input } from "@design-system/atoms/Input";
import { Switch } from "@design-system/atoms/Switch";
import { Modal } from "@design-system/atoms/Modal";
import { CARD_COLOR_CHOICES, CARD_ICON_CHOICES, hexToRgba, type PaymentMethod } from "@lib/paymentMethods";

/**
 * AddCardForm — the card alias popup (DM-10). Pick an alias, a fin-* pixel icon,
 * and an accent color. No card data is stored — these are display attributes
 * only. Emits a card PaymentMethod (kind "card") + whether to make it default.
 * Pass `initial` to EDIT an existing card (prefilled, keeps its id).
 */
export interface AddCardFormProps {
  open: boolean;
  onClose: () => void;
  /** when set, edit that card (prefilled, keeps its id) instead of adding a new one. */
  initial?: PaymentMethod;
  /** show the "Método predeterminado" toggle. */
  defaultable?: boolean;
  initialDefault?: boolean;
  onSave: (card: PaymentMethod, makeDefault?: boolean) => void;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "card";
}

export function AddCardForm({ open, onClose, initial, defaultable = false, initialDefault = false, onSave }: AddCardFormProps) {
  const editing = initial != null;
  const [alias, setAlias] = useState("");
  const [icon, setIcon] = useState<string>(CARD_ICON_CHOICES[0]);
  const [color, setColor] = useState<string>(CARD_COLOR_CHOICES[0]);
  const [makeDefault, setMakeDefault] = useState(false);

  // seed (or reseed) from `initial` whenever the form opens.
  useEffect(() => {
    if (!open) return;
    setAlias(initial?.label ?? "");
    setIcon(initial?.icon ?? CARD_ICON_CHOICES[0]);
    setColor(initial?.color ?? CARD_COLOR_CHOICES[0]);
    setMakeDefault(initialDefault);
  }, [open, initial, initialDefault]);

  const handleSave = () => {
    const label = alias.trim() || "Nueva tarjeta";
    const id = initial?.id ?? slug(label);
    onSave({ id, kind: "card", label, icon, color }, makeDefault);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar tarjeta" : "Agregar tarjeta"}
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

        {/* default-method toggle (CardsSubview) */}
        {defaultable ? (
          <div className="flex items-center gap-gt-10 rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg-3 px-gt-12 py-gt-10">
            <PixelIcon name="scan-success" size={24} className="shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
              <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink">Método predeterminado</span>
              <span className="text-gt-xs font-medium text-gt-ink-3">Se preselecciona al registrar un gasto.</span>
            </span>
            <Switch checked={makeDefault} onChange={setMakeDefault} label="Método predeterminado" />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
