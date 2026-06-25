import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { MapPinIcon, XIcon, ShareIcon } from "@design-system/assets/icons";
import { getCategoryToken } from "@lib/categoryTokens";
import { Badge } from "@design-system/atoms/Badge";
import { Button } from "@design-system/atoms/Button";
import { Modal } from "@design-system/atoms/Modal";
import { SearchRow } from "@design-system/molecules/SearchRow";
import { SectionFade } from "@design-system/atoms/SectionFade";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { CompactRow, CompactRowList } from "@design-system/molecules/CompactRowList";
import { Pagination } from "@design-system/molecules/Pagination";
import { GroupedCategoryPicker } from "@design-system/molecules/GroupedCategoryPicker";
import type { Platform } from "@design-system/organisms/AppSurface";
import { selectionCount, type FilterSelection } from "@design-system/organisms/FilterSheet";
import { BROWSE_TRANSACTIONS, BROWSE_FACETS, BROWSE_TOTAL, BROWSE_TXN_COUNT, periodLabel, type DateGroup, type BrowseTransaction } from "@lib/browseFixtures";
import { clp } from "@lib/transactionFixtures";

/**
 * PurchasesScreen (Phase 9) — the transactions browse, content-only for
 * AppScaffold (which supplies the header / 4-tab nav / scan FAB; runs in
 * `bleed` mode so this screen owns its sticky band + scroll + filter overlay):
 *
 *   sticky band → search + filter + "N boletas · $total" (+ "Seleccionar")
 *   list        → date-grouped CompactRowLists
 *   select mode → per-row checkboxes + a batch bar (re-categorize / delete)
 *   filter      → FilterSheet bottom-sheet overlay
 *
 * Grounded on the shipped transactions route + legacy HistoryView + batch ops.
 */
export interface PurchasesScreenProps {
  groups?: DateGroup[];
  /** active filter selection (drives the chips + count). The host owns it. */
  selection?: FilterSelection;
  /** open the full-surface filter (rendered by the host via AppScaffold overlay). */
  onOpenFilter?: () => void;
  /** a transaction row was tapped — open its full detail (host-owned overlay). */
  onSelectTxn?: (txn: BrowseTransaction) => void;
  /** entered/left batch-select mode — the host hides the scan FAB while selecting. */
  onSelectModeChange?: (active: boolean) => void;
  platform?: Platform;
}

/** time · location (date is the group header). */
function MetaLine({ txn }: { txn: BrowseTransaction }) {
  return (
    <>
      <PixelIcon name="chart-calendar" size={12} />
      <span className="text-gt-xs font-bold">{txn.time}</span>
      <span className="text-gt-line-strong">·</span>
      <MapPinIcon className="h-3 w-3" />
      <span className="text-gt-xs font-bold">{txn.location}</span>
    </>
  );
}

/** the expanded item preview. */
function PreviewItems({ txn }: { txn: BrowseTransaction }) {
  return (
    <ul className="flex flex-col gap-gt-4 rounded-gt-lg bg-gt-bg-3 px-gt-8 py-gt-8">
      {txn.previewItems.map((it, i) => (
        <li key={i} className="flex items-center gap-gt-6">
          <CategoryChip category={it.category} size="sm" />
          <span className="min-w-0 flex-1 truncate text-gt-sm font-bold text-gt-ink-2">{it.name}</span>
          <span className="shrink-0 text-gt-sm font-extrabold text-gt-ink">{clp(it.total)}</span>
        </li>
      ))}
      {txn.itemCount > txn.previewItems.length ? (
        <li className="pt-gt-2 text-center text-gt-xs font-extrabold text-gt-primary">+{txn.itemCount - txn.previewItems.length} más</li>
      ) : null}
    </ul>
  );
}

/**
 * TxnThumbnail — the receipt thumbnail (the store glyph as a placeholder until
 * real receipt photos), with corner status badges: matched → a green Conciliada
 * badge bottom-right (replacing the category icon there); shared → a violet
 * badge upper-left. Non-status rows keep the category icon bottom-right.
 */
function TxnThumbnail({ txn }: { txn: BrowseTransaction }) {
  const token = getCategoryToken(txn.category);
  return (
    <span className="relative h-12 w-12 shrink-0">
      <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg">
        <PixelIcon name={txn.storeIcon} size={32} />
      </span>
      {txn.status === "shared" ? (
        <span className="absolute -left-1 -top-1 grid h-7 w-7 place-items-center rounded-full border-2 border-gt-bg bg-gt-primary" aria-label="Compartida">
          <ShareIcon className="h-4 w-4 text-white" />
        </span>
      ) : null}
      {txn.status === "matched" ? (
        <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-gt-bg bg-gt-positive" aria-label="Conciliada">
          <PixelIcon name="scan-statement" size={16} />
        </span>
      ) : (
        <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-gt-bg" style={{ backgroundColor: token.color }}>
          <PixelIcon name={token.icon} size={18} />
        </span>
      )}
    </span>
  );
}

function TxnRow({ txn, onSelect, selectMode, selected, onToggle, onLongPress }: { txn: BrowseTransaction; onSelect?: (txn: BrowseTransaction) => void; selectMode?: boolean; selected?: boolean; onToggle?: () => void; onLongPress?: () => void }) {
  return (
    <CompactRow
      className={`px-gt-0! ${selected ? "rounded-gt-lg bg-gt-primary-soft" : ""}`}
      onClick={selectMode ? onToggle : onSelect ? () => onSelect(txn) : undefined}
      onLongPress={onLongPress}
      clickLabel={selectMode ? `Seleccionar boleta de ${txn.merchant}` : `Ver boleta de ${txn.merchant}`}
      leading={
        selectMode ? (
          <span className="flex items-center gap-gt-8">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-gt-md border-2 transition-colors duration-150 ${selected ? "border-gt-primary bg-gt-primary text-white" : "border-gt-line-strong bg-gt-surface"}`}>
              {selected ? <span className="font-gt-display text-gt-xs font-extrabold leading-none">✓</span> : null}
            </span>
            <TxnThumbnail txn={txn} />
          </span>
        ) : (
          <TxnThumbnail txn={txn} />
        )
      }
      title={txn.merchant}
      meta={<MetaLine txn={txn} />}
      tags={<CategoryChip category={txn.category} size="sm" />}
      trailing={<span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(txn.total)}</span>}
      detailLabel={`${txn.itemCount} ${txn.itemCount === 1 ? "ítem" : "ítems"}`}
      detail={<PreviewItems txn={txn} />}
    />
  );
}

const PAGE_SIZE = 12; // transactions per page

export function PurchasesScreen({ groups = BROWSE_TRANSACTIONS, selection = {}, onOpenFilter, onSelectTxn, onSelectModeChange, platform = "mobile" }: PurchasesScreenProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  // batch ops: select mode + the local edits it makes (deletes / re-categorize).
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [categoryOverride, setCategoryOverride] = useState<Record<string, string>>({});
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeCount = selectionCount(selection);
  const contentMax = platform === "desktop" ? "56rem" : undefined;

  // flat list — drop deleted, apply category overrides — then paginate (12/page)
  // and re-group the current page's transactions under their date headers.
  const flat = groups.flatMap((g) =>
    g.transactions
      .filter((t) => !removedIds.has(t.id))
      .map((t) => ({ t: categoryOverride[t.id] ? { ...t, category: categoryOverride[t.id] } : t, groupDate: g.date })),
  );
  const pageCount = Math.max(1, Math.ceil(flat.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageFlat = flat.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const pageGroups: { date: string; transactions: BrowseTransaction[] }[] = [];
  for (const { t, groupDate } of pageFlat) {
    const last = pageGroups[pageGroups.length - 1];
    if (last && last.date === groupDate) last.transactions.push(t);
    else pageGroups.push({ date: groupDate, transactions: [t] });
  }

  const pageIds = pageFlat.map(({ t }) => t.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((prev) => { const n = new Set(prev); if (allSelected) pageIds.forEach((id) => n.delete(id)); else pageIds.forEach((id) => n.add(id)); return n; });
  const enterSelect = () => { setSelectMode(true); onSelectModeChange?.(true); };
  // long-press a row (mobile/tablet) → enter select mode with that row selected.
  const startSelectionWith = (id: string) => { setSelectMode(true); onSelectModeChange?.(true); setSelected(new Set([id])); };
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); onSelectModeChange?.(false); };
  const batchDelete = () => { setRemovedIds((prev) => new Set([...prev, ...selected])); setConfirmDelete(false); exitSelect(); };
  const batchReassign = (catId: string) => { setCategoryOverride((prev) => { const n = { ...prev }; selected.forEach((id) => (n[id] = catId)); return n; }); exitSelect(); };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* sticky band — search/filter + count + "Seleccionar", OR the selection header */}
      <div className="shrink-0 bg-gt-surface px-gt-16 pb-gt-6 pt-gt-12">
        <div className="mx-auto w-full" style={{ maxWidth: contentMax }}>
          {selectMode ? (
            <div className="flex items-center gap-gt-8">
              <button type="button" aria-label="Cancelar selección" onClick={exitSelect} className="-ml-gt-2 grid h-8 w-8 shrink-0 place-items-center text-gt-ink transition hover:scale-110">
                <XIcon className="h-6 w-6" />
              </button>
              <span className="min-w-0 flex-1 font-gt-display text-gt-lg font-extrabold text-gt-ink">{selected.size} seleccionada{selected.size === 1 ? "" : "s"}</span>
              <button type="button" onClick={toggleAll} className="shrink-0 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-10 py-gt-2 font-gt-display text-gt-xs font-extrabold text-gt-ink-2 transition hover:-translate-y-0.5">
                {allSelected ? "Quitar todo" : "Seleccionar todo"}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-gt-8">
                <span className="min-w-0 flex-1">
                  <SearchRow icon="action-search" label="Buscar boletas" placeholder="Buscar comercio o producto…" value={query} onValueChange={setQuery} />
                </span>
                <button type="button" aria-label="Filtros" onClick={onOpenFilter} className="relative grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs transition hover:-translate-y-0.5">
                  <PixelIcon name="action-filter-e" size={24} />
                  {activeCount > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-gt-surface bg-gt-primary text-[10px] font-extrabold leading-none text-white">{activeCount}</span>
                  ) : null}
                </button>
              </div>
              <div className="mt-gt-8 flex items-center justify-between gap-gt-8">
                <p className="text-gt-sm font-bold text-gt-ink-2">
                  {BROWSE_TXN_COUNT} boletas · <span className="font-extrabold text-gt-primary">{clp(BROWSE_TOTAL)}</span>
                </p>
                <button type="button" onClick={enterSelect} className="shrink-0 font-gt-display text-gt-sm font-extrabold text-gt-primary">Seleccionar</button>
              </div>
              {activeCount > 0 ? (
                <div className="mt-gt-6 flex flex-wrap gap-gt-6">
                  {BROWSE_FACETS.flatMap((facet) =>
                    (selection[facet.id] ?? []).map((token) => {
                      let label = token;
                      if (facet.kind === "period") label = periodLabel(token) ?? token;
                      else if (facet.kind === "sort") label = facet.options.find((o) => o.id === token.split(":")[0])?.label ?? token;
                      else label = facet.options.find((o) => o.id === token)?.label ?? token;
                      return <Badge key={`${facet.id}:${token}`} tone="primary">{label}</Badge>;
                    }),
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <SectionFade heightClassName="h-3" />

      {/* date-grouped transaction list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-2" style={{ maxWidth: contentMax }}>
          {pageGroups.map((group) => (
            <section key={group.date} className="flex flex-col gap-gt-6">
              <div className="flex items-center justify-between gap-gt-8">
                <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink-2">{group.date}</span>
                <span className="font-gt-display text-gt-sm font-extrabold text-gt-primary">
                  {clp(group.transactions.reduce((s, t) => s + t.total, 0))}
                </span>
              </div>
              <CompactRowList>
                {group.transactions.map((txn) => (
                  <TxnRow
                    key={txn.id}
                    txn={txn}
                    onSelect={onSelectTxn}
                    selectMode={selectMode}
                    selected={selected.has(txn.id)}
                    onToggle={() => toggle(txn.id)}
                    onLongPress={!selectMode && platform !== "desktop" ? () => startSelectionWith(txn.id) : undefined}
                  />
                ))}
              </CompactRowList>
            </section>
          ))}

          <Pagination page={current} pageCount={pageCount} onPage={setPage} className="pt-gt-4" />
        </div>
      </div>

      {/* batch action bar — re-categorize / delete the selection */}
      {selectMode ? (
        <div className="shrink-0 border-t-2 border-gt-line bg-gt-surface px-gt-16 py-gt-12">
          <div className="mx-auto grid grid-cols-2 gap-gt-8" style={{ maxWidth: contentMax }}>
            <Button variant="secondary" disabled={selected.size === 0} onClick={() => setCatPickerOpen(true)}>
              <PixelIcon name="action-tag" size={18} /> Categoría
            </Button>
            <Button variant="danger" disabled={selected.size === 0} onClick={() => setConfirmDelete(true)}>
              <PixelIcon name="action-delete" size={18} /> Eliminar ({selected.size})
            </Button>
          </div>
        </div>
      ) : null}

      {/* batch re-categorize */}
      <GroupedCategoryPicker open={catPickerOpen} onClose={() => setCatPickerOpen(false)} mode="establishment" selectedId="" onSelect={(id) => { setCatPickerOpen(false); batchReassign(id); }} />

      {/* batch delete confirm */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Eliminar transacciones?"
        footer={
          <div className="flex justify-end gap-gt-8">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={batchDelete}>Eliminar {selected.size}</Button>
          </div>
        }
      >
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">
          Se eliminarán {selected.size} transacci{selected.size === 1 ? "ón" : "ones"} de forma permanente. Las transacciones conciliadas o compartidas se conservan.
        </p>
      </Modal>
    </div>
  );
}
