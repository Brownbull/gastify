import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { MapPinIcon } from "@design-system/assets/icons";
import { Badge } from "@design-system/atoms/Badge";
import { SearchRow } from "@design-system/molecules/SearchRow";
import { SectionFade } from "@design-system/atoms/SectionFade";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { CompactRow, CompactRowList } from "@design-system/molecules/CompactRowList";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import { Pagination } from "@design-system/molecules/Pagination";
import type { Platform } from "@design-system/organisms/AppSurface";
import { selectionCount, type FilterSelection } from "@design-system/organisms/FilterSheet";
import { BROWSE_TRANSACTIONS, BROWSE_FACETS, BROWSE_TOTAL, BROWSE_TXN_COUNT, periodLabel, type DateGroup, type BrowseTransaction } from "@lib/browseFixtures";
import { clp } from "@lib/transactionFixtures";

/**
 * ComprasScreen (Phase 9) — the transactions browse, content-only for
 * AppScaffold (which supplies the header / 4-tab nav / scan FAB; runs in
 * `bleed` mode so this screen owns its sticky band + scroll + filter overlay):
 *
 *   sticky band → search + filter button + "N boletas · $total" + active chips
 *   list        → date-grouped, each group a bare CompactRowList using the
 *                 settled transaction-row layout (category chip + "N ítems ⌄"
 *                 expand, the same as Inicio's Recientes)
 *   filter      → FilterSheet bottom-sheet overlay
 *
 * Grounded on the shipped transactions route + legacy HistoryView.
 */
export interface ComprasScreenProps {
  groups?: DateGroup[];
  /** active filter selection (drives the chips + count). The host owns it. */
  selection?: FilterSelection;
  /** open the full-surface filter (rendered by the host via AppScaffold overlay). */
  onOpenFilter?: () => void;
  /** a transaction row was tapped — open its full detail (host-owned overlay). */
  onSelectTxn?: (txn: BrowseTransaction) => void;
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

function TxnRow({ txn, onSelect }: { txn: BrowseTransaction; onSelect?: (txn: BrowseTransaction) => void }) {
  return (
    <CompactRow
      className="px-gt-0!"
      onClick={onSelect ? () => onSelect(txn) : undefined}
      clickLabel={`Ver boleta de ${txn.merchant}`}
      leading={<ThumbnailBadge icon={txn.storeIcon} category={txn.category} />}
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

export function ComprasScreen({ groups = BROWSE_TRANSACTIONS, selection = {}, onOpenFilter, onSelectTxn, platform = "mobile" }: ComprasScreenProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const activeCount = selectionCount(selection);
  // desktop: cap the content + center it (the right pane never fills full width).
  const contentMax = platform === "desktop" ? "56rem" : undefined;

  // paginate at the TRANSACTION level (12/page), then re-group the current
  // page's transactions back under their date headers (a day can split pages;
  // the header total then reflects the transactions shown on this page).
  const flat = groups.flatMap((g) => g.transactions.map((t) => ({ t, groupDate: g.date })));
  const pageCount = Math.max(1, Math.ceil(flat.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageFlat = flat.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const pageGroups: { date: string; transactions: BrowseTransaction[] }[] = [];
  for (const { t, groupDate } of pageFlat) {
    const last = pageGroups[pageGroups.length - 1];
    if (last && last.date === groupDate) last.transactions.push(t);
    else pageGroups.push({ date: groupDate, transactions: [t] });
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* sticky search / filter band — full-width chrome, content centered on desktop
          (no divider line; it fades into the list below) */}
      <div className="shrink-0 bg-gt-surface px-gt-16 pb-gt-6 pt-gt-12">
        <div className="mx-auto w-full" style={{ maxWidth: contentMax }}>
        <div className="flex items-center gap-gt-8">
          <span className="min-w-0 flex-1">
            <SearchRow icon="action-search" label="Buscar boletas" placeholder="Buscar comercio o producto…" value={query} onValueChange={setQuery} />
          </span>
          <button
            type="button"
            aria-label="Filtros"
            onClick={onOpenFilter}
            className="relative grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs transition hover:-translate-y-0.5"
          >
            <PixelIcon name="action-filter-e" size={24} />
            {activeCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-gt-surface bg-gt-primary text-[10px] font-extrabold leading-none text-white">{activeCount}</span>
            ) : null}
          </button>
        </div>
        <p className="mt-gt-8 text-gt-sm font-bold text-gt-ink-2">
          {BROWSE_TXN_COUNT} boletas · <span className="font-extrabold text-gt-primary">{clp(BROWSE_TOTAL)}</span>
        </p>
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
        </div>
      </div>

      {/* white band melts into the page before the list (replaces the divider) */}
      <SectionFade heightClassName="h-3" />

      {/* date-grouped transaction list — bare CompactRowList per group */}
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
                  <TxnRow key={txn.id} txn={txn} onSelect={onSelectTxn} />
                ))}
              </CompactRowList>
            </section>
          ))}

          <Pagination page={current} pageCount={pageCount} onPage={setPage} className="pt-gt-4" />
        </div>
      </div>
    </div>
  );
}
