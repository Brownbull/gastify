import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { Modal } from "@design-system/atoms/Modal";
import { SegmentedToggle } from "@design-system/atoms/SegmentedToggle";
import { Pagination } from "@design-system/molecules/Pagination";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import type { Platform } from "@design-system/organisms/AppSurface";
import { clp } from "@lib/transactionFixtures";
import { SAMPLE_SHAREABLE, type ShareableTxn } from "../model/shareFixtures";

const PAGE_SIZE = 12;

type ShareTab = "share" | "shared";

function TxnRow({ t, selectable, selected, onToggle }: { t: ShareableTxn; selectable: boolean; selected: boolean; onToggle: () => void }) {
  const inner = (
    <>
      {selectable ? (
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-gt-md border-2 ${selected ? "border-gt-primary bg-gt-primary text-white" : "border-gt-line-strong bg-gt-surface"}`}>
          {selected ? <span className="font-gt-display text-gt-xs font-extrabold leading-none">✓</span> : null}
        </span>
      ) : (
        <span className="grid h-6 w-6 shrink-0 place-items-center text-gt-positive">
          <PixelIcon name="scan-success" size={20} />
        </span>
      )}
      <ThumbnailBadge icon={t.storeIcon} category={t.category} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{t.merchant}</span>
        <span className="flex items-center gap-gt-4 text-gt-xs font-medium text-gt-ink-2">
          <PixelIcon name="chart-calendar" size={13} /> {t.date}
        </span>
      </span>
      <span className="shrink-0 font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(t.total)}</span>
    </>
  );
  const base = "flex w-full items-center gap-gt-10 px-gt-12 py-gt-10 text-left";
  return selectable ? (
    <button type="button" onClick={onToggle} aria-pressed={selected} className={`${base} transition ${selected ? "bg-gt-primary-soft" : "hover:bg-gt-bg-3"}`}>{inner}</button>
  ) : (
    <div className={base}>{inner}</div>
  );
}

export interface ShareTransactionsScreenProps {
  groupName: string;
  txns?: ShareableTxn[];
  onBack?: () => void;
  /** confirmed share — reports the now-shared transactions to the host (feed update). */
  onShared?: (txns: ShareableTxn[]) => void;
  platform?: Platform;
}

/**
 * ShareTransactionsScreen — the full-page "Compartir gastos" flow (backend POST
 * /groups/:id/share, D74). Lists YOUR transactions that qualify to share with
 * the group (post-join, not yet shared), 12 per page, with a toggle between
 * "Por compartir" and "Compartidas". Select any → a batch bar (Deseleccionar /
 * Compartir) shares them after a confirm; shared rows move to the other tab.
 * Reached from the group's "Compartir gasto" AND from the add action while in a
 * group scope (where you share existing transactions instead of scanning).
 */
export function ShareTransactionsScreen({ groupName, txns: initial = SAMPLE_SHAREABLE, onBack, onShared, platform = "mobile" }: ShareTransactionsScreenProps) {
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<ShareTab>("share");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(false);

  const selectable = tab === "share";
  const shareCount = items.filter((t) => !t.shared).length;
  const sharedCount = items.length - shareCount;
  const list = items.filter((t) => (tab === "share" ? !t.shared : t.shared));
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageItems = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const toggleSel = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const clearSel = () => setSelected(new Set());
  const switchTab = (t: ShareTab) => { setTab(t); setPage(1); clearSel(); };
  const doShare = () => {
    const ids = selected;
    const justShared = items.filter((t) => ids.has(t.id));
    setItems((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, shared: true } : t)));
    clearSel();
    setConfirm(false);
    onShared?.(justShared);
  };

  const contentMax = platform === "desktop" ? "44rem" : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Compartir gastos" subtitle={groupName} onBack={onBack} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-12 pt-gt-12" style={{ maxWidth: contentMax }}>
          {/* toggle: shareable vs already shared (mirrors the detail's Por grupo / Original) */}
          <SegmentedToggle
            fill
            flush
            segments={[
              { id: "share", label: `Por compartir (${shareCount})` },
              { id: "shared", label: `Compartidas (${sharedCount})` },
            ]}
            value={tab}
            onChange={(v) => switchTab(v as ShareTab)}
          />

          {/* batch bar — appears once anything is selected */}
          {selectable && selected.size > 0 ? (
            <div className="flex items-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary-soft px-gt-12 py-gt-8">
              <span className="min-w-0 flex-1 font-gt-display text-gt-sm font-extrabold text-gt-ink">{selected.size} seleccionada{selected.size === 1 ? "" : "s"}</span>
              <button type="button" onClick={clearSel} className="shrink-0 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-10 py-gt-2 font-gt-display text-gt-xs font-extrabold text-gt-ink-2 transition hover:-translate-y-0.5">
                Deseleccionar
              </button>
              <Button variant="primary" size="sm" onClick={() => setConfirm(true)}>
                <PixelIcon name="action-split" size={18} /> Compartir
              </Button>
            </div>
          ) : null}

          {list.length === 0 ? (
            <p className="rounded-gt-2xl border-2 border-gt-line bg-gt-surface px-gt-12 py-gt-16 text-center text-gt-sm font-medium text-gt-ink-3">
              {tab === "share" ? "No tienes gastos por compartir con este grupo." : "Aún no compartes gastos con este grupo."}
            </p>
          ) : (
            <>
              <div className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
                <div className="flex flex-col divide-y-2 divide-gt-line">
                  {pageItems.map((t) => (
                    <TxnRow key={t.id} t={t} selectable={selectable} selected={selected.has(t.id)} onToggle={() => toggleSel(t.id)} />
                  ))}
                </div>
              </div>
              {pageCount > 1 ? <Pagination page={current} pageCount={pageCount} onPage={setPage} className="pt-gt-2" /> : null}
            </>
          )}

          {selectable ? (
            <p className="px-gt-4 text-center text-gt-xs font-medium text-gt-ink-3">
              Solo aparecen tus gastos posteriores a tu ingreso al grupo que aún no has compartido.
            </p>
          ) : null}
        </div>
      </div>

      {/* share confirm */}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Compartir con el grupo?"
        footer={
          <div className="flex justify-end gap-gt-8">
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={doShare}>Compartir {selected.size}</Button>
          </div>
        }
      >
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">
          Compartirás {selected.size} gasto{selected.size === 1 ? "" : "s"} con <span className="font-extrabold text-gt-ink">{groupName}</span>. Se comparte el comercio, el total y los ítems — nunca tu método de pago.
        </p>
      </Modal>
    </div>
  );
}
