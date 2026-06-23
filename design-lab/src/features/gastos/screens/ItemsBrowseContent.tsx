import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { FilterSheet, selectionCount, type FilterSelection } from "@design-system/organisms/FilterSheet";
import { LinkSourcePopup, AddItemSheet, type LinkSource } from "@design-system/organisms/LinkItemFlow";
import { SearchRow } from "@design-system/molecules/SearchRow";
import { HistoryItemRow } from "@design-system/molecules/HistoryItemRow";
import { sampleHistoryItems, clp, type HistoryItem } from "@lib/transactionFixtures";
import { PERIOD_FACET, SORT_FACET, type FilterFacet } from "@lib/browseFixtures";

/**
 * ItemsBrowseContent — the "what I've bought" items browse, CONTENT-ONLY (no
 * AppHeader / BottomNav / ScanFab). The search/filter band + HistoryItemRow list
 * (DM-17d, Gustify-link chip + expandable receipts) + the filter + link-flow
 * overlays, all self-managed; the overlays pin to this box. Used standalone by
 * ItemsBrowseScreen (which adds the chrome) and as the Productos subsection of
 * HistorialScreen.
 */
const ITEMS_FACETS: FilterFacet[] = [
  {
    id: "category",
    title: "Categoría",
    icon: "familia-food-fresh",
    kind: "icons",
    maxSelections: 3,
    options: [
      { id: "BreadPastry", label: "Pan y Panadería", icon: "item-bread-pastry", count: 6, category: "food-fresh" },
      { id: "DairyEggs", label: "Lácteos y Huevos", icon: "item-dairy-eggs", count: 4, category: "food-fresh" },
      { id: "MeatSeafood", label: "Carnes y Mariscos", icon: "item-meat-seafood", count: 3, category: "food-fresh" },
      { id: "Beverages", label: "Bebidas", icon: "item-beverages", count: 2, category: "beverages" },
    ],
  },
  PERIOD_FACET,
  SORT_FACET,
];

export function ItemsBrowseContent() {
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selection, setSelection] = useState<FilterSelection>({});
  // link flow: which item, and which source sheet (null = source-chooser popup).
  const [linkItem, setLinkItem] = useState<HistoryItem | null>(null);
  const [linkSource, setLinkSource] = useState<LinkSource | null>(null);

  const totalSpent = sampleHistoryItems.reduce((s, it) => s + it.totalSpent, 0);
  const activeCount = selectionCount(selection);

  function closeLink() {
    setLinkItem(null);
    setLinkSource(null);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      {/* content band: search + filter button + stats */}
      <div className="shrink-0 border-b-2 border-gt-line bg-gt-surface px-gt-16 pb-gt-12 pt-gt-12">
        <div className="flex items-center gap-gt-8">
          <span className="min-w-0 flex-1">
            <SearchRow
              icon="action-search"
              label="Buscar productos"
              placeholder="Buscar producto…"
              value={query}
              onValueChange={setQuery}
            />
          </span>
          <button
            type="button"
            aria-label="Filtros"
            onClick={() => setFiltersOpen(true)}
            className="relative grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs transition hover:-translate-y-0.5"
          >
            <PixelIcon name="action-filter-e" size={24} />
            {activeCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-gt-surface bg-gt-primary text-[10px] font-extrabold leading-none text-white">{activeCount}</span>
            ) : null}
          </button>
        </div>
        <p className="mt-gt-8 text-gt-sm font-bold text-gt-ink-2">
          {sampleHistoryItems.length} productos · <span className="font-extrabold text-gt-primary">{clp(totalSpent)}</span>
        </p>
      </div>

      {/* items list — single container, divided rows (Gustify pattern) */}
      <div className="min-h-0 flex-1 overflow-y-auto p-gt-16">
        <div className="overflow-hidden rounded-gt-xl border-2 border-gt-line bg-gt-surface">
          <div className="divide-y divide-gt-line">
            {sampleHistoryItems.map((item) => (
              <HistoryItemRow
                key={item.name}
                item={item}
                onLink={(it) => { setLinkItem(it); setLinkSource(null); }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* filter overlay (pins to this content box) */}
      {filtersOpen ? (
        <div className="absolute inset-0 z-50 flex items-end bg-black/30">
          <FilterSheet
            facets={ITEMS_FACETS}
            selection={selection}
            title="Buscar productos"
            matchCount={sampleHistoryItems.length}
            matchNoun="productos"
            onApply={(s) => { setSelection(s); setFiltersOpen(false); }}
            onClear={() => { setSelection({}); setFiltersOpen(false); }}
            onClose={() => setFiltersOpen(false)}
            className="h-[65%] w-full"
          />
        </div>
      ) : null}

      {/* link flow: source-chooser popup → add-sheet (Gustify / Gastify) */}
      {linkItem && linkSource == null ? (
        <LinkSourcePopup
          item={linkItem}
          onPick={(source) => setLinkSource(source)}
          onClose={closeLink}
        />
      ) : null}
      {linkItem && linkSource != null ? (
        <div className="absolute inset-0 z-50 flex items-end bg-black/30">
          <AddItemSheet
            item={linkItem}
            source={linkSource}
            onClose={closeLink}
            onConfirm={() => closeLink()}
            className="h-[70%] w-full"
          />
        </div>
      ) : null}
    </div>
  );
}
