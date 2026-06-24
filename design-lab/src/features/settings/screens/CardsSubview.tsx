import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { InlineText } from "@design-system/molecules/InlineText";
import { AddCardForm } from "@design-system/molecules/AddCardForm";
import { SettingsSubviewShell, SettingsGroupHeading } from "../components/SettingsSubviewShell";
import { SAMPLE_CARDS, MAX_CARDS, softBgFor, type PaymentMethod } from "@lib/paymentMethods";

/** soft-tinted icon tile for a card (the stored accent softened ~15%). */
function CardTile({ card }: { card: PaymentMethod }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong" style={{ backgroundColor: softBgFor(card) }}>
      <PixelIcon name={card.icon ?? "fin-credit-card"} size={26} />
    </span>
  );
}

function ActiveCardRow({ card, onRename, onArchive }: { card: PaymentMethod; onRename: (v: string) => void; onArchive: () => void }) {
  return (
    <div className="flex items-center gap-gt-12 px-gt-4 py-gt-8">
      <CardTile card={card} />
      <InlineText
        value={card.label}
        onChange={(v) => onRename(v.slice(0, 20))}
        cap={20}
        ariaLabel="Nombre de la tarjeta"
        className="min-w-0 flex-1 truncate font-gt-display text-gt-md font-extrabold text-gt-ink"
      />
      <button
        type="button"
        onClick={onArchive}
        className="inline-flex shrink-0 items-center gap-gt-2 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-8 py-gt-2 font-gt-display text-gt-xs font-extrabold text-gt-ink-2 transition hover:-translate-y-0.5 hover:bg-gt-bg-3"
      >
        Archivar
      </button>
    </div>
  );
}

function ArchivedCardRow({ card, onRestore }: { card: PaymentMethod; onRestore: () => void }) {
  return (
    <div className="flex items-center gap-gt-12 px-gt-4 py-gt-8 opacity-60">
      <CardTile card={card} />
      <span className="min-w-0 flex-1 truncate font-gt-display text-gt-md font-extrabold text-gt-ink-2 line-through">{card.label}</span>
      <button
        type="button"
        onClick={onRestore}
        className="inline-flex shrink-0 items-center gap-gt-2 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-8 py-gt-2 font-gt-display text-gt-xs font-extrabold text-gt-primary transition hover:-translate-y-0.5 hover:bg-gt-primary-soft"
      >
        Restaurar
      </button>
    </div>
  );
}

/**
 * Mis tarjetas subview — card aliases for statement reconciliation (backend
 * card_aliases, REQ-09). You NAME your cards ("CMR Falabella", "Débito BCI");
 * NO numbers / CVV / expiry are ever stored. Rename inline, add (AddCardForm),
 * or archive (kept for historical pairings, restorable). Picked when uploading a
 * cartola so its charges reconcile to the right card.
 */
export function CardsSubview({ onBack }: { onBack?: () => void }) {
  const [cards, setCards] = useState<PaymentMethod[]>(SAMPLE_CARDS);
  const [archived, setArchived] = useState<PaymentMethod[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const rename = (id: string, label: string) => setCards((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
  const archive = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    setCards((prev) => prev.filter((c) => c.id !== id));
    setArchived((prev) => [...prev, card]);
  };
  const restore = (id: string) => {
    const card = archived.find((c) => c.id === id);
    if (!card) return;
    setArchived((prev) => prev.filter((c) => c.id !== id));
    setCards((prev) => [...prev, card]);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title="Mis tarjetas" onBack={onBack}>
        <p className="px-gt-2 text-gt-sm font-medium leading-relaxed text-gt-ink-3">
          Nombra tus tarjetas para conciliar tus cartolas. Solo guardamos el alias — nunca el número, CVV ni la fecha de vencimiento.
        </p>

        <SettingsGroupHeading>Tarjetas</SettingsGroupHeading>
        {cards.length > 0 ? (
          <div className="flex flex-col">
            {cards.map((c) => (
              <ActiveCardRow key={c.id} card={c} onRename={(v) => rename(c.id, v)} onArchive={() => archive(c.id)} />
            ))}
          </div>
        ) : (
          <p className="px-gt-4 py-gt-6 text-gt-sm font-medium text-gt-ink-3">No tienes tarjetas activas.</p>
        )}

        {cards.length < MAX_CARDS ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-gt-2 flex w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-dashed border-gt-line-strong px-gt-12 py-gt-10 font-gt-display text-gt-md font-extrabold text-gt-primary transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:bg-gt-primary-soft"
          >
            <PixelIcon name="action-add" size={18} /> Agregar tarjeta
          </button>
        ) : (
          <p className="px-gt-4 text-gt-sm font-bold text-gt-ink-3">Máximo {MAX_CARDS} tarjetas.</p>
        )}

        {archived.length > 0 ? (
          <>
            <SettingsGroupHeading>Archivadas</SettingsGroupHeading>
            <div className="flex flex-col">
              {archived.map((c) => (
                <ArchivedCardRow key={c.id} card={c} onRestore={() => restore(c.id)} />
              ))}
            </div>
          </>
        ) : null}
      </SettingsSubviewShell>

      <AddCardForm open={addOpen} onClose={() => setAddOpen(false)} onSave={(card) => setCards((prev) => [...prev, card])} />
    </div>
  );
}
