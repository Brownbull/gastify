import { useState } from "react";
import { Modal } from "@design-system/atoms/Modal";
import { Button } from "@design-system/atoms/Button";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import { BROWSE_TRANSACTIONS, type BrowseTransaction } from "@lib/browseFixtures";
import { clp } from "@lib/transactionFixtures";

/** your recent personal transactions, flattened from the browse fixtures. */
const PERSONAL: BrowseTransaction[] = BROWSE_TRANSACTIONS.flatMap((g) => g.transactions).slice(0, 8);

/**
 * ShareTransactionSheet — pick a personal transaction to share into the group
 * (backend POST /groups/:id/share, D74). Only the merchant, total and items are
 * copied — never the card alias, personal flags or mappings. The share is an
 * independent point-in-time snapshot; the source stays yours.
 */
export function ShareTransactionSheet({
  open,
  groupName,
  onClose,
  onShare,
}: {
  open: boolean;
  groupName: string;
  onClose: () => void;
  onShare: (t: BrowseTransaction) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const sel = PERSONAL.find((t) => t.id === selected) ?? null;
  const close = () => { setSelected(null); onClose(); };

  return (
    <Modal
      open={open}
      onClose={close}
      placement="sheet"
      title="Compartir gasto"
      footer={
        <Button variant="primary" fullWidth disabled={!sel} onClick={() => { if (sel) { onShare(sel); close(); } }}>
          <PixelIcon name="action-split" size={20} /> Compartir en {groupName}
        </Button>
      }
    >
      <div className="flex flex-col gap-gt-8">
        <p className="text-gt-sm font-medium text-gt-ink-2">
          Elige una transacción para compartir. Solo se comparte el comercio, el total y los ítems — nunca tu método de pago.
        </p>
        <div className="flex flex-col gap-gt-6 overflow-y-auto" style={{ maxHeight: "46vh" }}>
          {PERSONAL.map((t) => {
            const on = t.id === selected;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                aria-pressed={on}
                className={`flex items-center gap-gt-10 rounded-gt-xl border-2 px-gt-10 py-gt-8 text-left transition duration-150 ease-gt-bounce ${
                  on ? "border-gt-line-strong bg-gt-primary-soft shadow-gt-xs" : "border-gt-line bg-gt-surface hover:bg-gt-bg-3"
                }`}
              >
                <ThumbnailBadge icon={t.storeIcon} category={t.category ?? "otros"} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{t.merchant}</span>
                  <span className="truncate text-gt-xs font-medium text-gt-ink-2">{t.time} · {t.location}</span>
                </span>
                <span className="shrink-0 font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(t.total)}</span>
                {on ? <PixelIcon name="scan-success" size={20} className="shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
