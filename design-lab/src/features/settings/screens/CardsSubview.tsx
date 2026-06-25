import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Pagination } from "@design-system/molecules/Pagination";
import { AddCardForm } from "@design-system/molecules/AddCardForm";
import { CashMethodSheet } from "../components/CashMethodSheet";
import { SettingsSubviewShell, SettingsGroupHeading } from "../components/SettingsSubviewShell";
import { CASH, SAMPLE_CARDS, MAX_CARDS, softBgFor, type PaymentMethod } from "@lib/paymentMethods";

const PAGE_SIZE = 12;

/** soft-tinted icon tile for a method (cash = white; cards = their accent ~15%). */
function MethodTile({ method }: { method: PaymentMethod }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong" style={{ backgroundColor: softBgFor(method) }}>
      <PixelIcon name={method.icon ?? "fin-credit-card"} size={26} />
    </span>
  );
}

/** an active method row — tap to open its editor (cash sheet or card form). */
function MethodRow({ method, isDefault, onEdit }: { method: PaymentMethod; isDefault: boolean; onEdit: () => void }) {
  return (
    <button type="button" onClick={onEdit} aria-label={`Editar ${method.label}`} className="flex w-full items-center gap-gt-12 rounded-gt-lg px-gt-2 py-gt-6 text-left transition hover:bg-gt-bg-3">
      <MethodTile method={method} />
      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{method.label}</span>
        {isDefault ? (
          <span className="inline-flex w-fit items-center gap-gt-2 rounded-gt-pill bg-gt-primary-soft px-gt-6 py-gt-0 font-gt-display text-gt-xs font-extrabold text-gt-primary">
            <PixelIcon name="scan-success" size={13} /> Predeterminada
          </span>
        ) : null}
      </span>
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 -rotate-45 border-b-2 border-r-2 border-gt-ink-3" />
    </button>
  );
}

function ArchivedCardRow({ card, onRestore }: { card: PaymentMethod; onRestore: () => void }) {
  return (
    <div className="flex items-center gap-gt-12 px-gt-4 py-gt-8 opacity-60">
      <MethodTile method={card} />
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
 * Mis métodos de pago — your payment methods (Efectivo + card aliases for
 * statement reconciliation, REQ-09). Tap a card to edit it (alias / color / icon
 * / default / archive — archiving is blocked while it's the default); tap Efectivo
 * to (only) set it as default. One method is marked "Predeterminada". No card
 * numbers / CVV / expiry are ever stored. Both lists paginate at 12 per page.
 */
export function CardsSubview({ onBack, initialArchived = [] }: { onBack?: () => void; initialArchived?: PaymentMethod[] }) {
  const [cards, setCards] = useState<PaymentMethod[]>(SAMPLE_CARDS);
  const [archived, setArchived] = useState<PaymentMethod[]>(initialArchived);
  const [defaultId, setDefaultId] = useState<string | null>(SAMPLE_CARDS[0]?.id ?? null);
  const [addOpen, setAddOpen] = useState(false);
  const [editCard, setEditCard] = useState<PaymentMethod | null>(null);
  const [cashOpen, setCashOpen] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);

  // active methods = Efectivo + cards, paginated.
  const methods: PaymentMethod[] = [CASH, ...cards];
  const activePageCount = Math.max(1, Math.ceil(methods.length / PAGE_SIZE));
  const activeCurrent = Math.min(activePage, activePageCount);
  const activeItems = methods.slice((activeCurrent - 1) * PAGE_SIZE, activeCurrent * PAGE_SIZE);

  const archivedPageCount = Math.max(1, Math.ceil(archived.length / PAGE_SIZE));
  const archivedCurrent = Math.min(archivedPage, archivedPageCount);
  const archivedItems = archived.slice((archivedCurrent - 1) * PAGE_SIZE, archivedCurrent * PAGE_SIZE);

  const saveCard = (card: PaymentMethod, makeDefault?: boolean) => {
    setCards((prev) => (prev.some((c) => c.id === card.id) ? prev.map((c) => (c.id === card.id ? card : c)) : [...prev, card]));
    if (makeDefault) setDefaultId(card.id);
    else if (defaultId === card.id) setDefaultId(null);
  };
  const archiveCard = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    setCards((prev) => prev.filter((c) => c.id !== id));
    setArchived((prev) => [...prev, card]);
    if (defaultId === id) setDefaultId(null);
  };
  const restore = (id: string) => {
    const card = archived.find((c) => c.id === id);
    if (!card) return;
    setArchived((prev) => prev.filter((c) => c.id !== id));
    setCards((prev) => [...prev, card]);
  };
  const setCashDefault = (makeDefault: boolean) => {
    if (makeDefault) setDefaultId(CASH.id);
    else if (defaultId === CASH.id) setDefaultId(null);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title="Mis métodos de pago" onBack={onBack}>
        <p className="px-gt-2 text-gt-sm font-medium leading-relaxed text-gt-ink-3">
          Elige tu método predeterminado y nombra tus tarjetas para conciliar tus cartolas. De las tarjetas solo guardamos el alias — nunca el número, CVV ni la fecha de vencimiento.
        </p>

        <SettingsGroupHeading>Métodos</SettingsGroupHeading>
        <div className="flex flex-col">
          {activeItems.map((m) => (
            <MethodRow key={m.id} method={m} isDefault={m.id === defaultId} onEdit={() => (m.kind === "cash" ? setCashOpen(true) : setEditCard(m))} />
          ))}
        </div>
        {activePageCount > 1 ? <Pagination page={activeCurrent} pageCount={activePageCount} onPage={setActivePage} className="pt-gt-2" /> : null}

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
              {archivedItems.map((c) => (
                <ArchivedCardRow key={c.id} card={c} onRestore={() => restore(c.id)} />
              ))}
            </div>
            {archivedPageCount > 1 ? <Pagination page={archivedCurrent} pageCount={archivedPageCount} onPage={setArchivedPage} className="pt-gt-2" /> : null}
          </>
        ) : null}
      </SettingsSubviewShell>

      {/* add */}
      <AddCardForm open={addOpen} onClose={() => setAddOpen(false)} defaultable onSave={saveCard} />
      {/* edit a card (alias / color / icon / default / archive) */}
      <AddCardForm
        open={editCard != null}
        initial={editCard ?? undefined}
        defaultable
        initialDefault={editCard != null && editCard.id === defaultId}
        onArchive={() => { if (editCard) archiveCard(editCard.id); }}
        onClose={() => setEditCard(null)}
        onSave={saveCard}
      />
      {/* edit Efectivo (default only) */}
      <CashMethodSheet open={cashOpen} isDefault={defaultId === CASH.id} onClose={() => setCashOpen(false)} onSave={setCashDefault} />
    </div>
  );
}
