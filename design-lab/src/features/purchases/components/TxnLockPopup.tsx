import { Modal } from "@design-system/atoms/Modal";
import { Button } from "@design-system/atoms/Button";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { GroupAvatar } from "@design-system/atoms/GroupAvatar";
import { clp } from "@lib/transactionFixtures";
import type { BrowseTransaction } from "@lib/browseFixtures";

/**
 * TxnLockPopup — explains why a locked (matched/shared) transaction is read-only,
 * showing the PAIR it's linked to: a conciliada txn vs its credit-card statement
 * line (card · date · description · amount + match reasons), or a compartida txn
 * vs the group it's shared in. "Ver transacción" opens the (locked) full detail.
 */
export function TxnLockPopup({ txn, onClose, onOpenDetail }: { txn: BrowseTransaction | null; onClose: () => void; onOpenDetail: () => void }) {
  const matched = txn?.status === "matched";
  return (
    <Modal
      open={txn != null}
      onClose={onClose}
      title={matched ? "Transacción conciliada" : "Transacción compartida"}
      footer={
        <div className="flex justify-end gap-gt-8">
          <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
          <Button variant="primary" size="sm" onClick={onOpenDetail}>Ver transacción</Button>
        </div>
      }
    >
      {txn ? (
        <div className="flex flex-col gap-gt-10">
          <p className="text-gt-sm font-medium leading-relaxed text-gt-ink-2">
            {matched
              ? "Esta transacción se concilió con una línea de tu estado de cuenta, así que está bloqueada para edición."
              : "Compartiste esta transacción en un grupo, así que está bloqueada para edición."}
          </p>

          {/* the transaction */}
          <div className="flex items-center gap-gt-10 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-10 shadow-gt-xs">
            <ThumbnailBadge icon={txn.storeIcon} category={txn.category} />
            <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
              <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{txn.merchant}</span>
              <span className="flex items-center gap-gt-4 text-gt-xs font-medium text-gt-ink-2">
                <PixelIcon name="chart-calendar" size={13} /> {txn.date} · {txn.itemCount} ítems
              </span>
            </span>
            <span className="shrink-0 font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(txn.total)}</span>
          </div>

          {/* link */}
          <div className="flex items-center justify-center gap-gt-4 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
            <span className="h-px flex-1 bg-gt-line" />
            <PixelIcon name={matched ? "status-sync" : "action-split"} size={16} />
            {matched ? "coincide con" : "compartida en"}
            <span className="h-px flex-1 bg-gt-line" />
          </div>

          {/* the matched statement line OR the group */}
          {matched ? (
            <div className="flex flex-col gap-gt-6 rounded-gt-xl border-2 border-gt-line-strong px-gt-12 py-gt-10 shadow-gt-xs" style={{ backgroundColor: "rgba(139,92,246,0.08)" }}>
              <div className="flex items-center gap-gt-10">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface">
                  <PixelIcon name="scan-statement" size={22} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
                  <span className="truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">CMR Falabella · {txn.merchant.toUpperCase()}</span>
                  <span className="text-gt-xs font-medium text-gt-ink-3">Cartola · {txn.date}</span>
                </span>
                <span className="shrink-0 font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(txn.total)}</span>
              </div>
              <div className="flex flex-wrap gap-gt-4">
                <span className="inline-flex items-center gap-gt-2 rounded-gt-pill border-2 border-gt-positive bg-gt-positive-bg px-gt-6 py-gt-0 font-gt-display text-gt-xs font-extrabold text-gt-positive">Monto exacto</span>
                <span className="inline-flex items-center gap-gt-2 rounded-gt-pill border-2 border-gt-positive bg-gt-positive-bg px-gt-6 py-gt-0 font-gt-display text-gt-xs font-extrabold text-gt-positive">Fecha cercana</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-gt-10 rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary-soft px-gt-12 py-gt-10 shadow-gt-xs">
              <GroupAvatar icon="🏡" color="#7B6EF6" size="sm" />
              <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
                <span className="truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">Familia González</span>
                <span className="text-gt-xs font-medium text-gt-ink-3">Compartida por ti</span>
              </span>
              <CategoryChip category={txn.category} size="sm" />
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
