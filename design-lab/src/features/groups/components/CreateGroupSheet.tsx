import { useState } from "react";
import { Modal } from "@design-system/atoms/Modal";
import { Input } from "@design-system/atoms/Input";
import { Button } from "@design-system/atoms/Button";
import { GroupAvatar } from "@design-system/atoms/GroupAvatar";

/** preset emoji + accent choices for the new group's avatar (D75). */
export const EMOJI_CHOICES = ["🏡", "🛋️", "🏔️", "✈️", "🎉", "🍽️", "💼", "⚽", "🎓", "🐾"];
export const COLOR_CHOICES = ["#7B6EF6", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#14B8A6"];

export interface CreateGroupDraft {
  name: string;
  icon: string;
  color: string;
}

export interface CreateGroupSheetProps {
  open: boolean;
  onClose: () => void;
  onCreate?: (draft: CreateGroupDraft) => void;
}

/**
 * CreateGroupSheet — bottom-sheet to create a group: a live avatar preview, the
 * name field, and emoji + accent-color pickers (the backend group-avatar model).
 * The submit is gated on a non-blank name.
 */
export function CreateGroupSheet({ open, onClose, onCreate }: CreateGroupSheetProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(EMOJI_CHOICES[0]);
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const valid = name.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      placement="sheet"
      title="Crear grupo"
      footer={
        <div className="flex gap-gt-8">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
          <Button variant="primary" fullWidth disabled={!valid} onClick={() => onCreate?.({ name: name.trim(), icon, color })}>
            Crear grupo
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-gt-12">
        {/* live preview */}
        <div className="flex items-center gap-gt-12 rounded-gt-xl border-2 border-gt-line bg-gt-bg-3 px-gt-12 py-gt-10">
          <GroupAvatar icon={icon} color={color} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-gt-display text-gt-lg font-extrabold text-gt-ink">{name.trim() || "Nombre del grupo"}</span>
            <span className="text-gt-xs font-bold text-gt-ink-3">Tú · Dueño</span>
          </span>
        </div>

        <Input
          label="Nombre"
          aria-label="Nombre del grupo"
          value={name}
          maxLength={60}
          placeholder="Ej. Familia, Roommates…"
          onChange={(e) => setName(e.target.value)}
        />

        {/* emoji picker */}
        <div className="flex flex-col gap-gt-6">
          <span className="text-gt-sm font-extrabold text-gt-ink">Ícono</span>
          <div className="flex flex-wrap gap-gt-6">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIcon(e)}
                aria-label={`Ícono ${e}`}
                aria-pressed={icon === e}
                className={`grid h-10 w-10 place-items-center rounded-gt-lg border-2 transition duration-150 ease-gt-bounce hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 ${
                  icon === e ? "border-gt-line-strong bg-gt-primary-soft shadow-gt-xs" : "border-gt-line bg-gt-surface"
                }`}
                style={{ fontSize: 20 }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* color picker */}
        <div className="flex flex-col gap-gt-6">
          <span className="text-gt-sm font-extrabold text-gt-ink">Color</span>
          <div className="flex flex-wrap gap-gt-8">
            {COLOR_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                className={`h-9 w-9 rounded-gt-pill border-2 transition duration-150 ease-gt-bounce hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 ${
                  color === c ? "border-gt-ink" : "border-gt-line-strong"
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
